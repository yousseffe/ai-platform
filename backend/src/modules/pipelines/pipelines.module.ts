import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Pipeline } from './entities/pipeline.entity';
import { PipelineStep } from './entities/pipeline-step.entity';
import { PipelineEdge } from './entities/pipeline-edge.entity';
import { PipelineRun } from './entities/pipeline-run.entity';
import { PipelineStepRun } from './entities/pipeline-step-run.entity';
import { PipelinesService } from './services/pipelines.service';
import { PipelineStepsService } from './services/pipeline-steps.service';
import { PipelineEdgesService } from './services/pipeline-edges.service';
import { PipelineRunsService } from './services/pipeline-runs.service';
import { MapperEngineService } from './services/mapper-engine.service';
import { PipelineStepExecutorService } from './services/pipeline-step-executor.service';
import { PipelineRunPersistenceService } from './services/pipeline-run-persistence.service';
import { PipelineStepLoopService } from './services/pipeline-step-loop.service';
import { PipelineRunnerService } from './services/pipeline-runner.service';
import { PipelineProcessor } from './processors/pipeline.processor';
import { PipelinesController } from './controllers/pipelines.controller';
import { PipelineStepsController } from './controllers/pipeline-steps.controller';
import { PipelineRunsController } from './controllers/pipeline-runs.controller';
import { ModelsModule } from '../models/models.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Module implementing the pipeline (model-chaining) feature: chains
 * deployed models together, mapping each step's output into the next step's
 * input, and proxying every call through the shared `InferenceClient` so
 * pipeline steps are billed/logged identically to direct predictions.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pipeline,
      PipelineStep,
      PipelineEdge,
      PipelineRun,
      PipelineStepRun,
    ]),
    BullModule.registerQueue({ name: 'pipeline-queue' }),
    ModelsModule,
    AuthModule,
  ],
  providers: [
    PipelinesService,
    PipelineStepsService,
    PipelineEdgesService,
    PipelineRunsService,
    MapperEngineService,
    PipelineStepExecutorService,
    PipelineRunPersistenceService,
    PipelineStepLoopService,
    PipelineRunnerService,
    PipelineProcessor,
  ],
  controllers: [
    PipelinesController,
    PipelineStepsController,
    PipelineRunsController,
  ],
})
export class PipelinesModule {}
