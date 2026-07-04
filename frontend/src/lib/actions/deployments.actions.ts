"use server";

import * as deploymentsService from "@/lib/services/deployments.service";
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
    const res = await deploymentsService.deployVersion(versionId);
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
    const res = await deploymentsService.stopDeployment(deploymentId);
    revalidatePath(`/models/${modelId}`);
    revalidatePath("/models");
    revalidatePath("/");
    return { success: true, data: res };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to stop deployment";
    return { success: false, error: errorMessage };
  }
}

/**
 * Starts a canary deployment of a version alongside an already-RUNNING
 * deployment of a different version, splitting traffic by weight.
 *
 * @param versionId - The model version UUID to deploy as a canary.
 * @param trafficWeight - Share (0-100) of unpinned traffic this deployment should receive.
 * @param modelId - The parent model ID, used for cache revalidation.
 */
export async function deployCanaryVersion(
  versionId: string,
  trafficWeight: number,
  modelId: string
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  try {
    const res = await deploymentsService.deployCanaryVersion(versionId, trafficWeight);
    revalidatePath(`/models/${modelId}`);
    return { success: true, data: res };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to start canary deployment";
    return { success: false, error: errorMessage };
  }
}

/**
 * Updates the traffic-split weight of an existing deployment.
 *
 * @param deploymentId - The deployment UUID.
 * @param trafficWeight - New weight (0-100).
 * @param modelId - The parent model ID, used for cache revalidation.
 */
export async function updateTrafficWeight(
  deploymentId: string,
  trafficWeight: number,
  modelId: string
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  try {
    const res = await deploymentsService.updateTrafficWeight(deploymentId, trafficWeight);
    revalidatePath(`/models/${modelId}`);
    return { success: true, data: res };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update traffic weight";
    return { success: false, error: errorMessage };
  }
}

/**
 * Promotes a deployment to 100% of its model's unpinned traffic, stopping
 * every other RUNNING deployment for the same model.
 *
 * @param deploymentId - The deployment UUID to promote.
 * @param modelId - The parent model ID, used for cache revalidation.
 */
export async function promoteDeployment(
  deploymentId: string,
  modelId: string
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  try {
    const res = await deploymentsService.promoteDeployment(deploymentId);
    revalidatePath(`/models/${modelId}`);
    return { success: true, data: res };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to promote deployment";
    return { success: false, error: errorMessage };
  }
}
