"use client";

import React from "react";
import { Pipeline, PipelineRun, PipelineEdge, PipelineStatus, PipelineType } from "@/types";
import { usePipelineBuilder } from "@/hooks/use-pipeline-builder";
import { usePipelineRuns } from "@/hooks/use-pipeline-runs";
import { Button } from "@/components/ui/button";
import { PipelineStepsPanel } from "@/components/pipelines/PipelineStepsPanel";
import { PipelineEdgesPanel } from "@/components/pipelines/PipelineEdgesPanel";
import { PipelineRunPanel } from "@/components/pipelines/PipelineRunPanel";

interface ReadyVersionOption {
  modelVersionId: string;
  label: string;
}

interface PipelineDetailsClientProps {
  pipeline: Pipeline;
  runs: PipelineRun[];
  edges: PipelineEdge[];
  readyVersionOptions: ReadyVersionOption[];
}

/** Short display label for each pipeline-type preset, for the header badge. */
const PIPELINE_TYPE_LABELS: Record<PipelineType, string> = {
  [PipelineType.SEQUENTIAL_CHAIN]: "Sequential",
  [PipelineType.CONTEXT_AUGMENTED]: "Context-Augmented",
  [PipelineType.PARALLEL]: "Parallel",
};

/**
 * Client orchestration component for the Pipeline builder/run view. Wires
 * the `usePipelineBuilder` and `usePipelineRuns` hooks to the steps, mappers,
 * and run panels, keeping this component itself focused on layout only.
 *
 * @param props - PipelineDetailsClient component properties.
 * @returns The React component rendering the pipeline builder page body.
 */
export function PipelineDetailsClient({ pipeline, runs, edges, readyVersionOptions }: PipelineDetailsClientProps) {
  const builder = usePipelineBuilder(pipeline.id);
  const runHook = usePipelineRuns(pipeline.id, runs);

  const steps = [...(pipeline.steps ?? [])].sort((a, b) => a.order - b.order);

  const handleDelete = () => {
    if (window.confirm(`Delete pipeline "${pipeline.name}"? This cannot be undone.`)) {
      builder.handleDeletePipeline();
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-foreground font-mono">{pipeline.name}</h1>
            <span className="px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-bold text-[10px] font-mono">
              {pipeline.status}
            </span>
            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border font-bold text-[10px] font-mono">
              v{pipeline.version}
            </span>
            <span className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border font-bold text-[10px] font-mono">
              {PIPELINE_TYPE_LABELS[pipeline.type]}
            </span>
          </div>
          {pipeline.description && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">{pipeline.description}</p>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={builder.handleValidate} disabled={builder.isSubmitting}>
            Validate
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={builder.isSubmitting}>
            Delete
          </Button>
        </div>
      </div>

      {builder.error && (
        <div className="border border-destructive/30 bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-xs font-mono">
          {builder.error}
        </div>
      )}

      <PipelineStepsPanel
        steps={steps}
        pipelineType={pipeline.type}
        readyVersionOptions={readyVersionOptions}
        isSubmitting={builder.isSubmitting}
        onAddStep={builder.handleAddStep}
        onRemoveStep={builder.handleRemoveStep}
      />

      <PipelineEdgesPanel
        steps={steps}
        edges={edges}
        isSubmitting={builder.isSubmitting}
        onUpsertEdge={builder.handleUpsertEdge}
        onRemoveEdge={builder.handleRemoveEdge}
      />

      <PipelineRunPanel
        runs={runs}
        canRun={pipeline.status === PipelineStatus.VALIDATED}
        isTriggering={runHook.isTriggering}
        runError={runHook.error}
        onTriggerRun={runHook.handleTriggerRun}
      />
    </div>
  );
}
