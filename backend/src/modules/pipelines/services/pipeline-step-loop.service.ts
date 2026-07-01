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

/** Result of walking a pipeline run's full stage-by-stage execution. */
export interface RunStepsOutcome {
  success: boolean;
  anySucceeded: boolean;
  /** Every completed stage's output, keyed by `order` — see {@link MapperContext.steps}. */
  stepOutputs: Record<string, Record<string, unknown>>;
  /** The `order` of the last stage that ran (successfully or not), or -1 if none did. */
  lastStageOrder: number;
  totalCost: number;
  errorMessage: string | null;
}

/** One step's execution outcome within a stage, before it's folded into the run's aggregates. */
interface StepOutcome {
  step: PipelineStep;
  success: boolean;
  output: Record<string, unknown>;
  cost: number;
  errorMessage: string | null;
}

/**
 * Walks a pipeline run stage by stage — steps sharing an `order` run
 * concurrently as parallel branches of that stage. For each step, every
 * inbound edge targeting it is applied independently (each against its own
 * upstream step's output) and the results are shallow-merged, which is how a
 * fan-in "join" step combines multiple parallel branches, each with its own
 * from/to mapper. Execution halts before the next stage if any step in the
 * current one failed.
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
    const stages = this.groupIntoStages(steps);
    const stepOutputs: Record<string, Record<string, unknown>> = {};
    let totalCost = 0;
    let anySucceeded = false;
    let lastStageOrder = -1;

    for (const stage of stages) {
      lastStageOrder = stage[0].order;
      const outcomes = await Promise.all(
        stage.map((step) =>
          this.runOneStep(
            step,
            steps,
            edges,
            stepOutputs,
            run,
            actor,
            clientMeta,
          ),
        ),
      );

      for (const outcome of outcomes) {
        totalCost += outcome.cost;
        if (outcome.success) {
          anySucceeded = true;
        }
      }
      stepOutputs[String(stage[0].order)] = this.buildStageOutput(
        stage,
        outcomes,
      );

      const failed = outcomes.find((o) => !o.success);
      if (failed) {
        return {
          success: false,
          anySucceeded,
          stepOutputs,
          lastStageOrder,
          totalCost,
          errorMessage: failed.errorMessage,
        };
      }
    }

    return {
      success: true,
      anySucceeded,
      stepOutputs,
      lastStageOrder,
      totalCost,
      errorMessage: null,
    };
  }

  /**
   * Resolves one node's mapped input from every inbound edge targeting it
   * and shallow-merges the results. `targetStepId` is null to resolve the
   * pipeline's final output (edges with a null `toStep`). Falls back to the
   * single immediately-prior stage's output (or the run's input, for the
   * first stage) when nothing targets this node, preserving the original
   * no-edge-needed pass-through behavior for purely sequential pipelines.
   *
   * Exposed so {@link PipelineRunnerService} can reuse the same merge logic
   * for the pipeline's final output mapping.
   */
  resolveMappedInput(
    targetStepId: string | null,
    targetOrder: number,
    steps: PipelineStep[],
    edges: PipelineEdge[],
    stepOutputs: Record<string, Record<string, unknown>>,
    runInput: Record<string, unknown>,
  ): Record<string, unknown> {
    const inbound = edges.filter((e) =>
      targetStepId === null ? !e.toStep : e.toStep?.id === targetStepId,
    );

    if (inbound.length === 0) {
      return this.defaultPrevious(targetOrder, steps, stepOutputs, runInput);
    }

    const sorted = [...inbound].sort((a, b) => {
      const orderA = a.fromStep?.order ?? -1;
      const orderB = b.fromStep?.order ?? -1;
      if (orderA !== orderB) return orderA - orderB;
      return (a.fromStep?.id ?? '').localeCompare(b.fromStep?.id ?? '');
    });

    const merged: Record<string, unknown> = {};
    for (const edge of sorted) {
      const previous = edge.fromStep
        ? this.outputForStep(edge.fromStep, steps, stepOutputs)
        : runInput;
      const context: MapperContext = {
        input: runInput,
        previous,
        steps: stepOutputs,
      };
      Object.assign(merged, this.mapperEngine.apply(edge.spec, context));
    }
    return merged;
  }

  /** Executes one step against its resolved mapped input and records the outcome. Never throws. */
  private async runOneStep(
    step: PipelineStep,
    allSteps: PipelineStep[],
    edges: PipelineEdge[],
    stepOutputs: Record<string, Record<string, unknown>>,
    run: PipelineRun,
    actor: PredictionActor,
    clientMeta: ClientRequestMeta,
  ): Promise<StepOutcome> {
    const mappedInput = this.resolveMappedInput(
      step.id,
      step.order,
      allSteps,
      edges,
      stepOutputs,
      run.input,
    );

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
        step,
        success: false,
        output: {},
        cost: 0,
        errorMessage: `Step "${step.label ?? step.order}" has no bound model version`,
      };
    }

    const stepResult = await this.stepExecutor.execute(
      step,
      mappedInput,
      actor,
      clientMeta,
    );
    const output = stepResult.success
      ? this.stepExecutor.wrapOutput(stepResult.output)
      : {};
    await this.persistence.recordStepRun(
      run,
      step,
      mappedInput,
      stepResult.success ? output : null,
      stepResult.success
        ? PipelineStepRunStatus.SUCCESS
        : PipelineStepRunStatus.FAILED,
      stepResult.cost,
      stepResult.responseTimeMs,
      stepResult.errorMessage,
    );

    return {
      step,
      success: stepResult.success,
      output,
      cost: stepResult.cost,
      errorMessage: stepResult.errorMessage,
    };
  }

  /** Groups steps by `order` into ascending stages; steps within a stage run concurrently. */
  private groupIntoStages(steps: PipelineStep[]): PipelineStep[][] {
    const byOrder = new Map<number, PipelineStep[]>();
    for (const step of steps) {
      const bucket = byOrder.get(step.order) ?? [];
      bucket.push(step);
      byOrder.set(step.order, bucket);
    }
    return [...byOrder.keys()]
      .sort((a, b) => a - b)
      .map((order) => byOrder.get(order)!);
  }

  /**
   * Shapes one stage's combined output for `MapperContext.steps`: a
   * single-step stage's output is stored flat; a multi-step (parallel)
   * stage's output is nested one level deeper, keyed by each step's `role`.
   */
  private buildStageOutput(
    stage: PipelineStep[],
    outcomes: StepOutcome[],
  ): Record<string, unknown> {
    if (stage.length === 1) {
      return outcomes[0].output;
    }
    const nested: Record<string, unknown> = {};
    stage.forEach((step, i) => {
      nested[step.role ?? step.id] = outcomes[i].output;
    });
    return nested;
  }

  /** Reads one step's output back out of a `MapperContext.steps`-shaped map, honoring the flat/nested-by-role duality. */
  private outputForStep(
    step: PipelineStep,
    allSteps: PipelineStep[],
    stepOutputs: Record<string, Record<string, unknown>>,
  ): Record<string, unknown> {
    const stageOutput = stepOutputs[String(step.order)];
    if (!stageOutput) return {};
    const stageSize = allSteps.filter((s) => s.order === step.order).length;
    if (stageSize <= 1) {
      return stageOutput;
    }
    const key = step.role ?? step.id;
    return (stageOutput[key] as Record<string, unknown>) ?? {};
  }

  /**
   * The implicit "previous" for a node with no inbound edge: the single
   * immediately-prior stage's output, or the run's input for the first
   * stage. Ambiguous (a parallel prior stage with no explicit edge) falls
   * back to an empty object — mapper authors must address branches
   * explicitly via edges in that case.
   */
  private defaultPrevious(
    targetOrder: number,
    steps: PipelineStep[],
    stepOutputs: Record<string, Record<string, unknown>>,
    runInput: Record<string, unknown>,
  ): Record<string, unknown> {
    const priorOrders = [...new Set(steps.map((s) => s.order))]
      .filter((order) => order < targetOrder)
      .sort((a, b) => b - a);
    if (priorOrders.length === 0) {
      return runInput;
    }
    const priorStage = steps.filter((s) => s.order === priorOrders[0]);
    if (priorStage.length !== 1) {
      return {};
    }
    return this.outputForStep(priorStage[0], steps, stepOutputs);
  }
}
