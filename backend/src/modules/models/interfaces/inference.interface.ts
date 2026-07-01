import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { ApiKeyType } from '../../auth/enums/api-key-type.enum';

/**
 * Identity of the caller making a prediction request, regardless of whether the
 * call originates from the public predict endpoint or an internal pipeline step.
 */
export interface PredictionActor {
  userId: string;
  email: string;
  apiKey?: string;
  apiKeyType?: ApiKeyType;
  orgApiKeyId?: string;
  orgApiKeyLabel?: string;
  orgApiKeyPrefix?: string;
  orgId?: string;
  projectId?: string;
  workspaceId: string;
  workspaceType: OwnerType;
}

/** Client request metadata captured per prediction for abuse/fraud analysis. */
export interface ClientRequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
  xForwardedFor: string | null;
}

/** Outcome of a single non-streaming prediction call through the {@link InferenceClient}. */
export interface InferenceResult {
  output: unknown;
  statusCode: number;
  cost: number;
  responseTimeMs: number;
  status: 'SUCCESS' | 'FAILED';
  errorMessage: string | null;
  deploymentId: string | null;
}

/** Pricing resolved for a single inference call. */
export interface InferencePricing {
  cost: number;
  providerSharePercent: number;
  isLlm?: boolean;
  inputPricePerMToken?: number;
  outputPricePerMToken?: number;
}

/** Resolved target the platform proxies the prediction call to. */
export interface ContainerCallTarget {
  endpoint: string;
  headers: Record<string, string>;
}

/** Deterministic fingerprints captured from a request payload, never the raw input. */
export interface RequestFingerprint {
  requestSizeBytes: number | null;
  payloadHash: string | null;
  injectionMatch: string | null;
}
