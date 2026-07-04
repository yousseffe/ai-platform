import { Global, Module } from '@nestjs/common';
import { TenantScopeService } from './tenant-scope.service';

/**
 * Global module exposing {@link TenantScopeService} for Postgres
 * row-level-security-scoped queries.
 */
@Global()
@Module({
  providers: [TenantScopeService],
  exports: [TenantScopeService],
})
export class TenantScopeModule {}
