/**
 * Payload interface for model container build queue jobs.
 */
export interface BuildJobPayload {
  /**
   * The unique UUID identifier representing the ModelVersion record to package.
   */
  versionId: string;
}

/**
 * Payload interface for model server deployment queue jobs.
 */
export interface DeployJobPayload {
  /**
   * The unique UUID identifier representing the Deployment record to configure.
   */
  deploymentId: string;
}
