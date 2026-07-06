import { smartFetch } from "@/lib/utils/smart-fetch";
import { LARGE_MODEL_SCHEMA_DETECTION_THRESHOLD_BYTES } from "@/lib/utils/upload-thresholds";
import {
  Model,
  ModelVersion,
  ModelLog,
  ModelVersionReviewEvent,
  ModelVersionTestCase,
  ProviderInsights,
  ModelIntegrationSpec,
} from "@/types";

/**
 * Fetches all registered machine learning models from the backend.
 *
 * @returns A promise resolving to an array of Model instances.
 */
export async function getModels(): Promise<Model[]> {
  return smartFetch<Model[]>("/models", {
    cache: "no-store",
  });
}

/**
 * Fetches the complete configuration and history details of a single model by ID.
 *
 * @param id - The unique database ID of the model.
 * @returns A promise resolving to the Model object.
 */
export async function getModel(id: string): Promise<Model> {
  return smartFetch<Model>(`/models/${id}`, {
    cache: "no-store",
  });
}

/**
 * Registers a new ML model with name, optional description, and visibility setting on the backend.
 *
 * @param name - The name of the model.
 * @param description - Summary of the model's domain and deployment purpose.
 * @param isPublic - Visibility flag indicating whether this model is public in the marketplace.
 * @returns A promise resolving to the created Model object.
 */
export async function createModel(
  name: string,
  description: string,
  isPublic: boolean = false,
  type?: string,
  framework?: string,
  taskType?: string,
): Promise<Model> {
  return smartFetch<Model>("/models", {
    method: "POST",
    body: JSON.stringify({
      name,
      description,
      isPublic,
      type,
      framework,
      taskType,
    }),
  });
}

/**
 * Fetches all public machine learning models from the backend.
 *
 * @returns A promise resolving to an array of public Model instances.
 */
export async function getPublicModels(): Promise<Model[]> {
  return smartFetch<Model[]>("/models/marketplace", {
    cache: "no-store",
  });
}

/**
 * Fetches a single public model by its ID — no auth token attached.
 * Uses the /models/marketplace/:id endpoint so guests can view model details.
 *
 * @param id - The unique model UUID.
 * @returns A promise resolving to the Model object.
 */
export async function getPublicModelById(id: string): Promise<Model> {
  return smartFetch<Model>(`/models/marketplace/${id}`, {
    cache: "no-store",
  });
}

export async function getModelIntegrationSpec(
  id: string,
): Promise<ModelIntegrationSpec> {
  return smartFetch<ModelIntegrationSpec>(`/models/${id}/integration-spec`, {
    cache: "no-store",
  });
}

/**
 * Submits a new version's artifacts (weights and scripts) for build queueing.
 *
 * @param id - The parent model UUID.
 * @param formData - Envelope carrying the file binary streams and version strings.
 * @returns A promise resolving to the created ModelVersion instance.
 */
export async function uploadModelVersion(
  id: string,
  formData: FormData,
): Promise<ModelVersion> {
  return smartFetch<ModelVersion>(`/models/${id}/versions`, {
    method: "POST",
    body: formData,
  });
}

export interface VersionArtifactPreview {
  artifacts: Array<{
    kind: string;
    path: string | null;
    url: string | null;
    previewable: boolean;
  }>;
}

export interface InitiateVersionUploadResponse {
  versionNumber: number;
  model: {
    objectKey: string;
    uploadId: string;
    chunkSize: number;
    urls: Array<{ partNumber: number; url: string }>;
  };
  scaler?: { objectKey: string; url: string };
  preprocess?: { objectKey: string; url: string };
  postprocess?: { objectKey: string; url: string };
}

export interface CompleteVersionUploadPayload {
  examplePayload?: string;
  expectedResult?: string;
  classLabels?: string;
  triggerBuild?: string;
  model: {
    objectKey: string;
    uploadId: string;
    parts: Array<{ partNumber: number; etag: string }>;
  };
  scaler?: { objectKey: string };
  preprocess?: { objectKey: string };
  postprocess?: { objectKey: string };
}

export interface OrganizationModelAnalytics {
  totals: {
    models: number;
    versions: number;
    pendingReviews: number;
    approvedVersions: number;
    declinedVersions: number;
    readyVersions: number;
    runningDeployments: number;
    totalEarnings: number;
    marketplaceVerified: number;
  };
  byUploader: Array<{ name: string; models: number; versions: number }>;
  recentVersions: Array<{
    modelId: string;
    modelName: string;
    versionId: string;
    versionNumber: number;
    status: string;
    reviewStatus: string;
    uploadedBy: string | null;
    reviewedBy: string | null;
    createdAt: string;
  }>;
  earningsHistory?: Array<{ name: string; Earnings: number }>;
}

export async function reviewModelVersion(
  versionId: string,
  decision: "approve" | "decline",
  comment?: string,
): Promise<ModelVersion> {
  return smartFetch<ModelVersion>(`/models/versions/${versionId}/review`, {
    method: "POST",
    body: JSON.stringify({ decision, comment }),
  });
}

export async function saveModelVersionTestCase(
  versionId: string,
  body: {
    name: string;
    payload: string;
    expectedResult?: string;
    notes?: string;
  },
): Promise<ModelVersionTestCase> {
  return smartFetch<ModelVersionTestCase>(
    `/models/versions/${versionId}/test-cases`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

export async function getModelVersionTestCases(
  versionId: string,
): Promise<ModelVersionTestCase[]> {
  return smartFetch<ModelVersionTestCase[]>(
    `/models/versions/${versionId}/test-cases`,
    {
      cache: "no-store",
    },
  );
}

export async function getModelVersionArtifacts(
  versionId: string,
): Promise<VersionArtifactPreview> {
  return smartFetch<VersionArtifactPreview>(
    `/models/versions/${versionId}/artifacts`,
    {
      cache: "no-store",
    },
  );
}

export async function getModelHistory(
  modelId: string,
): Promise<ModelVersionReviewEvent[]> {
  return smartFetch<ModelVersionReviewEvent[]>(`/models/${modelId}/history`, {
    cache: "no-store",
  });
}

export async function getOrganizationModelAnalytics(
  orgId: string,
): Promise<OrganizationModelAnalytics> {
  return smartFetch<OrganizationModelAnalytics>(
    `/models/organizations/${orgId}/analytics`,
    {
      cache: "no-store",
    },
  );
}

/**
 * Dispatches an inference prediction payload to the deployed instance.
 *
 * @param id - The model UUID.
 * @param parsedPayload - Dynamic input features dictionary.
 * @returns A promise resolving to the prediction results dictionary.
 */
export async function runPrediction(
  id: string,
  parsedPayload: unknown,
  versionNumber?: number,
): Promise<Record<string, unknown>> {
  const url = versionNumber
    ? `/models/${id}/v${versionNumber}/predict`
    : `/models/${id}/predict`;
  return smartFetch<Record<string, unknown>>(url, {
    method: "POST",
    body: JSON.stringify(parsedPayload),
  });
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRatePercent: number;
}

/**
 * Updates a model's response cache policy (enabled, TTL, cache-hit discount).
 *
 * @param id - The model UUID.
 * @param settings - Partial cache policy fields to update.
 * @returns A promise resolving to the updated Model.
 */
export async function updateCacheSettings(
  id: string,
  settings: {
    cacheEnabled?: boolean;
    cacheTtlSeconds?: number;
    cacheHitDiscountPercent?: number;
  },
): Promise<Model> {
  return smartFetch<Model>(`/models/${id}/cache-settings`, {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
}

/**
 * Fetches cache hit/miss counters for a model's response cache.
 *
 * @param id - The model UUID.
 * @returns A promise resolving to the cache stats.
 */
export async function getCacheStats(id: string): Promise<CacheStats> {
  return smartFetch<CacheStats>(`/models/${id}/cache-stats`, {
    cache: "no-store",
  });
}

/**
 * Updates a model's container network policy (outbound internet access for
 * future deployments).
 *
 * @param id - The model UUID.
 * @param allowEgress - Whether future deployments may reach the internet.
 * @returns A promise resolving to the updated Model.
 */
export async function updateNetworkSettings(
  id: string,
  allowEgress: boolean,
): Promise<Model> {
  return smartFetch<Model>(`/models/${id}/network-settings`, {
    method: "PATCH",
    body: JSON.stringify({ allowEgress }),
  });
}

/**
 * Updates a model's marketplace visibility (public/private).
 *
 * @param id - The model UUID.
 * @param isPublic - Whether the model should be listed in the public marketplace.
 * @returns A promise resolving to the updated Model.
 */
export async function updateVisibilitySettings(
  id: string,
  isPublic: boolean,
): Promise<Model> {
  return smartFetch<Model>(`/models/${id}/visibility-settings`, {
    method: "PATCH",
    body: JSON.stringify({ isPublic }),
  });
}

/**
 * Deletes a registered machine learning model and cleans up versions.
 *
 * @param id - The model UUID.
 * @returns A promise resolving to a success boolean indicator object.
 */
export async function deleteModel(id: string): Promise<{ success: boolean }> {
  return smartFetch<{ success: boolean }>(`/models/${id}`, {
    method: "DELETE",
  });
}

/**
 * Deletes a specific model version iteration and cleans up stored files.
 *
 * @param versionId - The model version UUID.
 * @returns A promise resolving to a success boolean indicator object.
 */
export async function deleteModelVersion(
  versionId: string,
): Promise<{ success: boolean }> {
  return smartFetch<{ success: boolean }>(`/models/versions/${versionId}`, {
    method: "DELETE",
  });
}

/**
 * Fetches recent prediction logs made by the logged-in consumer user.
 *
 * @returns A promise resolving to an array of ModelLog instances.
 */
export async function getConsumerLogs(): Promise<ModelLog[]> {
  return smartFetch<ModelLog[]>("/models/logs/consumer", {
    cache: "no-store",
  });
}

/**
 * Fetches recent prediction logs served by the provider user's models.
 *
 * @returns A promise resolving to an array of ModelLog instances.
 */
export async function getProviderLogs(): Promise<ModelLog[]> {
  return smartFetch<ModelLog[]>("/models/logs/provider", {
    cache: "no-store",
  });
}

/**
 * Fetches aggregated provider analytics for the dashboard decision-support view.
 *
 * @param days - Lookback window in days.
 * @returns Provider performance insights and earnings breakdowns.
 */
export async function getProviderInsights(
  days: number = 30,
): Promise<ProviderInsights> {
  return smartFetch<ProviderInsights>(
    `/models/logs/provider/insights?days=${days}`,
    {
      cache: "no-store",
    },
  );
}

export interface DetectedSchema {
  framework: string;
  task: string;
  confidence: number;
  inputs: unknown[];
  outputs: unknown[];
  warnings: string[];
  example_payload: string;
  expected_result: string;
}

/**
 * Optional postprocessing script to apply to the synthetic expected-result
 * sample during detection, so `expected_result` reflects what callers
 * actually receive after post-processing rather than the raw model output.
 */
export interface PostprocessSource {
  file?: File | null;
  code?: string;
}

/**
 * Sends a model file to the backend to auto-detect its framework, task type, inputs, outputs,
 * and generate example payloads and expected result templates. When `postprocess` is given, the
 * backend also runs that script's `postprocess(prediction)` function against the synthetic
 * expected-result sample, matching the same script serve.py runs at inference time.
 *
 * @param file - The model file binary.
 * @param modelType - Optional model type hint (e.g. "LLM_GGUF") used to steer detection.
 * @param postprocess - Optional postprocessing script (uploaded file or inline code).
 * @returns A promise resolving to the detected schema details.
 */
export async function detectSchema(
  file: File,
  modelType?: string,
  postprocess?: PostprocessSource,
): Promise<DetectedSchema> {
  if (file.name.toLowerCase().endsWith(".gguf") || modelType === "LLM_GGUF") {
    return {
      framework: "gguf",
      task: "llm_gguf",
      confidence: 1.0,
      inputs: [],
      outputs: [],
      warnings: [],
      example_payload: JSON.stringify(
        {
          messages: [{ role: "user", content: "Hello, how are you?" }],
          temperature: 0.7,
          max_tokens: 128,
          stream: false,
        },
        null,
        2,
      ),
      expected_result: JSON.stringify(
        {
          choices: [
            {
              message: {
                role: "assistant",
                content:
                  "Hello! I'm an AI assistant. How can I help you today?",
              },
            },
          ],
        },
        null,
        2,
      ),
    };
  }

  if (file.size > LARGE_MODEL_SCHEMA_DETECTION_THRESHOLD_BYTES) {
    throw new Error(
      "This file is too large for instant schema detection. It will be automatically detected in the background during compilation.",
    );
  }

  const formData = new FormData();
  formData.append("model", file);
  if (modelType) {
    formData.append("modelType", modelType);
  }
  // Always pass the original filename so the Python script can use filename heuristics
  formData.append("originalFilename", file.name);
  if (postprocess?.file) {
    formData.append("postprocess", postprocess.file);
  } else if (postprocess?.code?.trim()) {
    formData.append("postprocessCode", postprocess.code);
  }
  return smartFetch<DetectedSchema>("/models/detect-schema", {
    method: "POST",
    body: formData,
  });
}

/**
 * Triggers the actual container build pipeline for a previously uploaded draft model version,
 * sending the finalized request/response schema.
 *
 * @param versionId - The UUID of the model version.
 * @param examplePayload - Finalized request payload string.
 * @param expectedResult - Finalized expected response string.
 * @returns A promise resolving to the updated ModelVersion.
 */
export async function buildModelVersion(
  versionId: string,
  examplePayload?: string,
  expectedResult?: string,
): Promise<ModelVersion> {
  const body: Record<string, string> = {};
  if (examplePayload !== undefined) body.examplePayload = examplePayload;
  if (expectedResult !== undefined) body.expectedResult = expectedResult;
  return smartFetch<ModelVersion>(`/models/versions/${versionId}/build`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Confirms (and optionally corrects) a model version's auto-detected or
 * pending example payload/expected result schema.
 *
 * @param versionId - The UUID of the model version to confirm.
 * @param examplePayload - Optional replacement sample request JSON.
 * @param expectedResult - Optional replacement sample response JSON.
 * @returns A promise resolving to the updated ModelVersion.
 */
export async function confirmSchemaDetection(
  versionId: string,
  examplePayload?: string,
  expectedResult?: string,
): Promise<ModelVersion> {
  const body: Record<string, string> = {};
  if (examplePayload !== undefined) body.examplePayload = examplePayload;
  if (expectedResult !== undefined) body.expectedResult = expectedResult;
  return smartFetch<ModelVersion>(
    `/models/versions/${versionId}/confirm-schema`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

/**
 * Deprecates a model version, terminating any container running for it.
 */
export async function deprecateModelVersion(
  versionId: string,
): Promise<ModelVersion> {
  return smartFetch<ModelVersion>(`/models/versions/${versionId}/deprecate`, {
    method: "POST",
  });
}

/**
 * Undeprecates a model version, returning it to ready status.
 */
export async function undeprecateModelVersion(
  versionId: string,
): Promise<ModelVersion> {
  return smartFetch<ModelVersion>(`/models/versions/${versionId}/undeprecate`, {
    method: "POST",
  });
}

export async function initiateVersionUpload(
  modelId: string,
  data: {
    modelFilename: string;
    modelSize: number;
    scalerFilename?: string;
    preprocessFilename?: string;
    postprocessFilename?: string;
  },
): Promise<InitiateVersionUploadResponse> {
  return smartFetch<InitiateVersionUploadResponse>(
    `/models/${modelId}/versions/upload-initiate`,
    {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

export async function completeVersionUpload(
  modelId: string,
  data: CompleteVersionUploadPayload,
): Promise<ModelVersion> {
  return smartFetch<ModelVersion>(
    `/models/${modelId}/versions/upload-complete`,
    {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * Aborts an in-progress multipart upload session for a model version,
 * releasing the orphaned storage-side upload state. Should be called when an
 * upload fails or is cancelled after initiation but before completion.
 *
 * @param modelId - The parent model UUID.
 * @param objectKey - The storage object key returned by {@link initiateVersionUpload}.
 * @param uploadId - The multipart upload session ID returned by {@link initiateVersionUpload}.
 * @returns A promise resolving to a success confirmation.
 */
export async function abortVersionUpload(
  modelId: string,
  objectKey: string,
  uploadId: string,
): Promise<{ success: boolean }> {
  return smartFetch<{ success: boolean }>(
    `/models/${modelId}/versions/upload-abort`,
    {
      method: "DELETE",
      body: JSON.stringify({ objectKey, uploadId }),
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}
