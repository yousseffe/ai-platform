import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildProcessor } from './processors/build.processor';
import { DeployProcessor } from './processors/deploy.processor';
import { ModelVersion } from '../../modules/models/entities/model-version.entity';
import { Deployment } from '../../modules/deployments/entities/deployment.entity';
import { BaseImageWarmerService } from '../docker/base-image-warmer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ModelVersion, Deployment]),
    BullModule.registerQueue({
      name: 'build-queue',
    }),
    BullModule.registerQueue({
      name: 'deploy-queue',
    }),
  ],
  providers: [BuildProcessor, DeployProcessor, BaseImageWarmerService],
})
export class QueueModule {}
