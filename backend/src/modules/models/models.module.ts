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
import { InferenceClient } from './services/inference-client.service';
import { ModelsController } from './controllers/models.controller';
import { SearchController } from './controllers/search.controller';
import { SchemaController } from './controllers/schema.controller';
import { IntegrationController } from './controllers/integration.controller';
import { Model } from './entities/model.entity';
import { ModelVersion } from './entities/model-version.entity';
import { ModelVersionTestCase } from './entities/model-version-test-case.entity';
import { ModelVersionReviewEvent } from './entities/model-version-review-event.entity';
import { ModelLog } from './entities/model-log.entity';
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
      SystemConfig,
      OrgApiKey,
    ]),
    BullModule.registerQueue({
      name: 'build-queue',
    }),
    forwardRef(() => DeploymentsModule),
    HttpModule,
    MinioModule,
    AuthModule,
    UsersModule,
    WalletsModule,
    forwardRef(() => OrganizationsModule),
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
    InferenceClient,
  ],
  controllers: [
    SearchController,
    ModelsController,
    SchemaController,
    IntegrationController,
  ],
  exports: [
    ModelsService,
    ModelsSearchService,
    ModelsRepository,
    ModelVersionsRepository,
    InferenceClient,
  ],
})
export class ModelsModule {}
