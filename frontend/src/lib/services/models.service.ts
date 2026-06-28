import { smartFetch } from "@/lib/utils/smart-fetch";
import { Model, ModelVersion, ModelLog, ModelVersionReviewEvent, ModelVersionTestCase } from "@/types";

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
  taskType?: string
): Promise<Model> {
  return smartFetch<Model>("/models", {
    method: "POST",
    body: JSON.stringify({ name, description, isPublic, type, framework, taskType }),
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

/**
 * Submits a new version's artifacts (weights and scripts) for build queueing.
 *
 * @param id - The parent model UUID.
 * @param formData - Envelope carrying the file binary streams and version strings.
 * @returns A promise resolving to the created ModelVersion instance.
 */
export async function uploadModelVersion(id: string, formData: FormData): Promise<ModelVersion> {
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
}

export async function reviewModelVersion(
  versionId: string,
  decision: "approve" | "decline",
  comment?: string
): Promise<ModelVersion> {
  return smartFetch<ModelVersion>(`/models/versions/${versionId}/review`, {
    method: "POST",
    body: JSON.stringify({ decision, comment }),
  });
}

export async function saveModelVersionTestCase(
  versionId: string,
  body: { name: string; payload: string; expectedResult?: string; notes?: string }
): Promise<ModelVersionTestCase> {
  return smartFetch<ModelVersionTestCase>(`/models/versions/${versionId}/test-cases`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getModelVersionTestCases(versionId: string): Promise<ModelVersionTestCase[]> {
  return smartFetch<ModelVersionTestCase[]>(`/models/versions/${versionId}/test-cases`, {
    cache: "no-store",
  });
}

export async function getModelVersionArtifacts(versionId: string): Promise<VersionArtifactPreview> {
  return smartFetch<VersionArtifactPreview>(`/models/versions/${versionId}/artifacts`, {
    cache: "no-store",
  });
}

export async function getModelHistory(modelId: string): Promise<ModelVersionReviewEvent[]> {
  return smartFetch<ModelVersionReviewEvent[]>(`/models/${modelId}/history`, {
    cache: "no-store",
  });
}

export async function getOrganizationModelAnalytics(orgId: string): Promise<OrganizationModelAnalytics> {
  return smartFetch<OrganizationModelAnalytics>(`/models/organizations/${orgId}/analytics`, {
    cache: "no-store",
  });
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
  versionNumber?: number
): Promise<Record<string, unknown>> {
  const url = versionNumber ? `/models/${id}/v${versionNumber}/predict` : `/models/${id}/predict`;
  return smartFetch<Record<string, unknown>>(url, {
    method: "POST",
    body: JSON.stringify(parsedPayload),
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
export async function deleteModelVersion(versionId: string): Promise<{ success: boolean }> {
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
 * Sends a model file to the backend to auto-detect its framework, task type, inputs, outputs,
 * and generate example payloads and expected result templates.
 *
 * @param file - The model file binary.
 * @returns A promise resolving to the detected schema details.
 */
export async function detectSchema(file: File, modelType?: string): Promise<DetectedSchema> {
  const formData = new FormData();
  formData.append("model", file);
  if (modelType) {
    formData.append("modelType", modelType);
  }
  // Always pass the original filename so the Python script can use filename heuristics
  formData.append("originalFilename", file.name);
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
 * Deprecates a model version, terminating any container running for it.
 */
export async function deprecateModelVersion(versionId: string): Promise<ModelVersion> {
  return smartFetch<ModelVersion>(`/models/versions/${versionId}/deprecate`, {
    method: "POST",
  });
}

/**
 * Undeprecates a model version, returning it to ready status.
 */
export async function undeprecateModelVersion(versionId: string): Promise<ModelVersion> {
  return smartFetch<ModelVersion>(`/models/versions/${versionId}/undeprecate`, {
    method: "POST",
  });
}
