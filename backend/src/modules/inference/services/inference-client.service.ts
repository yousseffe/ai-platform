import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { Model } from '../../models/entities/model.entity';
import { KeyQuotaService } from '../../auth/services/key-quota.service';
import { InferenceDeploymentResolverService } from './inference-deployment-resolver.service';
import {
  InferenceCallPreparerService,
  PreparedCall,
} from './inference-call-preparer.service';
import { InferenceBillingService } from './inference-billing.service';
import { InferenceLogService } from './inference-log.service';
import { InferenceCacheService } from './inference-cache.service';
import {
  ClientRequestMeta,
  InferenceResult,
  PredictionActor,
  RequestFingerprint,
} from '../interfaces/inference.interface';
import { InferenceStatus } from '../enums/inference-status.enum';

export interface RecordOutcomeParams {
  model: Model;
  actor: PredictionActor;
  clientMeta: ClientRequestMeta;
  data: Record<string, unknown>;
  cost: number;
  providerSharePercent: number;
  statusCode: number;
  status: InferenceStatus;
  responseTimeMs: number;
  errorMessage: string | null;
  responseSizeBytes: number | null;

  fingerprint?: RequestFingerprint;
}

@Injectable()
export class InferenceClient {
  constructor(
    private readonly httpService: HttpService,
    private readonly deploymentResolver: InferenceDeploymentResolverService,
    private readonly callPreparer: InferenceCallPreparerService,
    private readonly billingService: InferenceBillingService,
    private readonly logService: InferenceLogService,
    private readonly cacheService: InferenceCacheService,
    private readonly keyQuotaService: KeyQuotaService,
  ) {}

  async resolveDeploymentUrl(
    model: Model,
    versionNumber?: number,
  ): Promise<{ url: string; deploymentId: string }> {
    return this.deploymentResolver.resolveDeploymentUrl(model, versionNumber);
  }

  async prepareCall(
    model: Model,
    actor: PredictionActor,
  ): Promise<PreparedCall> {
    return this.callPreparer.prepareCall(model, actor);
  }

  async markActive(deploymentId: string): Promise<void> {
    await this.callPreparer.markActive(deploymentId);
  }

  async recordOutcome(params: RecordOutcomeParams): Promise<void> {
    const fingerprint =
      params.fingerprint ??
      this.logService.computeRequestFingerprint(params.data);

    if (params.cost > 0 && params.status === InferenceStatus.SUCCESS) {
      try {
        await this.billingService.chargeForInference(
          params.model,
          params.cost,
          params.providerSharePercent,
          params.actor,
        );
      } catch (error: unknown) {
        console.error('[Billing Error]', error);
      }

      const quotaKeyId = params.actor.orgApiKeyId ?? params.actor.apiKeyId;
      if (quotaKeyId) {
        await this.keyQuotaService
          .recordSpend(quotaKeyId, params.cost)
          .catch((error) => console.error('[Quota Spend Error]', error));
      }
    }

    await this.logService.writeModelLog({
      model: params.model,
      actor: params.actor,
      clientMeta: params.clientMeta,
      fingerprint,
      creditsCharged:
        params.status === InferenceStatus.SUCCESS ? params.cost : 0,
      responseTimeMs: params.responseTimeMs,
      status: params.status,
      statusCode: params.statusCode,
      responseSizeBytes: params.responseSizeBytes,
      errorMessage: params.errorMessage,
    });
  }

  async runInference(
    model: Model,
    url: string,
    deploymentId: string | null,
    data: Record<string, unknown>,
    actor: PredictionActor,
    clientMeta: ClientRequestMeta,
  ): Promise<InferenceResult> {
    const fingerprint = this.logService.computeRequestFingerprint(data);

    if (model.cacheEnabled && deploymentId && fingerprint.payloadHash) {
      const cached = await this.cacheService.get(
        model.id,
        deploymentId,
        fingerprint.payloadHash,
      );
      if (cached) {
        return this.serveCachedResult(
          model,
          deploymentId,
          data,
          actor,
          clientMeta,
          fingerprint,
          cached,
        );
      }
    }

    const prepared = await this.callPreparer.prepareCall(model, actor);
    if (deploymentId) {
      await this.callPreparer.markActive(deploymentId);
    }

    const startTime = Date.now();
    let statusCode = 200;
    let status: InferenceStatus = InferenceStatus.SUCCESS;
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
      const containerError = this.extractContainerError(output);
      if (containerError) {
        status = InferenceStatus.FAILED;
        statusCode = 500;
        errorMessage = containerError.slice(0, 1000);
      }
      try {
        responseSizeBytes = Buffer.byteLength(JSON.stringify(response.data));
      } catch {}

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
      status = InferenceStatus.FAILED;
      statusCode = this.extractHttpStatus(err) ?? 500;
      const message = this.extractHttpErrorMessage(err);
      errorMessage = message.slice(0, 1000);
    }

    const responseTimeMs = Date.now() - startTime;

    if (
      status === InferenceStatus.SUCCESS &&
      model.cacheEnabled &&
      deploymentId &&
      fingerprint.payloadHash
    ) {
      await this.cacheService.set(
        model.id,
        deploymentId,
        fingerprint.payloadHash,
        { output, cost, responseSizeBytes },
        model.cacheTtlSeconds,
      );
      await this.cacheService.recordMiss(model.id);
    }

    await this.recordOutcome({
      model,
      actor,
      clientMeta,
      data,
      cost: status === InferenceStatus.SUCCESS ? cost : 0,
      providerSharePercent: prepared.providerSharePercent,
      statusCode,
      status,
      responseTimeMs,
      errorMessage,
      responseSizeBytes,
      fingerprint,
    });

    return {
      output,
      statusCode,
      cost: status === InferenceStatus.SUCCESS ? cost : 0,
      responseTimeMs,
      status,
      cacheHit: false,
      errorMessage,
      deploymentId,
    };
  }

  private extractContainerError(output: unknown): string | null {
    if (!output || typeof output !== 'object') {
      return null;
    }

    const body = output as Record<string, unknown>;
    if (typeof body.error === 'string' && body.error.trim()) {
      return body.error;
    }

    return null;
  }

  private extractHttpStatus(error: unknown): number | null {
    if (error instanceof AxiosError && error.response?.status) {
      return error.response.status;
    }

    return null;
  }

  private extractHttpErrorMessage(error: unknown): string {
    if (error instanceof AxiosError && error.response?.data) {
      const data = error.response.data;
      if (typeof data === 'string') {
        return data;
      }
      if (typeof data === 'object') {
        const body = data as Record<string, unknown>;
        const detail = body.detail ?? body.error ?? body.message;
        if (typeof detail === 'string') {
          return detail;
        }
        try {
          return JSON.stringify(body);
        } catch {}
      }
    }

    return error instanceof Error ? error.message : String(error);
  }

  private async serveCachedResult(
    model: Model,
    deploymentId: string,
    data: Record<string, unknown>,
    actor: PredictionActor,
    clientMeta: ClientRequestMeta,
    fingerprint: RequestFingerprint,
    cached: { output: unknown; cost: number; responseSizeBytes: number | null },
  ): Promise<InferenceResult> {
    const startTime = Date.now();
    const prepared = await this.callPreparer.prepareCall(model, actor);
    await this.callPreparer.markActive(deploymentId);

    const discountPercent = model.cacheHitDiscountPercent ?? 100;
    const cost = cached.cost * (1 - discountPercent / 100);
    const responseTimeMs = Date.now() - startTime;

    await this.cacheService.recordHit(model.id);

    await this.recordOutcome({
      model,
      actor,
      clientMeta,
      data,
      cost,
      providerSharePercent: prepared.providerSharePercent,
      statusCode: 200,
      status: InferenceStatus.SUCCESS,
      responseTimeMs,
      errorMessage: null,
      responseSizeBytes: cached.responseSizeBytes,
      fingerprint,
    });

    return {
      output: cached.output,
      statusCode: 200,
      cost,
      responseTimeMs,
      status: InferenceStatus.SUCCESS,
      cacheHit: true,
      errorMessage: null,
      deploymentId,
    };
  }
}
