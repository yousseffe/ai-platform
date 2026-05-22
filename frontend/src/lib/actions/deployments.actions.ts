"use server";

import { smartFetch } from "@/lib/utils/smart-fetch";
import { revalidatePath } from "next/cache";

/**
 * Initiates the deployment of a specific model version to production or staging.
 * Automatically revalidates associated Next.js pages after triggering the deployment.
 *
 * @param versionId - The unique database ID of the model version to deploy.
 * @param modelId - The parent model ID associated with this version, used for cache revalidation.
 * @returns A promise resolving to a discriminated union indicating success or error details.
 */
export async function deployVersion(
  versionId: string,
  modelId: string
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  try {
    const res = await smartFetch(`/deployments/version/${versionId}`, {
      method: "POST",
    });
    revalidatePath(`/models/${modelId}`);
    revalidatePath("/models");
    revalidatePath("/");
    return { success: true, data: res };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to start deployment";
    return { success: false, error: errorMessage };
  }
}

/**
 * Stops an active model version deployment on the server.
 * Automatically revalidates associated Next.js pages after stopping the deployment.
 *
 * @param deploymentId - The unique database ID of the active deployment to stop.
 * @param modelId - The parent model ID associated with the deployment, used for cache revalidation.
 * @returns A promise resolving to a discriminated union indicating success or error details.
 */
export async function stopDeployment(
  deploymentId: string,
  modelId: string
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  try {
    const res = await smartFetch(`/deployments/${deploymentId}/stop`, {
      method: "POST",
    });
    revalidatePath(`/models/${modelId}`);
    revalidatePath("/models");
    revalidatePath("/");
    return { success: true, data: res };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to stop deployment";
    return { success: false, error: errorMessage };
  }
}
