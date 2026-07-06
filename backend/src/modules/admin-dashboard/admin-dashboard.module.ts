import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
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
import { SystemConfig } from '../wallets/entities/system-config.entity';
import { Alert } from '../analytics/entities/alert.entity';
import { Deployment } from '../deployments/entities/deployment.entity';
import { ProviderAccountsModule } from '../provider-accounts/provider-accounts.module';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminProvidersController } from './controllers/admin-providers.controller';
import { AdminInsightsController } from './controllers/admin-insights.controller';
import { AdminAuditLogService } from './services/admin-audit-log.service';
import { AdminKpiService } from './services/admin-kpi.service';
import { AdminProviderManagementService } from './services/admin-provider-management.service';
import { AdminProviderMetricsService } from './services/admin-provider-metrics.service';
import { AdminProviderQueryService } from './services/admin-provider-query.service';
import { AdminInsightsService } from './services/admin-insights.service';

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
      SystemConfig,
      Alert,
      Deployment,
    ]),
    ProviderAccountsModule,
    BullModule.registerQueue(
      { name: 'build-queue' },
      { name: 'deploy-queue' },
    ),
  ],
  controllers: [
    AdminDashboardController,
    AdminProvidersController,
    AdminInsightsController,
  ],
  providers: [
    AdminAuditLogService,
    AdminKpiService,
    AdminProviderMetricsService,
    AdminProviderQueryService,
    AdminProviderManagementService,
    AdminInsightsService,
  ],
})
export class AdminDashboardModule {}


