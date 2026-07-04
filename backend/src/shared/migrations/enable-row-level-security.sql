-- Row-level security for tenant (organization) isolation.
--
-- WHY A DEDICATED ROLE: Postgres superusers (and any role with BYPASSRLS)
-- ALWAYS bypass row-level security, no exception -- and the app's default
-- connection user is `postgres`, the superuser, per RUNNING.md/CLAUDE.md.
-- If we only `ENABLE ROW LEVEL SECURITY` and left every query running as
-- `postgres`, the policies below would be silently inert for the entire
-- application. Instead, we create a restricted, NOLOGIN role
-- (app_tenant_scoped_role) that is NOT superuser and NOT the table owner,
-- and the application temporarily assumes it with `SET LOCAL ROLE` inside a
-- transaction (see shared/security/tenant-scope.service.ts) only for the
-- specific, tenant-scoped read paths that opt into it. This is the standard
-- Postgres pattern for "trusted app connects as an elevated role but wants a
-- genuinely-restricted sub-context for certain operations."
--
-- SCOPE: this is a proof-of-concept covering four tables (models,
-- deployments, wallets, model_logs), not a blanket retrofit of every query
-- in the app -- see docs/tenant-isolation.md for what is and isn't covered.
--
-- This file is NOT run automatically (there is no migration runner in this
-- project; `synchronize: true` only manages entity columns, never RLS).
-- Apply manually once per database:
--   psql -h <host> -U postgres -d aidb -f backend/src/shared/migrations/enable-row-level-security.sql
-- Safe to re-run (idempotent).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_tenant_scoped_role') THEN
    CREATE ROLE app_tenant_scoped_role NOLOGIN;
  END IF;
END
$$;

-- Grants membership so the app's normal connection role (DB_USER, `postgres`
-- by default per RUNNING.md) can `SET LOCAL ROLE app_tenant_scoped_role`.
-- If your deployment uses a different DB_USER, replace `postgres` below.
GRANT app_tenant_scoped_role TO postgres;
GRANT USAGE ON SCHEMA public TO app_tenant_scoped_role;
GRANT SELECT ON models, deployments, wallets, model_logs TO app_tenant_scoped_role;

-- models: scoped by the denormalized rls_org_id column.
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON models;
CREATE POLICY tenant_isolation ON models
  USING (
    current_setting('app.current_org', true) IS NULL
    OR current_setting('app.current_org', true) = ''
    OR rls_org_id IS NULL
    OR rls_org_id::text = current_setting('app.current_org', true)
  );

-- deployments: scoped by the denormalized rls_org_id column.
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON deployments;
CREATE POLICY tenant_isolation ON deployments
  USING (
    current_setting('app.current_org', true) IS NULL
    OR current_setting('app.current_org', true) = ''
    OR rls_org_id IS NULL
    OR rls_org_id::text = current_setting('app.current_org', true)
  );

-- wallets: scoped by owner_id when owner_type = 'ORG'; personal USER wallets
-- are never org-scoped and always pass through.
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON wallets;
CREATE POLICY tenant_isolation ON wallets
  USING (
    current_setting('app.current_org', true) IS NULL
    OR current_setting('app.current_org', true) = ''
    OR owner_type <> 'ORG'
    OR owner_id::text = current_setting('app.current_org', true)
  );

-- model_logs: scoped by the existing org_id column (populated for
-- organization API key calls; null for personal-key calls pass through).
ALTER TABLE model_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON model_logs;
CREATE POLICY tenant_isolation ON model_logs
  USING (
    current_setting('app.current_org', true) IS NULL
    OR current_setting('app.current_org', true) = ''
    OR org_id IS NULL
    OR org_id::text = current_setting('app.current_org', true)
  );
