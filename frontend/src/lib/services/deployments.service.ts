import { smartFetch } from "@/lib/utils/smart-fetch";

/**
 * Initiates the deployment of a specific model version container.
 *
 * @param versionId - The unique database ID of the model version.
 * @returns A promise resolving to the deployment result response data.
 */
export async function deployVersion(versionId: string): Promise<unknown> {
  return smartFetch<unknown>(`/deployments/version/${versionId}`, {
    method: "POST",
  });
}

/**
 * Stops an active deployment container running on the server.
 *
 * @param deploymentId - The unique database ID of the deployment.
 * @returns A promise resolving to the stop deployment action response.
 */
export async function stopDeployment(deploymentId: string): Promise<unknown> {
  return smartFetch<unknown>(`/deployments/${deploymentId}/stop`, {
    method: "POST",
  });
}

/**
 * Starts a canary deployment of a model version alongside an already-RUNNING
 * deployment of a different version, splitting unpinned prediction traffic
 * by weight instead of fully replacing it.
 *
 * @param versionId - The unique database ID of the model version.
 * @param trafficWeight - Share (0-100) of unpinned traffic this deployment should receive.
 * @returns A promise resolving to the created deployment.
 */
export async function deployCanaryVersion(
  versionId: string,
  trafficWeight: number
): Promise<unknown> {
  return smartFetch<unknown>(`/deployments/version/${versionId}`, {
    method: "POST",
    body: JSON.stringify({ trafficWeight }),
  });
}

/**
 * Updates the traffic-split weight of an existing deployment.
 *
 * @param deploymentId - The unique database ID of the deployment.
 * @param trafficWeight - New weight (0-100).
 * @returns A promise resolving to the updated deployment.
 */
export async function updateTrafficWeight(
  deploymentId: string,
  trafficWeight: number
): Promise<unknown> {
  return smartFetch<unknown>(`/deployments/${deploymentId}/traffic-weight`, {
    method: "PATCH",
    body: JSON.stringify({ trafficWeight }),
  });
}

/**
 * Promotes a deployment to 100% of its model's unpinned traffic, stopping
 * every other RUNNING deployment for the same model.
 *
 * @param deploymentId - The unique database ID of the deployment to promote.
 * @returns A promise resolving to the promoted deployment.
 */
export async function promoteDeployment(deploymentId: string): Promise<unknown> {
  return smartFetch<unknown>(`/deployments/${deploymentId}/promote`, {
    method: "POST",
  });
}
