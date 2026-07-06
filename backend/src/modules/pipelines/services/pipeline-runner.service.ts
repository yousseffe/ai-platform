import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineRun } from '../entities/pipeline-run.entity';
import { PipelineEdge } from '../entities/pipeline-edge.entity';
import { PipelineRunStatus } from '../enums/pipeline-run-status.enum';
import { PipelineStepLoopService } from './pipeline-step-loop.service';
import { PipelineRunPersistenceService } from './pipeline-run-persistence.service';
import { buildPipelineRunActor } from './pipeline-run-actor.util';
import { ClientRequestMeta } from '../../inference';

@Injectable()
export class PipelineRunnerService {
  private readonly logger = new Logger(PipelineRunnerService.name);

  constructor(
    @InjectRepository(PipelineRun)
    private readonly runRepository: Repository<PipelineRun>,
    @InjectRepository(PipelineEdge)
    private readonly edgeRepository: Repository<PipelineEdge>,
    private readonly stepLoop: PipelineStepLoopService,
    private readonly persistence: PipelineRunPersistenceService,
  ) {}

  async runPipeline(runId: string): Promise<void> {
    const run = await this.runRepository.findOne({
      where: { id: runId },
      relations: [
        'pipeline',
        'pipeline.steps',
        'pipeline.steps.modelVersion',
        'pipeline.steps.modelVersion.model',
        'triggeredBy',
      ],
    });
    if (!run) {
      this.logger.error(`PipelineRun ${runId} not found`);
      return;
    }

    const steps = [...(run.pipeline.steps ?? [])].sort(
      (a, b) => a.order - b.order,
    );
    const edges = await this.edgeRepository.find({
      where: { pipeline: { id: run.pipeline.id } },
      relations: ['fromStep', 'toStep'],
    });

    await this.persistence.markRunning(run);

    const actor = buildPipelineRunActor(run);
    const clientMeta: ClientRequestMeta = {
      ipAddress: null,
      userAgent: 'pipeline-engine',
      xForwardedFor: null,
    };
    const startTime = Date.now();

    if (steps.length === 0) {
      await this.persistence.finishRun(
        run,
        PipelineRunStatus.FAILED,
        null,
        'Pipeline has no steps',
        0,
        0,
      );
      return;
    }

    const outcome = await this.stepLoop.run(
      steps,
      edges,
      run,
      actor,
      clientMeta,
    );
    const totalLatencyMs = Date.now() - startTime;

    if (!outcome.success) {
      await this.persistence.finishRun(
        run,
        outcome.anySucceeded
          ? PipelineRunStatus.PARTIAL
          : PipelineRunStatus.FAILED,
        null,
        outcome.errorMessage,
        outcome.totalCost,
        totalLatencyMs,
      );
      return;
    }

    const finalOutput = this.stepLoop.resolveMappedInput(
      null,
      outcome.lastStageOrder + 1,
      steps,
      edges,
      outcome.stepOutputs,
      run.input,
    );

    await this.persistence.finishRun(
      run,
      PipelineRunStatus.SUCCESS,
      finalOutput,
      null,
      outcome.totalCost,
      totalLatencyMs,
    );
  }
}
