import { PipelineRunStatus } from "@/types";

/**
 * Determines whether a pipeline run is still in flight and worth polling for.
 *
 * @param status - The run's current status.
 * @returns True if the run is `PENDING` or `RUNNING`.
 */
export function isPipelineRunTransient(status: PipelineRunStatus): boolean {
  return status === PipelineRunStatus.PENDING || status === PipelineRunStatus.RUNNING;
}
