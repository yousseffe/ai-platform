import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

/**
 * Runs a callback inside a transaction that has assumed the restricted,
 * NOLOGIN `app_tenant_scoped_role` Postgres role and set the
 * `app.current_org` session variable, so the row-level security policies in
 * `shared/migrations/enable-row-level-security.sql` genuinely apply for the
 * duration of the callback.
 *
 * This matters because the app's normal connection role (`postgres`, per
 * RUNNING.md) is a Postgres superuser, and superusers always bypass RLS —
 * running as the restricted role for this transaction is what makes the
 * policies actually enforce anything. It's a defense-in-depth layer beneath
 * the application's own WHERE-clause scoping (e.g. `organization: { id:
 * orgId }`), not a replacement for it: if that application-level filter has
 * a bug, RLS still blocks the cross-tenant rows at the database level.
 */
@Injectable()
export class TenantScopeService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * @param orgId - The organization to scope the transaction to.
   * @param fn - Callback receiving a transaction-scoped EntityManager.
   * @returns The callback's return value.
   */
  async runScoped<T>(
    orgId: string,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query('SET LOCAL ROLE app_tenant_scoped_role');
      // `SET`/`SET LOCAL` don't accept query parameters; set_config() does
      // and is the parameterized, injection-safe equivalent (third arg
      // `true` = transaction-local, matching `SET LOCAL` semantics).
      await queryRunner.query(
        `SELECT set_config('app.current_org', $1, true)`,
        [orgId],
      );
      const result = await fn(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Runs a raw COUNT(*) query against a table both with and without the
   * tenant scope applied, so callers can directly observe row-level
   * security reducing the visible row count. Used by the tenant isolation
   * proof endpoint — never call with a caller-supplied `tableName`, since it
   * is interpolated into the query rather than bound as a parameter.
   *
   * @param tableName - Must be one of the four RLS-enabled tables.
   * @param orgId - The organization to scope to.
   */
  async compareRowCounts(
    tableName: 'models' | 'deployments' | 'wallets' | 'model_logs',
    orgId: string,
  ): Promise<{ unscopedCount: number; scopedCount: number }> {
    const unscopedRows: Array<{ count: string }> = await this.dataSource.query(
      `SELECT COUNT(*)::text AS count FROM ${tableName}`,
    );
    const unscopedCount = parseInt(unscopedRows[0]?.count ?? '0', 10);

    const scopedCount = await this.runScoped(orgId, async (manager) => {
      const rows: Array<{ count: string }> = await manager.query(
        `SELECT COUNT(*)::text AS count FROM ${tableName}`,
      );
      return parseInt(rows[0]?.count ?? '0', 10);
    });

    return { unscopedCount, scopedCount };
  }
}
