import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class TenantScopeService {
  constructor(private readonly dataSource: DataSource) {}

  async runScoped<T>(
    orgId: string,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.query('SET LOCAL ROLE app_tenant_scoped_role');

      await queryRunner.query(
        `SELECT set_config('app.current_org', $1, true)`,
        [orgId],
      );
      const result = await fn(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (err: unknown) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

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
