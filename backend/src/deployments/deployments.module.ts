import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DeploymentsService } from './deployments.service';
import { DeploymentsController } from './deployments.controller';
import { Deployment } from './deployment.entity';
import { ModelVersion } from '../models/model-version.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Deployment, ModelVersion]),
    BullModule.registerQueue({
      name: 'deploy-queue',
    }),
  ],
  providers: [DeploymentsService],
  controllers: [DeploymentsController],
  exports: [DeploymentsService],
})
export class DeploymentsModule {}
