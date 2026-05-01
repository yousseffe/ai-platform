import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ModelsService } from './models.service';
import { ModelsController } from './models.controller';
import { Model } from './model.entity';
import { ModelVersion } from './model-version.entity';
import { DeploymentsModule } from '../deployments/deployments.module';
import { HttpModule } from '@nestjs/axios';

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
