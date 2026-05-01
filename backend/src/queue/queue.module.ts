import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildProcessor } from './build.processor';
import { DeployProcessor } from './deploy.processor';
import { ModelVersion } from '../models/model-version.entity';
import { Deployment } from '../deployments/deployment.entity';

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
  providers: [BuildProcessor, DeployProcessor],
})
export class QueueModule {}
