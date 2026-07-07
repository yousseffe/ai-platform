"use server";

import * as modelsService from "@/lib/services/models.service";
import * as searchService from "@/lib/services/search.service";
import {
  Model,
  ModelVersion,
  ModelLog,
  ProviderInsights,
  SearchResult,
  SearchParams,
  ModelIntegrationSpec,
} from "@/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const INTEGRATION_SPEC_NOT_READY_MESSAGE =
  "Model has no ready version with an integration sample yet";

function isIntegrationSpecNotReady(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes(INTEGRATION_SPEC_NOT_READY_MESSAGE)
  );
}

/**
 * Retrieves all registered ML models from the database.
 * Bypasses intermediate cache layers to fetch the fresh list of models.
 *
 * @returns A promise resolving to an array of Model instances. Returns empty array if operation fails.
 */
export async function getModels(): Promise<Model[]> {
  try {
    return await modelsService.getModels();
  } catch (error) {
    console.error("getModels error:", error);
    return [];
  }
}

/**
 * Retrieves the complete details of a specific ML model by its ID.
 * Bypasses caching to ensure up-to-date configuration, tags, and deployment statuses.
 *
 * @param id - The unique database ID of the model.
 * @returns A promise resolving to the Model object, or null if the model is not found or an error occurs.
 */
export async function getModel(id: string): Promise<Model | null> {
  try {
    return await modelsService.getModel(id);
  } catch (error) {
    console.error(`getModel error for ${id}:`, error);
    return null;
  }
}

/**
 * Registers a new ML model container with name, metadata, and visibility.
 * Automatically triggers validation path cache updates for Next.js routing.
 *
 * @param name - The name of the machine learning model.
 * @param description - A summary of the model's domain and deployment purpose.
 * @param isPublic - Visibility flag indicating whether this model is public in the marketplace.
 * @returns A promise resolving to a discriminated union containing either the newly created Model details or the error.
 */
export async function createModel(
  name: string,
  description: string,
  isPublic: boolean = false,
  type?: string,
  framework?: string,
  taskType?: string,
): Promise<{ success: true; data: Model } | { success: false; error: string }> {
  try {
    const res = await modelsService.createModel(
      name,
      description,
      isPublic,
      type,
      framework,
      taskType,
    );
    revalidatePath("/models");
    revalidatePath("/marketplace");
    revalidatePath("/");
    return { success: true, data: res };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create model";
    return { success: false, error: errorMessage };
  }
}

/**
 * Retrieves all public ML models for the marketplace catalog.
 *
 * @returns A promise resolving to an array of public Model instances.
 */
export async function getPublicModels(): Promise<Model[]> {
  try {
    return await modelsService.getPublicModels();
  } catch (error) {
    console.error("getPublicModels error:", error);
    return [];
  }
}

/**
 * Retrieves a single public ML model by ID — no authentication required.
 * Returns null if the model does not exist or is not public.
 *
 * @param id - The unique database ID of the model.
 * @returns A promise resolving to the Model or null.
 */
export async function getPublicModelById(id: string): Promise<Model | null> {
  try {
    return await modelsService.getPublicModelById(id);
  } catch (error) {
    console.error(`getPublicModelById error for ${id}:`, error);
    return null;
  }
}

export async function getModelIntegrationSpec(
  id: string,
): Promise<ModelIntegrationSpec | null> {
  try {
    return await modelsService.getModelIntegrationSpec(id);
  } catch (error) {
    if (isIntegrationSpecNotReady(error)) {
      return null;
    }

    console.error(`getModelIntegrationSpec error for ${id}:`, error);
    return null;
  }
}

/**
 * Uploads a raw model weight artifact/file version for an existing model.
 * Triggers Next.js build-path cache invalidations to update listing views.
 *
 * @param id - The parent model ID.
 * @param formData - The FormData envelope containing file binary streams and version strings.
 * @returns A promise resolving to a discriminated union indicating success with the created model version info, or failure.
 */
export async function uploadModelVersion(
  id: string,
  formData: FormData,
): Promise<
  { success: true; data: ModelVersion } | { success: false; error: string }
> {
  try {
    const res = await modelsService.uploadModelVersion(id, formData);
    revalidatePath(`/models/${id}`);
    revalidatePath("/models");
    revalidatePath("/");
    return { success: true, data: res };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload model version";
    return { success: false, error: errorMessage };
  }
}

/**
 * Dispatches an inference prediction request against a deployed model instance.
 *
 * @param id - The unique database ID of the model.
 * @param parsedPayload - The dynamic JSON record holding inputs required by the model.
 * @returns A promise resolving to a discriminated union containing the raw prediction output structure or an error message.
 */
export async function runPrediction(
  id: string,
  parsedPayload: unknown,
  versionNumber?: number,
): Promise<
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string }
> {
  try {
    const res = await modelsService.runPrediction(
      id,
      parsedPayload,
      versionNumber,
    );
    return { success: true, data: res };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Prediction request failed";
    return { success: false, error: errorMessage };
  }
}

/**
 * Deletes a registered machine learning model and all associated versions/deployments.
 * Updates next cache to refresh list views.
 *
 * @param id - The model UUID.
 * @returns A promise resolving to a success indicator or error message.
 */
export async function deleteModel(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await modelsService.deleteModel(id);
    revalidatePath("/models");
    revalidatePath("/");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete model";
    return { success: false, error: errorMessage };
  }
  redirect("/models");
}

/**
 * Deletes a specific model version iteration and cleans up its storage files.
 *
 * @param id - The parent model UUID (for path revalidation).
 * @param versionId - The model version UUID.
 * @returns A promise resolving to a success indicator or error message.
 */
export async function deleteModelVersion(
  id: string,
  versionId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await modelsService.deleteModelVersion(versionId);
    revalidatePath(`/models/${id}`);
    revalidatePath("/models");
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete version";
    return { success: false, error: errorMessage };
  }
}

/**
 * Executes a smart full-text search against the OpenSearch-backed model catalog.
 * Supports fuzzy matching, field boosting, exact enum filters, and faceted aggregations.
 *
 * @param params - Search parameters including query text, enum filters, and pagination.
 * @returns A promise resolving to ranked search results with pagination metadata and facets.
 */
export async function searchModels(
  params: SearchParams,
): Promise<SearchResult | null> {
  try {
    return await searchService.searchModels(params);
  } catch (error) {
    console.error("searchModels error:", error);
    return null;
  }
}

/**
 * Server action to retrieve recent prediction logs made by the consumer.
 */
export async function getConsumerLogs(): Promise<ModelLog[]> {
  try {
    return await modelsService.getConsumerLogs();
  } catch (error) {
    console.error("getConsumerLogs error:", error);
    return [];
  }
}

/**
 * Server action to retrieve recent prediction logs served by the provider's models.
 */
export async function getProviderLogs(): Promise<ModelLog[]> {
  try {
    return await modelsService.getProviderLogs();
  } catch (error) {
    console.error("getProviderLogs error:", error);
    return [];
  }
}

/**
 * Server action to retrieve provider earnings and performance analytics.
 */
export async function getProviderInsights(
  days: number = 30,
): Promise<ProviderInsights | null> {
  try {
    return await modelsService.getProviderInsights(days);
  } catch (error) {
    console.error("getProviderInsights error:", error);
    return null;
  }
}

/**
 * Triggers the rebuild of a failed model version.
 *
 * @param modelId - The parent model UUID.
 * @param versionId - The model version UUID.
 * @returns A promise resolving to a success indicator or error message.
 */
export async function rebuildModelVersion(
  modelId: string,
  versionId: string,
): Promise<
  { success: true; data: ModelVersion } | { success: false; error: string }
> {
  try {
    const res = await modelsService.buildModelVersion(versionId);
    revalidatePath(`/models/${modelId}`);
    revalidatePath("/models");
    return { success: true, data: res };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to rebuild version";
    return { success: false, error: errorMessage };
  }
}

/**
 * Deprecates a model version.
 *
 * @param modelId - The parent model UUID.
 * @param versionId - The model version UUID.
 */
export async function deprecateModelVersion(
  modelId: string,
  versionId: string,
): Promise<
  { success: true; data: ModelVersion } | { success: false; error: string }
> {
  try {
    const res = await modelsService.deprecateModelVersion(versionId);
    revalidatePath(`/models/${modelId}`);
    revalidatePath("/models");
    return { success: true, data: res };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to deprecate version";
    return { success: false, error: errorMessage };
  }
}

/**
 * Undeprecates (re-enables) a model version.
 *
 * @param modelId - The parent model UUID.
 * @param versionId - The model version UUID.
 */
export async function undeprecateModelVersion(
  modelId: string,
  versionId: string,
): Promise<
  { success: true; data: ModelVersion } | { success: false; error: string }
> {
  try {
    const res = await modelsService.undeprecateModelVersion(versionId);
    revalidatePath(`/models/${modelId}`);
    revalidatePath("/models");
    return { success: true, data: res };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to activate version";
    return { success: false, error: errorMessage };
  }
}

/**
 * Updates a model's response cache policy (enabled, TTL, cache-hit discount).
 *
 * @param modelId - The model UUID.
 * @param settings - Partial cache policy fields to update.
 * @returns A promise resolving to a discriminated union with the updated Model or an error.
 */
export async function updateCacheSettings(
  modelId: string,
  settings: {
    cacheEnabled?: boolean;
    cacheTtlSeconds?: number;
    cacheHitDiscountPercent?: number;
  },
): Promise<{ success: true; data: Model } | { success: false; error: string }> {
  try {
    const res = await modelsService.updateCacheSettings(modelId, settings);
    revalidatePath(`/models/${modelId}`);
    return { success: true, data: res };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update cache settings";
    return { success: false, error: errorMessage };
  }
}

/**
 * Retrieves cache hit/miss counters for a model's response cache.
 *
 * @param modelId - The model UUID.
 * @returns A promise resolving to the cache stats, or null on failure.
 */
export async function getCacheStats(
  modelId: string,
): Promise<modelsService.CacheStats | null> {
  try {
    return await modelsService.getCacheStats(modelId);
  } catch (error) {
    console.error(`getCacheStats error for ${modelId}:`, error);
    return null;
  }
}

/**
 * Updates a model's container network policy (outbound internet access for
 * future deployments).
 *
 * @param modelId - The model UUID.
 * @param allowEgress - Whether future deployments may reach the internet.
 * @returns A promise resolving to a discriminated union with the updated Model or an error.
 */
export async function updateNetworkSettings(
  modelId: string,
  allowEgress: boolean,
): Promise<{ success: true; data: Model } | { success: false; error: string }> {
  try {
    const res = await modelsService.updateNetworkSettings(modelId, allowEgress);
    revalidatePath(`/models/${modelId}`);
    return { success: true, data: res };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update network settings";
    return { success: false, error: errorMessage };
  }
}

/**
 * Server action wrapper to update a model's marketplace visibility.
 *
 * @param modelId - The model UUID.
 * @param isPublic - Whether the model should be listed in the public marketplace.
 * @returns A promise resolving to a discriminated union with the updated Model or an error.
 */
export async function updateVisibilitySettings(
  modelId: string,
  isPublic: boolean,
): Promise<{ success: true; data: Model } | { success: false; error: string }> {
  try {
    const res = await modelsService.updateVisibilitySettings(modelId, isPublic);
    revalidatePath(`/models/${modelId}`);
    return { success: true, data: res };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to update visibility settings";
    return { success: false, error: errorMessage };
  }
}
