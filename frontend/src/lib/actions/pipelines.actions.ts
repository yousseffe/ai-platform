"use server";

import * as pipelinesService from "@/lib/services/pipelines.service";
import { Pipeline, PipelineStep, PipelineEdge, PipelineRun, PipelineType } from "@/types";
import { revalidatePath } from "next/cache";

/**
 * Retrieves all pipelines owned by the authenticated user.
 *
 * @returns A promise resolving to an array of Pipeline instances. Returns empty array on failure.
 */
export async function getPipelines(): Promise<Pipeline[]> {
  try {
    return await pipelinesService.getPipelines();
  } catch (error) {
    console.error("getPipelines error:", error);
    return [];
  }
}

/**
 * Retrieves a single pipeline's full configuration.
 *
 * @param id - The pipeline UUID.
 * @returns A promise resolving to the Pipeline, or null if not found or an error occurs.
 */
export async function getPipeline(id: string): Promise<Pipeline | null> {
  try {
    return await pipelinesService.getPipeline(id);
  } catch (error) {
    console.error(`getPipeline error for ${id}:`, error);
    return null;
  }
}

/**
 * Retrieves every publicly-listed, runnable pipeline for the marketplace
 * catalog — no authentication required.
 *
 * @returns A promise resolving to an array of Pipeline instances. Returns empty array on failure.
 */
export async function getPublicPipelines(): Promise<Pipeline[]> {
  try {
    return await pipelinesService.getPublicPipelines();
  } catch (error) {
    console.error("getPublicPipelines error:", error);
    return [];
  }
}

/**
 * Retrieves a single publicly-listed pipeline by ID — no authentication required.
 * Returns null if the pipeline does not exist or is not public.
 *
 * @param id - The pipeline UUID.
 * @returns A promise resolving to the Pipeline or null.
 */
export async function getPublicPipelineById(id: string): Promise<Pipeline | null> {
  try {
    return await pipelinesService.getPublicPipelineById(id);
  } catch (error) {
    console.error(`getPublicPipelineById error for ${id}:`, error);
    return null;
  }
}

/**
 * Creates a new, empty pipeline in DRAFT status.
 *
 * @param name - The pipeline's display name.
 * @param description - Optional long-form explanation of what it does.
 * @param type - The UI preset for the pipeline's intended shape.
 * @returns A promise resolving to a discriminated union containing the created Pipeline or an error.
 */
export async function createPipeline(
  name: string,
  description?: string,
  type?: PipelineType
): Promise<{ success: true; data: Pipeline } | { success: false; error: string }> {
  try {
    const res = await pipelinesService.createPipeline(name, description, type);
    revalidatePath("/pipelines");
    return { success: true, data: res };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create pipeline";
    return { success: false, error: errorMessage };
  }
}

/**
 * Edits a pipeline's name/description/type.
 *
 * @param id - The pipeline UUID.
 * @param body - The fields to update.
 * @returns A promise resolving to a discriminated union containing the updated Pipeline or an error.
 */
export async function updatePipeline(
  id: string,
  body: { name?: string; description?: string; type?: PipelineType; isPublic?: boolean }
): Promise<{ success: true; data: Pipeline } | { success: false; error: string }> {
  try {
    const res = await pipelinesService.updatePipeline(id, body);
    revalidatePath(`/pipelines/${id}`);
    revalidatePath("/pipelines");
    return { success: true, data: res };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update pipeline";
    return { success: false, error: errorMessage };
  }
}

/**
 * Deletes a pipeline and all its steps/edges/runs.
 *
 * @param id - The pipeline UUID.
 * @returns A promise resolving to a discriminated union success indicator.
 */
export async function deletePipeline(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await pipelinesService.deletePipeline(id);
    revalidatePath("/pipelines");
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete pipeline";
    return { success: false, error: errorMessage };
  }
}

/**
 * Validates a pipeline's structure and marks it runnable.
 *
 * @param id - The pipeline UUID.
 * @returns A promise resolving to a discriminated union containing the updated Pipeline or an error.
 */
export async function validatePipeline(
  id: string
): Promise<{ success: true; data: Pipeline } | { success: false; error: string }> {
  try {
    const res = await pipelinesService.validatePipeline(id);
    revalidatePath(`/pipelines/${id}`);
    return { success: true, data: res };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to validate pipeline";
    return { success: false, error: errorMessage };
  }
}

/**
 * Adds a step to a pipeline, binding it to an existing READY model version.
 *
 * @param pipelineId - The parent pipeline UUID.
 * @param body - The step's order, model version, and optional config.
 * @returns A promise resolving to a discriminated union containing the created PipelineStep or an error.
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
): Promise<{ success: true; data: PipelineStep } | { success: false; error: string }> {
  try {
    const res = await pipelinesService.addPipelineStep(pipelineId, body);
    revalidatePath(`/pipelines/${pipelineId}`);
    return { success: true, data: res };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to add step";
    return { success: false, error: errorMessage };
  }
}

/**
 * Removes a step from a pipeline.
 *
 * @param pipelineId - The parent pipeline UUID.
 * @param stepId - The step UUID.
 * @returns A promise resolving to a discriminated union success indicator.
 */
export async function removePipelineStep(
  pipelineId: string,
  stepId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await pipelinesService.removePipelineStep(pipelineId, stepId);
    revalidatePath(`/pipelines/${pipelineId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to remove step";
    return { success: false, error: errorMessage };
  }
}

/**
 * Lists all edges (mappers) defined for a pipeline.
 *
 * @param pipelineId - The pipeline UUID.
 * @returns A promise resolving to an array of PipelineEdge instances. Returns empty array on failure.
 */
export async function listPipelineEdges(pipelineId: string): Promise<PipelineEdge[]> {
  try {
    return await pipelinesService.listPipelineEdges(pipelineId);
  } catch (error) {
    console.error(`listPipelineEdges error for ${pipelineId}:`, error);
    return [];
  }
}

/**
 * Creates or replaces the mapper edge for a given from/to step pair.
 *
 * @param pipelineId - The pipeline UUID.
 * @param body - The from/to step IDs and the mapper spec.
 * @returns A promise resolving to a discriminated union containing the created/updated PipelineEdge or an error.
 */
export async function upsertPipelineEdge(
  pipelineId: string,
  body: { fromStepId?: string; toStepId?: string; spec: { rules: unknown[] } }
): Promise<{ success: true; data: PipelineEdge } | { success: false; error: string }> {
  try {
    const res = await pipelinesService.upsertPipelineEdge(pipelineId, body);
    revalidatePath(`/pipelines/${pipelineId}`);
    return { success: true, data: res };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to save edge mapper";
    return { success: false, error: errorMessage };
  }
}

/**
 * Deletes an edge by ID.
 *
 * @param pipelineId - The parent pipeline UUID.
 * @param edgeId - The edge UUID.
 * @returns A promise resolving to a discriminated union success indicator.
 */
export async function removePipelineEdge(
  pipelineId: string,
  edgeId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await pipelinesService.removePipelineEdge(pipelineId, edgeId);
    revalidatePath(`/pipelines/${pipelineId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to remove edge";
    return { success: false, error: errorMessage };
  }
}

/**
 * Triggers a background run of a VALIDATED pipeline.
 *
 * @param id - The pipeline UUID.
 * @param input - The raw JSON payload to feed into the pipeline's first step.
 * @returns A promise resolving to a discriminated union containing the created PipelineRun or an error.
 */
export async function triggerPipelineRun(
  id: string,
  input: Record<string, unknown>
): Promise<{ success: true; data: PipelineRun } | { success: false; error: string }> {
  try {
    const res = await pipelinesService.triggerPipelineRun(id, input);
    revalidatePath(`/pipelines/${id}`);
    return { success: true, data: res };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to trigger run";
    return { success: false, error: errorMessage };
  }
}

/**
 * Lists recent runs for a pipeline, newest first.
 *
 * @param id - The pipeline UUID.
 * @returns A promise resolving to an array of PipelineRun instances. Returns empty array on failure.
 */
export async function listPipelineRuns(id: string): Promise<PipelineRun[]> {
  try {
    return await pipelinesService.listPipelineRuns(id);
  } catch (error) {
    console.error(`listPipelineRuns error for ${id}:`, error);
    return [];
  }
}

/**
 * Fetches a single run's status, output, and per-step results.
 *
 * @param runId - The run UUID.
 * @returns A promise resolving to the full PipelineRun, or null on failure.
 */
export async function getPipelineRun(runId: string): Promise<PipelineRun | null> {
  try {
    return await pipelinesService.getPipelineRun(runId);
  } catch (error) {
    console.error(`getPipelineRun error for ${runId}:`, error);
    return null;
  }
}
