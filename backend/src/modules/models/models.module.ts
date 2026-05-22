import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ModelsService } from './services/models.service';
import { ModelsController } from './controllers/models.controller';
import { Model } from './entities/model.entity';
import { ModelVersion } from './entities/model-version.entity';
import { DeploymentsModule } from '../deployments/deployments.module';
import { HttpModule } from '@nestjs/axios';

/**
 * Module responsible for model cataloging, version tracking, file uploading,
 * prediction routing, and artifact build pipeline integrations.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Model, ModelVersion]),
    BullModule.registerQueue({
      name: 'build-queue',
    }),
    DeploymentsModule,
    HttpModule,
  ],
  providers: [ModelsService],
  controllers: [ModelsController],
  exports: [ModelsService],
})
export class ModelsModule {}
