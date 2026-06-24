import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ModelsService } from './services/models.service';
import { ModelsSearchService } from './services/models-search.service';
import { ModelsController } from './controllers/models.controller';
import { SearchController } from './controllers/search.controller';
import { Model } from './entities/model.entity';
import { ModelVersion } from './entities/model-version.entity';
import { ModelLog } from './entities/model-log.entity';
import { DeploymentsModule } from '../deployments/deployments.module';
import { HttpModule } from '@nestjs/axios';
import { MinioModule } from '../../shared/minio/minio.module';
import { ModelsRepository } from './repositories/models.repository';
import { ModelVersionsRepository } from './repositories/model-versions.repository';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { WalletsModule } from '../wallets/wallets.module';

/**
 * Module responsible for model cataloging, version tracking, file uploading,
 * prediction routing, artifact build pipeline integrations, and OpenSearch indexing.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Model, ModelVersion, ModelLog]),
    BullModule.registerQueue({
      name: 'build-queue',
    }),
    forwardRef(() => DeploymentsModule),
    HttpModule,
    MinioModule,
    AuthModule,
    UsersModule,
    WalletsModule,
  ],
  providers: [
    ModelsService,
    ModelsSearchService,
    ModelsRepository,
    ModelVersionsRepository,
  ],
  controllers: [SearchController, ModelsController],
  exports: [
    ModelsService,
    ModelsSearchService,
    ModelsRepository,
    ModelVersionsRepository,
  ],
})
export class ModelsModule {}
