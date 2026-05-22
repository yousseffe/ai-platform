import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DeploymentsService } from './services/deployments.service';
import { DeploymentsController } from './controllers/deployments.controller';
import { Deployment } from './entities/deployment.entity';
import { ModelsModule } from '../models/models.module';
import { DeploymentsRepository } from './repositories/deployments.repository';

/**
 * Module managing model deployment life cycle events, container control, and worker queues.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Deployment]),
    BullModule.registerQueue({
      name: 'deploy-queue',
    }),
    forwardRef(() => ModelsModule),
  ],
  providers: [DeploymentsService, DeploymentsRepository],
  controllers: [DeploymentsController],
  exports: [DeploymentsService, DeploymentsRepository],
})
export class DeploymentsModule {}
