import { Injectable } from '@nestjs/common';
import { PipelineRun } from '../entities/pipeline-run.entity';
import { PipelineEdge } from '../entities/pipeline-edge.entity';
import { PipelineStep } from '../entities/pipeline-step.entity';
import { PipelineStepRunStatus } from '../enums/pipeline-step-run-status.enum';
import { MapperEngineService } from './mapper-engine.service';
import { PipelineStepExecutorService } from './pipeline-step-executor.service';
import { PipelineRunPersistenceService } from './pipeline-run-persistence.service';
import { MapperContext } from '../interfaces/mapper-spec.interface';
import {
  ClientRequestMeta,
  PredictionActor,
} from '../../models/interfaces/inference.interface';

/** Result of walking a pipeline run's full step chain. */
export interface RunStepsOutcome {
  success: boolean;
  anySucceeded: boolean;
  payload: Record<string, unknown>;
  stepOutputs: Record<string, Record<string, unknown>>;
  totalCost: number;
  errorMessage: string | null;
}

/**
 * Walks a pipeline run's steps in order, applying each inbound edge's mapper
 * and executing the step via {@link PipelineStepExecutorService}, recording
 * each outcome and stopping at the first unrecoverable failure.
 */
@Injectable()
export class PipelineStepLoopService {
  constructor(
    private readonly mapperEngine: MapperEngineService,
    private readonly stepExecutor: PipelineStepExecutorService,
    private readonly persistence: PipelineRunPersistenceService,
  ) {}

  /**
   * @param steps - The pipeline's steps, already sorted by `order`.
   * @param edges - All edges defined for the pipeline.
   * @param run - The run these steps belong to, for persistence.
   * @param actor - The caller identity for billing/logging.
   * @param clientMeta - Synthetic client metadata for the internal calls.
   */
  async run(
    steps: PipelineStep[],
    edges: PipelineEdge[],
    run: PipelineRun,
    actor: PredictionActor,
    clientMeta: ClientRequestMeta,
  ): Promise<RunStepsOutcome> {
    let payload: Record<string, unknown> = run.input;
    let totalCost = 0;
    let anySucceeded = false;
    const stepOutputs: Record<string, Record<string, unknown>> = {};

    for (const step of steps) {
      const inboundEdge = edges.find((e) => e.toStep?.id === step.id) ?? null;
      const context: MapperContext = {
        input: run.input,
        previous: payload,
        steps: stepOutputs,
      };
      const mappedInput = this.mapperEngine.apply(inboundEdge?.spec, context);

      if (!step.modelVersion) {
        await this.persistence.recordStepRun(
          run,
          step,
          mappedInput,
          null,
          PipelineStepRunStatus.FAILED,
          0,
          null,
          'Step has no bound model version (upload still pending)',
        );
        return {
          success: false,
          anySucceeded,
          payload,
          stepOutputs,
          totalCost,
          errorMessage: `Step "${step.label ?? step.order}" has no bound model version`,
        };
      }

      const stepResult = await this.stepExecutor.execute(
        step,
        mappedInput,
        actor,
        clientMeta,
      );
      await this.persistence.recordStepRun(
        run,
        step,
        mappedInput,
        stepResult.success
          ? this.stepExecutor.wrapOutput(stepResult.output)
          : null,
        stepResult.success
          ? PipelineStepRunStatus.SUCCESS
          : PipelineStepRunStatus.FAILED,
        stepResult.cost,
        stepResult.responseTimeMs,
        stepResult.errorMessage,
      );

      if (!stepResult.success) {
        return {
          success: false,
          anySucceeded,
          payload,
          stepOutputs,
          totalCost,
          errorMessage: stepResult.errorMessage,
        };
      }

      totalCost += stepResult.cost;
      anySucceeded = true;
      payload = this.stepExecutor.wrapOutput(stepResult.output);
      stepOutputs[String(step.order)] = payload;
    }

    return {
      success: true,
      anySucceeded,
      payload,
      stepOutputs,
      totalCost,
      errorMessage: null,
    };
  }
}
