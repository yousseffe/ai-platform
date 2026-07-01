"use client";

import React, { useState } from "react";
import { LayoutGrid, GitBranch, List } from "lucide-react";
import { PipelineStep, PipelineType } from "@/types";
import { CreateStepInput } from "@/lib/schemas";
import { groupByStage } from "@/lib/utils/pipelines";
import { AddPipelineStepDialog } from "./AddPipelineStepDialog";
import { PipelineStageGroup } from "./PipelineStageGroup";
import { PipelineFlowDiagram } from "./PipelineFlowDiagram";

interface ReadyVersionOption {
  modelVersionId: string;
  label: string;
}

interface PipelineStepsPanelProps {
  steps: PipelineStep[];
  pipelineType?: PipelineType;
  readyVersionOptions: ReadyVersionOption[];
  isSubmitting: boolean;
  onAddStep: (input: CreateStepInput, order: number) => Promise<boolean>;
  onRemoveStep: (stepId: string) => Promise<void>;
}

/**
 * Renders the pipeline's steps with a dual-view: a visual DAG flow diagram
 * and a traditional list of step cards. Users can toggle between views.
 * Stages with more than one step represent parallel branches.
 *
 * @param props - PipelineStepsPanel component properties.
 * @returns The React component rendering the steps panel.
 */
export function PipelineStepsPanel({
  steps,
  pipelineType = PipelineType.SEQUENTIAL_CHAIN,
  readyVersionOptions,
  isSubmitting,
  onAddStep,
  onRemoveStep,
}: PipelineStepsPanelProps) {
  const stages = groupByStage(steps);
  const [view, setView] = useState<"flow" | "list">("flow");
  const parallelCount = stages.filter((s) => s.length > 1).length;

  return (
    <div className="border border-border bg-card rounded-xl overflow-hidden shadow-sm">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-border bg-background flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm font-bold text-foreground font-mono">Steps</h2>
          {/* Stage summary pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border font-bold text-[9px] font-mono uppercase tracking-wider">
              {stages.length} stage{stages.length !== 1 ? "s" : ""}
            </span>
            {parallelCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-bold text-[9px] font-mono uppercase tracking-wider flex items-center gap-1">
                <GitBranch className="w-2.5 h-2.5" />
                {parallelCount} parallel
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View toggle */}
          {steps.length > 0 && (
            <div className="flex items-center border border-border rounded-lg overflow-hidden bg-muted p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setView("flow")}
                title="Flow diagram"
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  view === "flow"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                title="List view"
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  view === "list"
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <AddPipelineStepDialog
            stages={stages}
            readyVersionOptions={readyVersionOptions}
            isSubmitting={isSubmitting}
            onAddStep={onAddStep}
          />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-6">
        {steps.length === 0 ? (
          <p className="text-xs text-muted-foreground font-mono text-center py-6">
            No steps yet. Add your first step to start the chain.
          </p>
        ) : view === "flow" ? (
          /* ── Flow Diagram ── */
          <PipelineFlowDiagram steps={steps} pipelineType={pipelineType} />
        ) : (
          /* ── List View ── */
          <div className="flex flex-col items-stretch gap-2">
            {stages.map((stage, stageIndex) => (
              <React.Fragment key={stage[0].order}>
                <PipelineStageGroup
                  stage={stage}
                  isSubmitting={isSubmitting}
                  onRemoveStep={onRemoveStep}
                />
                {stageIndex < stages.length - 1 && (
                  <div className="flex flex-col items-center gap-0 my-0.5">
                    <div className="w-px h-4 bg-border" />
                    <div className="w-1.5 h-1.5 rounded-full bg-border" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
