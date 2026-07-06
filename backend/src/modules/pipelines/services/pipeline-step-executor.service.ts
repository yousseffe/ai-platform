import { Injectable } from '@nestjs/common';
import { PipelineStep } from '../entities/pipeline-step.entity';
import { PipelinePinPolicy } from '../enums/pipeline-pin-policy.enum';
import { ModelsService } from '../../models';
import {
  ClientRequestMeta,
  InferenceClient,
  InferenceStatus,
  PredictionActor,
} from '../../inference';

export interface StepExecutionResult {
  success: boolean;
  output: unknown;
  cost: number;
  responseTimeMs: number | null;
  errorMessage: string | null;
}

@Injectable()
export class PipelineStepExecutorService {
  constructor(
    private readonly modelsService: ModelsService,
    private readonly inferenceClient: InferenceClient,
  ) {}

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

        if (result.status === InferenceStatus.SUCCESS) {
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

  wrapOutput(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : { value };
  }
}

function extractInBandError(output: unknown): string | null {
  if (typeof output !== 'object' || output === null || Array.isArray(output)) {
    return null;
  }
  const errorValue = (output as Record<string, unknown>).error;
  return typeof errorValue === 'string' ? errorValue : null;
}
