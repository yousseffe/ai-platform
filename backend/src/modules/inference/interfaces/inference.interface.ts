import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { ApiKeyType } from '../../auth';
import { InferenceStatus } from '../enums/inference-status.enum';

export interface PredictionActor {
  userId: string;
  email: string;
  apiKey?: string;
  apiKeyType?: ApiKeyType;
  apiKeyId?: string;
  orgApiKeyId?: string;
  orgApiKeyLabel?: string;
  orgApiKeyPrefix?: string;
  orgId?: string;
  projectId?: string;
  workspaceId: string;
  workspaceType: OwnerType;
}

export interface ClientRequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
  xForwardedFor: string | null;
}

export interface InferenceResult {
  output: unknown;
  statusCode: number;
  cost: number;
  responseTimeMs: number;
  status: InferenceStatus;
  errorMessage: string | null;
  deploymentId: string | null;

  cacheHit: boolean;
}

export interface InferencePricing {
  cost: number;
  providerSharePercent: number;
  isLlm?: boolean;
  inputPricePerMToken?: number;
  outputPricePerMToken?: number;
}

export interface ContainerCallTarget {
  endpoint: string;
  headers: Record<string, string>;
}

export interface RequestFingerprint {
  requestSizeBytes: number | null;
  payloadHash: string | null;
  injectionMatch: string | null;
}

export interface RequestWithUser {
  user: {
    id: string;
    email: string;
    isAdmin?: boolean;
  };
  workspaceId?: string;
  workspaceType?: OwnerType;
}

export interface PredictionRequestContext {
  user: {
    id: string;
    email: string;
    apiKey?: string;
    apiKeyType?: ApiKeyType;
    apiKeyId?: string;
    orgApiKeyId?: string;
    orgApiKeyLabel?: string;
    orgApiKeyPrefix?: string;
    orgId?: string;
    projectId?: string;
  };
  workspaceId?: string;
  workspaceType?: OwnerType;
}
