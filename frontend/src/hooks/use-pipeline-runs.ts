"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { triggerPipelineRun } from "@/lib/actions/pipelines.actions";
import { PipelineRun } from "@/types";
import { isPipelineRunTransient } from "@/lib/utils/pipelines";

/**
 * Custom hook managing run-triggering and live status polling for a
 * pipeline's execution history. Polls the server every 3 seconds via
 * `router.refresh()` while any run is still PENDING/RUNNING, matching the
 * deployment-status polling pattern used on the model details page.
 *
 * @param pipelineId - The UUID of the pipeline whose runs are tracked.
 * @param runs - The latest run history, passed down from the server component.
 * @returns Submission/error state and the run-triggering handler.
 */
export function usePipelineRuns(pipelineId: string, runs: PipelineRun[]) {
  const router = useRouter();
  const [isTriggering, setIsTriggering] = useState(false);
  const [error, setError] = useState("");

  /**
   * Parses the submitted JSON input and triggers a background pipeline run.
   *
   * @param inputJson - The raw JSON string entered by the user.
   */
  const handleTriggerRun = async (inputJson: string) => {
    setError("");
    setIsTriggering(true);
    try {
      const input = JSON.parse(inputJson) as Record<string, unknown>;
      const res = await triggerPipelineRun(pipelineId, input);
      if (!res.success) {
        setError(res.error);
        return false;
      }
      router.refresh();
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to trigger pipeline run");
      return false;
    } finally {
      setIsTriggering(false);
    }
  };

  useEffect(() => {
    const hasTransientRun = runs.some((run) => isPipelineRunTransient(run.status));
    if (!hasTransientRun) return;

    const interval = setInterval(() => {
      router.refresh();
    }, 3000);

    return () => clearInterval(interval);
  }, [runs, router]);

  return { isTriggering, error, handleTriggerRun };
}
