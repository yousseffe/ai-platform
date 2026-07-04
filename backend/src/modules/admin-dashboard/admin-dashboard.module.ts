import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../users/entities/audit-log.entity';
import { ModelLog } from '../models/entities/model-log.entity';
import { Model } from '../models/entities/model.entity';
import { ModelVersion } from '../models/entities/model-version.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { ProviderAccount } from '../provider-accounts/entities/provider-account.entity';
import { ProviderOfferRedemption } from '../provider-accounts/entities/provider-offer-redemption.entity';
import { Transaction } from '../wallets/entities/transaction.entity';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { ProviderAccountsModule } from '../provider-accounts/provider-accounts.module';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminProvidersController } from './controllers/admin-providers.controller';
import { AdminAuditLogService } from './services/admin-audit-log.service';
import { AdminKpiService } from './services/admin-kpi.service';
import { AdminProviderManagementService } from './services/admin-provider-management.service';
import { AdminProviderMetricsService } from './services/admin-provider-metrics.service';
import { AdminProviderQueryService } from './services/admin-provider-query.service';

/**
 * Professional admin dashboard module powering overview and provider operations.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      User,
      Organization,
      ProviderAccount,
      ProviderOfferRedemption,
      Model,
      ModelVersion,
      ModelLog,
      Transaction,
      Wallet,
    ]),
    ProviderAccountsModule,
  ],
  controllers: [AdminDashboardController, AdminProvidersController],
  providers: [
    AdminAuditLogService,
    AdminKpiService,
    AdminProviderMetricsService,
    AdminProviderQueryService,
    AdminProviderManagementService,
  ],
})
export class AdminDashboardModule {}
