import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Model } from '../../models/entities/model.entity';
import { User } from '../../users/entities/user.entity';
import { OrgApiKey } from '../../organizations/entities/org-api-key.entity';
import { ModelLog } from '../entities/model-log.entity';
import { detectInjection } from '../../../shared/security/injection-patterns';
import {
  ClientRequestMeta,
  PredictionActor,
  RequestFingerprint,
} from '../interfaces/inference.interface';
import { InferenceStatus } from '../enums/inference-status.enum';

export interface WriteModelLogParams {
  model: Model;
  actor: PredictionActor;
  clientMeta: ClientRequestMeta;
  fingerprint: RequestFingerprint;
  creditsCharged: number;
  responseTimeMs: number;
  status: InferenceStatus;
  statusCode: number;
  responseSizeBytes: number | null;
  errorMessage: string | null;
}

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
    } catch (logError: unknown) {
      console.error('Failed to save model execution log:', logError);
    }
  }
}
