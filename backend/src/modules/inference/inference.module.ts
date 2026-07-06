import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Model } from '../models/entities/model.entity';
import { ModelVersion } from '../models/entities/model-version.entity';
import { ModelsModule } from '../models/models.module';
import { DeploymentsModule } from '../deployments/deployments.module';
import { ApiKey } from '../auth/entities/api-key.entity';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { SystemConfig } from '../wallets/entities/system-config.entity';
import { WalletsModule } from '../wallets/wallets.module';
import { OrgApiKey } from '../organizations/entities/org-api-key.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProviderAccountsModule } from '../provider-accounts/provider-accounts.module';
import { FirewallModule } from '../firewall/firewall.module';

import { InferenceController } from './controllers/inference.controller';

import { InferenceClient } from './services/inference-client.service';
import { InferenceBillingService } from './services/inference-billing.service';
import { InferenceLogService } from './services/inference-log.service';
import { InferenceCacheService } from './services/inference-cache.service';
import { InferencePricingService } from './services/inference-pricing.service';
import { InferenceDeploymentResolverService } from './services/inference-deployment-resolver.service';
import { InferenceCallPreparerService } from './services/inference-call-preparer.service';
import { ProviderInsightsService } from './services/provider-insights.service';

import { ModelLog } from './entities/model-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Model,
      ModelVersion,
      ModelLog,
      ApiKey,
      SystemConfig,
      OrgApiKey,
      User,
    ]),
    HttpModule,
    forwardRef(() => ModelsModule),
    forwardRef(() => DeploymentsModule),
    AuthModule,
    UsersModule,
    WalletsModule,
    forwardRef(() => OrganizationsModule),
    ProviderAccountsModule,
    FirewallModule,
  ],
  providers: [
    InferenceClient,
    InferenceBillingService,
    InferenceLogService,
    InferenceCacheService,
    InferencePricingService,
    InferenceDeploymentResolverService,
    InferenceCallPreparerService,
    ProviderInsightsService,
  ],
  controllers: [InferenceController],
  exports: [InferenceClient, InferenceCacheService, ProviderInsightsService],
})
export class InferenceModule {}
