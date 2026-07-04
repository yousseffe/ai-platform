"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addPipelineStep,
  removePipelineStep,
  upsertPipelineEdge,
  removePipelineEdge,
  validatePipeline,
  deletePipeline,
  updatePipeline,
} from "@/lib/actions/pipelines.actions";
import { CreateStepInput } from "@/lib/schemas";
import { MapperRule } from "@/types";

/**
 * Custom hook managing the editing operations for the Pipeline builder view:
 * adding/removing steps, creating/removing mapper edges, validating the
 * pipeline, and deleting it. Every mutation revalidates the server route and
 * refreshes the page so the parent server component re-fetches fresh data.
 *
 * @param pipelineId - The UUID of the pipeline being edited.
 * @returns Submission/error state and the editing action handlers.
 */
export function usePipelineBuilder(pipelineId: string) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  /**
   * Adds a step bound to the selected model version, either starting a new
   * stage or joining an existing one as a parallel branch.
   *
   * @param input - The validated step form values.
   * @param order - The 0-based stage index this step belongs to.
   */
  const handleAddStep = async (input: CreateStepInput, order: number) => {
    setError("");
    setIsSubmitting(true);
    try {
      const res = await addPipelineStep(pipelineId, {
        order,
        modelVersionId: input.modelVersionId,
        label: input.label,
        role: input.role,
        pinPolicy: input.pinPolicy,
        maxRetries: input.maxRetries,
      });
      if (!res.success) {
        setError(res.error);
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Removes a step from the pipeline.
   *
   * @param stepId - The UUID of the step to remove.
   */
  const handleRemoveStep = async (stepId: string) => {
    setError("");
    setIsSubmitting(true);
    try {
      const res = await removePipelineStep(pipelineId, stepId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Creates or replaces the mapper for a from/to step pair.
   *
   * @param fromStepId - UUID of the source step, or undefined for pipeline input.
   * @param toStepId - UUID of the destination step, or undefined for pipeline output.
   * @param spec - The structured mapper spec built by {@link MapperEdgeDialog}.
   */
  const handleUpsertEdge = async (
    fromStepId: string | undefined,
    toStepId: string | undefined,
    spec: { rules: MapperRule[] },
  ) => {
    setError("");
    setIsSubmitting(true);
    try {
      const res = await upsertPipelineEdge(pipelineId, { fromStepId, toStepId, spec });
      if (!res.success) {
        setError(res.error);
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Removes an edge from the pipeline.
   *
   * @param edgeId - The UUID of the edge to remove.
   */
  const handleRemoveEdge = async (edgeId: string) => {
    setError("");
    setIsSubmitting(true);
    try {
      const res = await removePipelineEdge(pipelineId, edgeId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Validates the pipeline's structure and marks it runnable.
   */
  const handleValidate = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      const res = await validatePipeline(pipelineId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Toggles whether the pipeline is listed in the public marketplace.
   *
   * @param isPublic - The new visibility state to persist.
   */
  const handleUpdateVisibility = async (isPublic: boolean) => {
    setError("");
    setIsSubmitting(true);
    try {
      const res = await updatePipeline(pipelineId, { isPublic });
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Deletes the pipeline and navigates back to the pipelines list.
   */
  const handleDeletePipeline = async () => {
    setError("");
    setIsSubmitting(true);
    try {
      const res = await deletePipeline(pipelineId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      router.push("/pipelines");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    error,
    handleAddStep,
    handleRemoveStep,
    handleUpsertEdge,
    handleRemoveEdge,
    handleValidate,
    handleUpdateVisibility,
    handleDeletePipeline,
  };
}
