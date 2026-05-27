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
