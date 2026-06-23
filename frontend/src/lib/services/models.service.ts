import { smartFetch } from "@/lib/utils/smart-fetch";
import { Model, ModelVersion, ModelLog } from "@/types";

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
export async function createModel(name: string, description: string, isPublic: boolean = false): Promise<Model> {
  return smartFetch<Model>("/models", {
    method: "POST",
    body: JSON.stringify({ name, description, isPublic }),
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

/**
 * Dispatches an inference prediction payload to the deployed instance.
 *
 * @param id - The model UUID.
 * @param parsedPayload - Dynamic input features dictionary.
 * @returns A promise resolving to the prediction results dictionary.
 */
export async function runPrediction(
  id: string,
  parsedPayload: unknown
): Promise<Record<string, unknown>> {
  return smartFetch<Record<string, unknown>>(`/models/${id}/predict`, {
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
