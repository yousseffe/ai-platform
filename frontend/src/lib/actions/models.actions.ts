"use server";

import { smartFetch } from "@/lib/utils/smart-fetch";
import { Model, ModelVersion } from "@/types";
import { revalidatePath } from "next/cache";

/**
 * Retrieves all registered ML models from the database.
 * Bypasses intermediate cache layers to fetch the fresh list of models.
 *
 * @returns A promise resolving to an array of Model instances. Returns empty array if operation fails.
 */
export async function getModels(): Promise<Model[]> {
  try {
    return await smartFetch<Model[]>("/models", {
      cache: "no-store",
    });
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
    return await smartFetch<Model>(`/models/${id}`, {
      cache: "no-store",
    });
  } catch (error) {
    console.error(`getModel error for ${id}:`, error);
    return null;
  }
}

/**
 * Registers a new ML model container with name and metadata.
 * Automatically triggers validation path cache updates for Next.js routing.
 *
 * @param name - The name of the machine learning model.
 * @param description - A summary of the model's domain and deployment purpose.
 * @returns A promise resolving to a discriminated union containing either the newly created Model details or the error.
 */
export async function createModel(
  name: string,
  description: string
): Promise<{ success: true; data: Model } | { success: false; error: string }> {
  try {
    const res = await smartFetch<Model>("/models", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
    revalidatePath("/models");
    revalidatePath("/");
    return { success: true, data: res };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create model";
    return { success: false, error: errorMessage };
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
  formData: FormData
): Promise<{ success: true; data: ModelVersion } | { success: false; error: string }> {
  try {
    const res = await smartFetch<ModelVersion>(`/models/${id}/versions`, {
      method: "POST",
      body: formData,
    });
    revalidatePath(`/models/${id}`);
    revalidatePath("/models");
    revalidatePath("/");
    return { success: true, data: res };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to upload model version";
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
  parsedPayload: unknown
): Promise<{ success: true; data: Record<string, unknown> } | { success: false; error: string }> {
  try {
    const res = await smartFetch<Record<string, unknown>>(`/models/${id}/predict`, {
      method: "POST",
      body: JSON.stringify(parsedPayload),
    });
    return { success: true, data: res };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Prediction request failed";
    return { success: false, error: errorMessage };
  }
}
