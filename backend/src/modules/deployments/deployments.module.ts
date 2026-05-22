import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DeploymentsService } from './services/deployments.service';
import { DeploymentsController } from './controllers/deployments.controller';
import { Deployment } from './entities/deployment.entity';
import { ModelVersion } from '../models/entities/model-version.entity';

/**
 * Module managing model deployment life cycle events, container control, and worker queues.
 */
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
