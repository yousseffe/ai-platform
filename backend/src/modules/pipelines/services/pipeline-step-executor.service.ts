import { Injectable } from '@nestjs/common';
import { PipelineStep } from '../entities/pipeline-step.entity';
import { PipelinePinPolicy } from '../enums/pipeline-pin-policy.enum';
import { ModelsService } from '../../models/services/models.service';
import { InferenceClient } from '../../models/services/inference-client.service';
import {
  ClientRequestMeta,
  PredictionActor,
} from '../../models/interfaces/inference.interface';

/** Outcome of executing one {@link PipelineStep}, with retries already applied. */
export interface StepExecutionResult {
  success: boolean;
  output: unknown;
  cost: number;
  responseTimeMs: number | null;
  errorMessage: string | null;
}

/**
 * Resolves a step's target model/deployment and calls it through the shared
 * {@link InferenceClient}, retrying up to `step.maxRetries` times on failure.
 *
 * A call is only treated as a true success if the HTTP call succeeded *and*
 * the response body isn't shaped like the serving templates' own internal
 * error envelope (`{"error": "..."}` — see `serve_tabular.py` etc., which
 * catch exceptions and return them as a 200 OK body rather than a non-2xx
 * status). Without this check a broken step's error payload would silently
 * flow downstream as if it were valid model output.
 */
@Injectable()
export class PipelineStepExecutorService {
  constructor(
    private readonly modelsService: ModelsService,
    private readonly inferenceClient: InferenceClient,
  ) {}

  /**
   * Executes a single pipeline step against an already-mapped input payload.
   *
   * @param step - The step to execute (must have a bound `modelVersion`).
   * @param mappedInput - The payload to send, after the inbound edge's mapper ran.
   * @param actor - The caller identity for billing/logging.
   * @param clientMeta - Synthetic client metadata for the internal call.
   */
  async execute(
    step: PipelineStep,
    mappedInput: Record<string, unknown>,
    actor: PredictionActor,
    clientMeta: ClientRequestMeta,
  ): Promise<StepExecutionResult> {
    const model = await this.modelsService.getModel(
      step.modelVersion!.model.id,
    );
    const versionNumber =
      step.pinPolicy === PipelinePinPolicy.PINNED
        ? step.modelVersion!.versionNumber
        : undefined;

    let lastError: string | null = null;
    let lastResponseTimeMs: number | null = null;
    let totalCost = 0;

    for (let attempt = 0; attempt <= step.maxRetries; attempt++) {
      try {
        const { url, deploymentId } =
          await this.inferenceClient.resolveDeploymentUrl(model, versionNumber);
        const result = await this.inferenceClient.runInference(
          model,
          url,
          deploymentId,
          mappedInput,
          actor,
          clientMeta,
        );
        totalCost += result.cost;
        lastResponseTimeMs = result.responseTimeMs;

        if (result.status === 'SUCCESS') {
          const inBandError = extractInBandError(result.output);
          if (!inBandError) {
            return {
              success: true,
              output: result.output,
              cost: totalCost,
              responseTimeMs: result.responseTimeMs,
              errorMessage: null,
            };
          }
          lastError = inBandError;
        } else {
          lastError = result.errorMessage;
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    return {
      success: false,
      output: null,
      cost: totalCost,
      responseTimeMs: lastResponseTimeMs,
      errorMessage: lastError,
    };
  }

  /** Wraps non-object model outputs so the mapper engine always has a record to read from. */
  wrapOutput(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : { value };
  }
}

/**
 * Detects the serving templates' internal error envelope (`{"error": "..."}`)
 * in an otherwise-200-OK response body.
 *
 * @param output - The raw model response.
 * @returns The error message if the output matches the envelope shape, else null.
 */
function extractInBandError(output: unknown): string | null {
  if (typeof output !== 'object' || output === null || Array.isArray(output)) {
    return null;
  }
  const errorValue = (output as Record<string, unknown>).error;
  return typeof errorValue === 'string' ? errorValue : null;
}
