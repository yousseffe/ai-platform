import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ModelsService } from './services/models.service';
import { ModelsSearchService } from './services/models-search.service';
import { ModelIntegrationService } from './services/model-integration.service';
import { InferencePricingService } from './services/inference-pricing.service';
import { InferenceBillingService } from './services/inference-billing.service';
import { InferenceLogService } from './services/inference-log.service';
import { InferenceDeploymentResolverService } from './services/inference-deployment-resolver.service';
import { InferenceCallPreparerService } from './services/inference-call-preparer.service';
import { InferenceCacheService } from './services/inference-cache.service';
import { InferenceClient } from './services/inference-client.service';
import { ModelComparisonsService } from './services/model-comparisons.service';
import { ProviderInsightsService } from './services/provider-insights.service';
import { ModelsController } from './controllers/models.controller';
import { ModelComparisonsController } from './controllers/model-comparisons.controller';
import { UploadCleanupProcessor } from '../../shared/queue/processors/upload-cleanup.processor';
import { SearchController } from './controllers/search.controller';
import { SchemaController } from './controllers/schema.controller';
import { IntegrationController } from './controllers/integration.controller';
import { ModelsAdminController } from './controllers/models-admin.controller';
import { Model } from './entities/model.entity';
import { ModelVersion } from './entities/model-version.entity';
import { ModelVersionTestCase } from './entities/model-version-test-case.entity';
import { ModelVersionReviewEvent } from './entities/model-version-review-event.entity';
import { ModelLog } from './entities/model-log.entity';
import { ModelReview } from './entities/model-review.entity';
import { ModelComparisonSession } from './entities/model-comparison-session.entity';
import { ModelComparisonResult } from './entities/model-comparison-result.entity';
import { ApiKey } from '../auth/entities/api-key.entity';
import { SystemConfig } from '../wallets/entities/system-config.entity';
import { OrgApiKey } from '../organizations/entities/org-api-key.entity';
import { DeploymentsModule } from '../deployments/deployments.module';
import { HttpModule } from '@nestjs/axios';
import { MinioModule } from '../../shared/minio/minio.module';
import { ModelsRepository } from './repositories/models.repository';
import { ModelVersionsRepository } from './repositories/model-versions.repository';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { WalletsModule } from '../wallets/wallets.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ProviderAccountsModule } from '../provider-accounts/provider-accounts.module';
import { FirewallModule } from '../firewall/firewall.module';

/**
 * Module responsible for model cataloging, version tracking, file uploading,
 * prediction routing, artifact build pipeline integrations, and OpenSearch indexing.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Model,
      ModelVersion,
      ModelVersionTestCase,
      ModelVersionReviewEvent,
      ModelLog,
      ModelReview,
      ModelComparisonSession,
      ModelComparisonResult,
      ApiKey,
      SystemConfig,
      OrgApiKey,
    ]),
    BullModule.registerQueue({
      name: 'build-queue',
    }),
    BullModule.registerQueue({
      name: 'upload-cleanup-queue',
    }),
    forwardRef(() => DeploymentsModule),
    HttpModule,
    MinioModule,
    AuthModule,
    UsersModule,
    WalletsModule,
    ProviderAccountsModule,
    forwardRef(() => OrganizationsModule),
    FirewallModule,
  ],
  providers: [
    ModelsService,
    ModelsSearchService,
    ModelIntegrationService,
    ModelsRepository,
    ModelVersionsRepository,
    InferencePricingService,
    InferenceBillingService,
    InferenceLogService,
    InferenceDeploymentResolverService,
    InferenceCallPreparerService,
    InferenceCacheService,
    InferenceClient,
    ModelComparisonsService,
    ProviderInsightsService,
    UploadCleanupProcessor,
  ],
  controllers: [
    SearchController,
    ModelsController,
    ModelComparisonsController,
    SchemaController,
    IntegrationController,
    ModelsAdminController,
  ],
  exports: [
    ModelsService,
    ModelsSearchService,
    ModelsRepository,
    ModelVersionsRepository,
    InferenceClient,
    ModelComparisonsService,
  ],
})
export class ModelsModule {}
