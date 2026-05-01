import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DeploymentsService } from './deployments.service';
import { DeploymentsController } from './deployments.controller';
import { Deployment } from './deployment.entity';
import { ModelVersion } from '../models/model-version.entity';
import { DeploymentsRepository } from './deployments.repository';
import { ModelsModule } from '../models/models.module';

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
