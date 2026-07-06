import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ModelsService } from './services/models.service';
import { ModelsSearchService } from './services/models-search.service';
import { ModelIntegrationService } from './services/model-integration.service';
import { ModelComparisonsService } from './services/model-comparisons.service';
import { ModelUploadService } from './services/model-upload.service';
import { ModelReviewService } from './services/model-review.service';
import { ModelTestCaseService } from './services/model-test-case.service';
import { ModelSettingsService } from './services/model-settings.service';
import { ModelAnalyticsService } from './services/model-analytics.service';
import { UploadCleanupProcessor } from '../../shared/queue/processors/upload-cleanup.processor';
import { SearchController } from './controllers/search.controller';
import { ModelsController } from './controllers/models.controller';
import { ModelComparisonsController } from './controllers/model-comparisons.controller';
import { SchemaController } from './controllers/schema.controller';
import { IntegrationController } from './controllers/integration.controller';
import { ModelsAdminController } from './controllers/models-admin.controller';
import { Model } from './entities/model.entity';
import { ModelVersion } from './entities/model-version.entity';
import { ModelVersionTestCase } from './entities/model-version-test-case.entity';
import { ModelVersionReviewEvent } from './entities/model-version-review-event.entity';
import { ModelReview } from './entities/model-review.entity';
import { ModelComparisonSession } from './entities/model-comparison-session.entity';
import { ModelComparisonResult } from './entities/model-comparison-result.entity';
import { ApiKey } from '../auth/entities/api-key.entity';
import { AuthModule } from '../auth/auth.module';
import { SystemConfig } from '../wallets/entities/system-config.entity';
import { WalletsModule } from '../wallets/wallets.module';
import { OrgApiKey } from '../organizations/entities/org-api-key.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { DeploymentsModule } from '../deployments/deployments.module';
import { UsersModule } from '../users/users.module';
import { ProviderAccountsModule } from '../provider-accounts/provider-accounts.module';
import { FirewallModule } from '../firewall/firewall.module';
import { ModelLog } from './entities/model-log.entity';
import { InferenceModule } from '../inference/inference.module';
import { MinioModule } from '../../shared/minio/minio.module';
import { ModelsRepository } from './repositories/models.repository';
import { ModelVersionsRepository } from './repositories/model-versions.repository';

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
    MinioModule,
    AuthModule,
    UsersModule,
    WalletsModule,
    ProviderAccountsModule,
    forwardRef(() => OrganizationsModule),
    FirewallModule,
    forwardRef(() => InferenceModule),
  ],
  providers: [
    ModelsService,
    ModelsSearchService,
    ModelIntegrationService,
    ModelComparisonsService,
    ModelUploadService,
    ModelReviewService,
    ModelTestCaseService,
    ModelSettingsService,
    ModelAnalyticsService,
    ModelsRepository,
    ModelVersionsRepository,
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
    ModelComparisonsService,
    ModelUploadService,
    ModelReviewService,
    ModelTestCaseService,
    ModelSettingsService,
    ModelAnalyticsService,
    ModelsRepository,
    ModelVersionsRepository,
    forwardRef(() => InferenceModule),
  ],
})
export class ModelsModule {}
