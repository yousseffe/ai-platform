# Database-Level Tenant Isolation (Postgres RLS)

Application-level multi-tenancy already exists throughout the platform:
organizations, projects, org-scoped API keys, and per-owner wallets are all
filtered by `WHERE` clauses in service code (`ModelsService.getModels`,
`WalletsService`, etc.). This is normal and works — but it means tenant
isolation lives entirely in application logic. A bug in one `WHERE` clause
(a missed filter, a copy-pasted query, a future refactor) can leak another
organization's data with no second line of defense.

This feature adds that second line of defense: Postgres **row-level
security (RLS)**, enforced by the database itself, on four tables — `models`,
`deployments`, `wallets`, `model_logs` — as a scoped proof-of-concept, not a
blanket retrofit of every query in the app.

## Why this needed a dedicated Postgres role

The backend's normal database connection (`DB_USER=postgres`, per
`RUNNING.md`) is a Postgres **superuser**. Superusers always bypass row-level
security — no exception, and `FORCE ROW LEVEL SECURITY` doesn't change that.
Simply running `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` would have been a
no-op for every query the app makes.

The fix: `shared/migrations/enable-row-level-security.sql` creates a
restricted, `NOLOGIN` role (`app_tenant_scoped_role`) that is *not* superuser
and *not* the table owner. The app's superuser connection is granted
membership in it, and
[`TenantScopeService`](../backend/src/shared/security/tenant-scope.service.ts)
temporarily assumes that role with `SET LOCAL ROLE` inside a transaction —
only for the specific code paths that opt in. RLS policies genuinely apply
for the duration of that transaction, then the connection reverts to
superuser on commit/rollback. This is the standard Postgres pattern for
"trusted app connects as an elevated role but needs a genuinely restricted
sub-context for certain operations."

## What's actually protected right now

- **Tables:** `models`, `deployments` (via a denormalized `rls_org_id`
  column kept in sync at creation time), `wallets` (via existing
  `owner_type`/`owner_id`), `model_logs` (via the existing `org_id` column).
- **One real, retrofitted read path:** `ModelsService.getModels()`'s
  organization-scoped listing runs through `TenantScopeService.runScoped()`
  in addition to its existing `WHERE organization: { id: orgId }` filter —
  demonstrating the defense-in-depth pattern on a real production endpoint
  (`GET /models?orgId=...`).
- **Everything else** (wallet balance reads, model_logs queries, admin-mcp
  endpoints, etc.) still goes through the app's normal superuser connection
  and is *not* subject to RLS. Enabling RLS on a table doesn't retroactively
  protect queries that don't run under the scoped role — this is an
  explicitly scoped proof, not a claim that the whole app is now
  DB-enforced multi-tenant.

## Applying it

There's no migration runner in this project (`synchronize: true` only
manages entity columns — see `CLAUDE.md`). Apply the SQL once per database:

```bash
psql -h localhost -U postgres -d aidb -f backend/src/shared/migrations/enable-row-level-security.sql
```

Safe to re-run (idempotent — uses `DROP POLICY IF EXISTS` / existence checks).

## Seeing it work

`GET /api/v1/organizations/:orgId/tenant-isolation/proof` (OWNER/MAINTAINER
only) returns, for each of the four tables, the row count visible to the
app's normal connection versus the row count visible when scoped to that
organization:

```json
{
  "orgId": "…",
  "tables": [
    { "tableName": "models", "unscopedCount": 214, "scopedCount": 6 },
    { "tableName": "deployments", "unscopedCount": 58, "scopedCount": 2 },
    { "tableName": "wallets", "unscopedCount": 340, "scopedCount": 1 },
    { "tableName": "model_logs", "unscopedCount": 91422, "scopedCount": 803 }
  ]
}
```

`scopedCount` will always be `<= unscopedCount`, and reflects only rows
belonging to that organization (plus any personal, non-org rows, which
intentionally pass through — RLS here isolates *organizations from each
other*, not personal workspaces from their own owner).

## Extending coverage

To bring another table under RLS: add a policy for it in
`enable-row-level-security.sql` following the same pattern (a tenant column
+ the `current_setting('app.current_org', true)` check), grant `SELECT` (and
`INSERT`/`UPDATE`/`DELETE` if needed) to `app_tenant_scoped_role`, and wrap
the relevant service method's query in `TenantScopeService.runScoped()`.
