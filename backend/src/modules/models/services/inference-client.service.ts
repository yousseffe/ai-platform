import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Model } from '../entities/model.entity';
import { InferenceDeploymentResolverService } from './inference-deployment-resolver.service';
import {
  InferenceCallPreparerService,
  PreparedCall,
} from './inference-call-preparer.service';
import { InferenceBillingService } from './inference-billing.service';
import { InferenceLogService } from './inference-log.service';
import {
  ClientRequestMeta,
  InferenceResult,
  PredictionActor,
} from '../interfaces/inference.interface';

/** Parameters for {@link InferenceClient.recordOutcome}. */
export interface RecordOutcomeParams {
  model: Model;
  actor: PredictionActor;
  clientMeta: ClientRequestMeta;
  data: Record<string, unknown>;
  cost: number;
  providerSharePercent: number;
  statusCode: number;
  status: 'SUCCESS' | 'FAILED';
  responseTimeMs: number;
  errorMessage: string | null;
  responseSizeBytes: number | null;
}

/**
 * Single entry point for proxying a prediction call to a deployed model
 * container: resolves/auto-deploys the target container, charges and logs the
 * call, and returns a structured result. Used identically by the public
 * predict endpoints in {@link ModelsController} and by the pipeline execution
 * engine — a pipeline step is billed, logged, and fraud-scanned exactly like a
 * direct call. Orchestrates the deployment resolver, call preparer, billing,
 * and logging services without duplicating their logic.
 */
@Injectable()
export class InferenceClient {
  constructor(
    private readonly httpService: HttpService,
    private readonly deploymentResolver: InferenceDeploymentResolverService,
    private readonly callPreparer: InferenceCallPreparerService,
    private readonly billingService: InferenceBillingService,
    private readonly logService: InferenceLogService,
  ) {}

  /** @see InferenceDeploymentResolverService.resolveDeploymentUrl */
  async resolveDeploymentUrl(
    model: Model,
    versionNumber?: number,
  ): Promise<{ url: string; deploymentId: string }> {
    return this.deploymentResolver.resolveDeploymentUrl(model, versionNumber);
  }

  /** @see InferenceCallPreparerService.prepareCall */
  async prepareCall(
    model: Model,
    actor: PredictionActor,
  ): Promise<PreparedCall> {
    return this.callPreparer.prepareCall(model, actor);
  }

  /** @see InferenceCallPreparerService.markActive */
  async markActive(deploymentId: string): Promise<void> {
    await this.callPreparer.markActive(deploymentId);
  }

  /**
   * Charges (if successful) and logs the outcome of a prediction call.
   * Billing/logging errors are caught internally and never thrown — the
   * caller already has their response.
   */
  async recordOutcome(params: RecordOutcomeParams): Promise<void> {
    const fingerprint = this.logService.computeRequestFingerprint(params.data);

    if (params.cost > 0 && params.status === 'SUCCESS') {
      try {
        await this.billingService.chargeForInference(
          params.model,
          params.cost,
          params.providerSharePercent,
          params.actor,
        );
      } catch (error) {
        console.error('[Billing Error]', error);
      }
    }

    await this.logService.writeModelLog({
      model: params.model,
      actor: params.actor,
      clientMeta: params.clientMeta,
      fingerprint,
      creditsCharged: params.status === 'SUCCESS' ? params.cost : 0,
      responseTimeMs: params.responseTimeMs,
      status: params.status,
      statusCode: params.statusCode,
      responseSizeBytes: params.responseSizeBytes,
      errorMessage: params.errorMessage,
    });
  }

  /**
   * Runs a complete non-streaming prediction call: validates affordability,
   * proxies the request to the container, then charges and logs the outcome.
   * This is the single call path both `POST /models/:id/predict` and pipeline
   * steps use.
   *
   * @param model - The model being called.
   * @param url - The resolved deployment base URL.
   * @param deploymentId - The deployment ID, for idle tracking.
   * @param data - The request payload (already mapped, for pipeline steps).
   * @param actor - The caller identity for billing/logging.
   * @param clientMeta - Client network metadata for fraud analysis.
   */
  async runInference(
    model: Model,
    url: string,
    deploymentId: string | null,
    data: Record<string, unknown>,
    actor: PredictionActor,
    clientMeta: ClientRequestMeta,
  ): Promise<InferenceResult> {
    const prepared = await this.callPreparer.prepareCall(model, actor);
    if (deploymentId) {
      await this.callPreparer.markActive(deploymentId);
    }

    const startTime = Date.now();
    let statusCode = 200;
    let status: 'SUCCESS' | 'FAILED' = 'SUCCESS';
    let errorMessage: string | null = null;
    let output: unknown = null;
    let responseSizeBytes: number | null = null;
    let cost = prepared.cost;

    try {
      const response = await firstValueFrom(
        this.httpService.post<unknown>(`${url}${prepared.endpoint}`, data, {
          headers: prepared.headers,
        }),
      );
      output = response.data;
      try {
        responseSizeBytes = Buffer.byteLength(JSON.stringify(response.data));
      } catch {
        /* leave response size null */
      }

      // Compute actual token cost for LLM GGUF models from response usage block
      if (
        prepared.isLlm &&
        response.data &&
        typeof response.data === 'object'
      ) {
        const usage = (response.data as Record<string, unknown>).usage as
          | Record<string, number>
          | undefined;
        if (usage) {
          const promptTokens = usage.prompt_tokens ?? 0;
          const completionTokens = usage.completion_tokens ?? 0;
          const inputPrice = prepared.inputPricePerMToken ?? 0;
          const outputPrice = prepared.outputPricePerMToken ?? 0;
          if (inputPrice > 0 || outputPrice > 0) {
            cost =
              (promptTokens / 1_000_000) * inputPrice +
              (completionTokens / 1_000_000) * outputPrice;
          }
        }
      }
    } catch (err: unknown) {
      status = 'FAILED';
      statusCode = 500;
      const message = err instanceof Error ? err.message : String(err);
      errorMessage = message.slice(0, 1000);
    }

    const responseTimeMs = Date.now() - startTime;

    await this.recordOutcome({
      model,
      actor,
      clientMeta,
      data,
      cost: status === 'SUCCESS' ? cost : 0,
      providerSharePercent: prepared.providerSharePercent,
      statusCode,
      status,
      responseTimeMs,
      errorMessage,
      responseSizeBytes,
    });

    return {
      output,
      statusCode,
      cost: status === 'SUCCESS' ? cost : 0,
      responseTimeMs,
      status,
      errorMessage,
      deploymentId,
    };
  }
}
