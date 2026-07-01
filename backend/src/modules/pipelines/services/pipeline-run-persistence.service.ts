import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineRun } from '../entities/pipeline-run.entity';
import { PipelineStepRun } from '../entities/pipeline-step-run.entity';
import { PipelineStep } from '../entities/pipeline-step.entity';
import { PipelineRunStatus } from '../enums/pipeline-run-status.enum';
import { PipelineStepRunStatus } from '../enums/pipeline-step-run-status.enum';

/** Persists {@link PipelineRun} and {@link PipelineStepRun} state transitions. */
@Injectable()
export class PipelineRunPersistenceService {
  constructor(
    @InjectRepository(PipelineRun)
    private readonly runRepository: Repository<PipelineRun>,
    @InjectRepository(PipelineStepRun)
    private readonly stepRunRepository: Repository<PipelineStepRun>,
  ) {}

  /** Records the outcome of one step's execution within a run. */
  async recordStepRun(
    run: PipelineRun,
    step: PipelineStep,
    mappedInput: Record<string, unknown> | null,
    output: Record<string, unknown> | null,
    status: PipelineStepRunStatus,
    cost: number,
    responseTimeMs: number | null,
    errorMessage: string | null,
  ): Promise<void> {
    await this.stepRunRepository.save(
      this.stepRunRepository.create({
        run,
        step,
        order: step.order,
        mappedInput,
        output,
        status,
        cost,
        responseTimeMs,
        errorMessage,
      }),
    );
  }

  /** Marks a run as started, transitioning it to RUNNING. */
  async markRunning(run: PipelineRun): Promise<void> {
    run.status = PipelineRunStatus.RUNNING;
    await this.runRepository.save(run);
  }

  /** Finalizes a run with its terminal status, output, and totals. */
  async finishRun(
    run: PipelineRun,
    status: PipelineRunStatus,
    output: Record<string, unknown> | null,
    errorMessage: string | null,
    totalCost: number,
    totalLatencyMs: number,
  ): Promise<void> {
    run.status = status;
    run.output = output;
    run.errorMessage = errorMessage;
    run.totalCost = totalCost;
    run.totalLatencyMs = totalLatencyMs;
    await this.runRepository.save(run);
  }
}
