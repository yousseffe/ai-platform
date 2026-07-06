import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RequireOrgRole } from '../../../shared/guards/org-role.guard';
import { OrgRoleGuard } from '../../../shared/guards/org-role.guard';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { TenantScopeService } from '../../../shared/security/tenant-scope.service';

const RLS_TABLES = ['models', 'deployments', 'wallets', 'model_logs'] as const;

@Controller('organizations/:orgId/tenant-isolation')
export class TenantIsolationController {
  constructor(private readonly tenantScopeService: TenantScopeService) {}

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
