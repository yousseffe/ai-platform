import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Model } from '../entities/model.entity';
import { ModelLog } from '../entities/model-log.entity';
import { User } from '../../users/entities/user.entity';
import { OrgApiKey } from '../../organizations/entities/org-api-key.entity';
import { detectInjection } from '../../../shared/security/injection-patterns';
import {
  ClientRequestMeta,
  PredictionActor,
  RequestFingerprint,
} from '../interfaces/inference.interface';

/** Parameters for {@link InferenceLogService.writeModelLog}. */
export interface WriteModelLogParams {
  model: Model;
  actor: PredictionActor;
  clientMeta: ClientRequestMeta;
  fingerprint: RequestFingerprint;
  creditsCharged: number;
  responseTimeMs: number;
  status: 'SUCCESS' | 'FAILED';
  statusCode: number;
  responseSizeBytes: number | null;
  errorMessage: string | null;
}

/**
 * Computes deterministic request fingerprints and persists {@link ModelLog}
 * audit rows for every prediction call, regardless of whether it succeeded.
 */
@Injectable()
export class InferenceLogService {
  constructor(
    @InjectRepository(ModelLog)
    private readonly modelLogRepository: Repository<ModelLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OrgApiKey)
    private readonly orgApiKeyRepository: Repository<OrgApiKey>,
  ) {}

  /**
   * Derives request size, payload hash, and prompt-injection match category
   * from a request payload. Never stores the raw payload itself.
   *
   * @param data - The raw prediction request body.
   * @returns The computed {@link RequestFingerprint}.
   */
  computeRequestFingerprint(data: Record<string, unknown>): RequestFingerprint {
    try {
      const serialized = JSON.stringify(data ?? {});
      return {
        requestSizeBytes: Buffer.byteLength(serialized),
        payloadHash: crypto
          .createHash('sha256')
          .update(serialized)
          .digest('hex'),
        injectionMatch: detectInjection(serialized),
      };
    } catch {
      return {
        requestSizeBytes: null,
        payloadHash: null,
        injectionMatch: null,
      };
    }
  }

  /**
   * Persists a {@link ModelLog} row for one prediction call. Errors writing
   * the log are caught and reported — they must never fail the prediction
   * response, since the caller already has their result.
   *
   * @param params - The log fields to persist.
   */
  async writeModelLog(params: WriteModelLogParams): Promise<void> {
    const { model, actor, clientMeta, fingerprint } = params;
    try {
      const callerUser = actor.orgApiKeyId
        ? null
        : await this.userRepository.findOneBy({ id: actor.userId });
      const orgApiKey = actor.orgApiKeyId
        ? await this.orgApiKeyRepository.findOneBy({ id: actor.orgApiKeyId })
        : null;

      const logEntry = this.modelLogRepository.create({
        model,
        user: callerUser,
        apiKey: actor.apiKey || actor.orgApiKeyPrefix || 'JWT Session',
        orgApiKey,
        orgId: actor.orgId ?? null,
        projectId: actor.projectId ?? null,
        apiKeyLabel: actor.orgApiKeyLabel ?? null,
        apiKeyPrefix: actor.orgApiKeyPrefix ?? null,
        creditsCharged: params.creditsCharged,
        responseTimeMs: params.responseTimeMs,
        status: params.status,
        statusCode: params.statusCode,
        ipAddress: clientMeta.ipAddress,
        userAgent: clientMeta.userAgent,
        xForwardedFor: clientMeta.xForwardedFor,
        requestSizeBytes: fingerprint.requestSizeBytes,
        responseSizeBytes: params.responseSizeBytes,
        payloadHash: fingerprint.payloadHash,
        errorMessage: params.errorMessage,
        injectionMatch: fingerprint.injectionMatch,
      });
      await this.modelLogRepository.save(logEntry);
    } catch (logError) {
      console.error('Failed to save model execution log:', logError);
    }
  }
}
