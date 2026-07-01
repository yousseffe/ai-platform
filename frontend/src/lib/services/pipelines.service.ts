import { smartFetch } from "@/lib/utils/smart-fetch";
import { Pipeline, PipelineStep, PipelineEdge, PipelineRun, PipelineType } from "@/types";

/**
 * Fetches all pipelines owned by the authenticated user.
 *
 * @returns A promise resolving to an array of Pipeline instances.
 */
export async function getPipelines(): Promise<Pipeline[]> {
  return smartFetch<Pipeline[]>("/pipelines", {
    cache: "no-store",
  });
}

/**
 * Fetches a single pipeline with its steps and bound model versions.
 *
 * @param id - The pipeline UUID.
 * @returns A promise resolving to the Pipeline object.
 */
export async function getPipeline(id: string): Promise<Pipeline> {
  return smartFetch<Pipeline>(`/pipelines/${id}`, {
    cache: "no-store",
  });
}

/**
 * Creates a new, empty pipeline in DRAFT status.
 *
 * @param name - The pipeline's display name.
 * @param description - Optional long-form explanation of what it does.
 * @param type - The UI preset for the pipeline's intended shape. Defaults to a sequential chain.
 * @returns A promise resolving to the created Pipeline.
 */
export async function createPipeline(
  name: string,
  description?: string,
  type?: PipelineType
): Promise<Pipeline> {
  return smartFetch<Pipeline>("/pipelines", {
    method: "POST",
    body: JSON.stringify({ name, description, type }),
  });
}

/**
 * Edits a pipeline's name/description/type.
 *
 * @param id - The pipeline UUID.
 * @param body - The fields to update.
 * @returns A promise resolving to the updated Pipeline.
 */
export async function updatePipeline(
  id: string,
  body: { name?: string; description?: string; type?: PipelineType }
): Promise<Pipeline> {
  return smartFetch<Pipeline>(`/pipelines/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * Deletes a pipeline and all its steps/edges/runs.
 *
 * @param id - The pipeline UUID.
 * @returns A promise resolving to a success indicator.
 */
export async function deletePipeline(id: string): Promise<{ success: boolean }> {
  return smartFetch<{ success: boolean }>(`/pipelines/${id}`, {
    method: "DELETE",
  });
}

/**
 * Validates a pipeline's structure (every step bound to a READY model
 * version) and marks it VALIDATED so it can be run.
 *
 * @param id - The pipeline UUID.
 * @returns A promise resolving to the updated Pipeline.
 */
export async function validatePipeline(id: string): Promise<Pipeline> {
  return smartFetch<Pipeline>(`/pipelines/${id}/validate`, {
    method: "POST",
  });
}

/**
 * Adds a step to a pipeline, binding it to an existing READY model version.
 *
 * @param pipelineId - The parent pipeline UUID.
 * @param body - The step's order, model version, and optional config.
 * @returns A promise resolving to the created PipelineStep.
 */
export async function addPipelineStep(
  pipelineId: string,
  body: {
    order: number;
    modelVersionId: string;
    label?: string;
    role?: string;
    pinPolicy?: string;
    maxRetries?: number;
  }
): Promise<PipelineStep> {
  return smartFetch<PipelineStep>(`/pipelines/${pipelineId}/steps`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Edits an existing pipeline step.
 *
 * @param pipelineId - The parent pipeline UUID.
 * @param stepId - The step UUID.
 * @param body - The fields to update.
 * @returns A promise resolving to the updated PipelineStep.
 */
export async function updatePipelineStep(
  pipelineId: string,
  stepId: string,
  body: Partial<{
    order: number;
    modelVersionId: string;
    label: string;
    role: string;
    pinPolicy: string;
    maxRetries: number;
  }>
): Promise<PipelineStep> {
  return smartFetch<PipelineStep>(`/pipelines/${pipelineId}/steps/${stepId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * Removes a step from a pipeline.
 *
 * @param pipelineId - The parent pipeline UUID.
 * @param stepId - The step UUID.
 * @returns A promise resolving to a success indicator.
 */
export async function removePipelineStep(
  pipelineId: string,
  stepId: string
): Promise<{ success: boolean }> {
  return smartFetch<{ success: boolean }>(`/pipelines/${pipelineId}/steps/${stepId}`, {
    method: "DELETE",
  });
}

/**
 * Lists all edges (mappers) defined for a pipeline.
 *
 * @param pipelineId - The pipeline UUID.
 * @returns A promise resolving to an array of PipelineEdge instances.
 */
export async function listPipelineEdges(pipelineId: string): Promise<PipelineEdge[]> {
  return smartFetch<PipelineEdge[]>(`/pipelines/${pipelineId}/edges`, {
    cache: "no-store",
  });
}

/**
 * Creates or replaces the mapper edge for a given from/to step pair. Omit
 * either ID to represent the pipeline's external input/output.
 *
 * @param pipelineId - The pipeline UUID.
 * @param body - The from/to step IDs and the mapper spec.
 * @returns A promise resolving to the created/updated PipelineEdge.
 */
export async function upsertPipelineEdge(
  pipelineId: string,
  body: { fromStepId?: string; toStepId?: string; spec: { rules: unknown[] } }
): Promise<PipelineEdge> {
  return smartFetch<PipelineEdge>(`/pipelines/${pipelineId}/edges`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Deletes an edge by ID.
 *
 * @param pipelineId - The parent pipeline UUID.
 * @param edgeId - The edge UUID.
 * @returns A promise resolving to a success indicator.
 */
export async function removePipelineEdge(
  pipelineId: string,
  edgeId: string
): Promise<{ success: boolean }> {
  return smartFetch<{ success: boolean }>(`/pipelines/${pipelineId}/edges/${edgeId}`, {
    method: "DELETE",
  });
}

/**
 * Triggers a background run of a VALIDATED pipeline.
 *
 * @param id - The pipeline UUID.
 * @param input - The raw JSON payload to feed into the pipeline's first step.
 * @returns A promise resolving to the created (PENDING) PipelineRun.
 */
export async function triggerPipelineRun(
  id: string,
  input: Record<string, unknown>
): Promise<PipelineRun> {
  return smartFetch<PipelineRun>(`/pipelines/${id}/run`, {
    method: "POST",
    body: JSON.stringify({ input }),
  });
}

/**
 * Lists recent runs for a pipeline, newest first.
 *
 * @param id - The pipeline UUID.
 * @returns A promise resolving to an array of PipelineRun instances.
 */
export async function listPipelineRuns(id: string): Promise<PipelineRun[]> {
  return smartFetch<PipelineRun[]>(`/pipelines/${id}/runs`, {
    cache: "no-store",
  });
}

/**
 * Fetches a single run's status, output, and per-step results.
 *
 * @param runId - The run UUID.
 * @returns A promise resolving to the full PipelineRun, including step runs.
 */
export async function getPipelineRun(runId: string): Promise<PipelineRun> {
  return smartFetch<PipelineRun>(`/pipelines/runs/${runId}`, {
    cache: "no-store",
  });
}
