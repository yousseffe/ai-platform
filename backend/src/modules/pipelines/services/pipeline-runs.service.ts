import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { PipelineRun } from '../entities/pipeline-run.entity';
import { PipelineRunStatus } from '../enums/pipeline-run-status.enum';
import { PipelineStatus } from '../enums/pipeline-status.enum';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { PipelinesService } from './pipelines.service';
import { RunPipelineJobPayload } from '../interfaces/queue-payload.interface';

/** Triggers and reports on {@link PipelineRun} execution. */
@Injectable()
export class PipelineRunsService {
  constructor(
    @InjectRepository(PipelineRun)
    private readonly runRepository: Repository<PipelineRun>,
    @InjectQueue('pipeline-queue')
    private readonly pipelineQueue: Queue<RunPipelineJobPayload>,
    private readonly pipelinesService: PipelinesService,
  ) {}

  /**
   * Creates a pending run for a `VALIDATED` pipeline and enqueues it for
   * background execution.
   *
   * @throws {BadRequestException} If the pipeline isn't `VALIDATED`.
   */
  async triggerRun(
    pipelineId: string,
    actorId: string,
    workspaceId: string,
    workspaceType: OwnerType,
    input: Record<string, unknown>,
  ): Promise<PipelineRun> {
    const pipeline = await this.pipelinesService.getPipeline(
      pipelineId,
      actorId,
    );
    if (pipeline.status !== PipelineStatus.VALIDATED) {
      throw new BadRequestException(
        'Pipeline must be validated before it can be run',
      );
    }

    const run = await this.runRepository.save(
      this.runRepository.create({
        pipeline,
        pipelineVersion: pipeline.version,
        triggeredBy: { id: actorId } as PipelineRun['triggeredBy'],
        workspaceId,
        workspaceType,
        input,
        status: PipelineRunStatus.PENDING,
      }),
    );

    await this.pipelineQueue.add('run-pipeline', { runId: run.id });
    return run;
  }

  /**
   * Fetches a run's current status/output, enforcing ownership via its
   * parent pipeline.
   */
  async getRun(runId: string, actorId: string): Promise<PipelineRun> {
    const run = await this.runRepository.findOne({
      where: { id: runId },
      relations: ['pipeline', 'pipeline.user', 'stepRuns', 'stepRuns.step'],
    });
    if (!run) {
      throw new NotFoundException('Pipeline run not found');
    }
    if (run.pipeline.user.id !== actorId) {
      throw new ForbiddenException('You do not have access to this run');
    }
    return run;
  }

  /** Lists recent runs for a pipeline, newest first. */
  async listRuns(pipelineId: string, actorId: string): Promise<PipelineRun[]> {
    await this.pipelinesService.getPipeline(pipelineId, actorId);
    return this.runRepository.find({
      where: { pipeline: { id: pipelineId } },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
