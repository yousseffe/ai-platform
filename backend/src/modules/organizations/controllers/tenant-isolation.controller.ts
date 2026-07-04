import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrgRoleGuard, RequireOrgRole } from '../../auth/guards/org-role.guard';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { TenantScopeService } from '../../../shared/security/tenant-scope.service';

const RLS_TABLES = ['models', 'deployments', 'wallets', 'model_logs'] as const;

/**
 * Read-only proof endpoint demonstrating Postgres row-level security in
 * effect: for each RLS-protected table, returns both the row count visible
 * to the app's normal (superuser) connection and the count visible when the
 * same connection assumes the restricted, tenant-scoped role for this
 * organization. See shared/migrations/enable-row-level-security.sql and
 * shared/security/tenant-scope.service.ts for how the enforcement works.
 */
@Controller('organizations/:orgId/tenant-isolation')
export class TenantIsolationController {
  constructor(private readonly tenantScopeService: TenantScopeService) {}

  /**
   * Compares unscoped vs. tenant-scoped row counts across the RLS-protected
   * tables for one organization.
   *
   * @param orgId - UUID of the organization to scope the proof to.
   */
  @UseGuards(JwtAuthGuard, OrgRoleGuard)
  @RequireOrgRole(OrgRole.OWNER, OrgRole.MAINTAINER)
  @Get('proof')
  async getProof(@Param('orgId') orgId: string) {
    const results = await Promise.all(
      RLS_TABLES.map(async (tableName) => ({
        tableName,
        ...(await this.tenantScopeService.compareRowCounts(tableName, orgId)),
      })),
    );
    return { orgId, tables: results };
  }
}
