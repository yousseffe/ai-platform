"use client";

import React from "react";
import { PipelineStep, PipelineType } from "@/types";
import { groupByStage } from "@/lib/utils/pipelines";
import { Cpu, GitMerge, GitBranch, ArrowDown, MoreHorizontal, Bot, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { AddPipelineStepDialog } from "./AddPipelineStepDialog";
import { EditPipelineStepDialog } from "./EditPipelineStepDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateStepInput } from "@/lib/schemas";

interface ReadyVersionOption {
  modelVersionId: string;
  label: string;
}

type StepInputPayload = CreateStepInput;

interface PipelineFlowDiagramProps {
  steps: PipelineStep[];
  pipelineType: PipelineType;
  layoutMode?: string;
  readyVersionOptions?: ReadyVersionOption[];
  isSubmitting?: boolean;
  onAddStep?: (input: StepInputPayload, order: number) => Promise<boolean>;
  onUpdateStep?: (stepId: string, input: StepInputPayload) => Promise<boolean>;
  onRemoveStep?: (stepId: string) => Promise<void>;
}

/**
 * Renders a visual DAG-style flow diagram for the pipeline, showing
 * Input → stages (with parallel fan-out) → Output with connecting arrows.
 *
 * @param props - PipelineFlowDiagram component properties.
 * @returns The React component rendering the pipeline flow diagram.
 */
export function PipelineFlowDiagram({
  steps,
  pipelineType,
  layoutMode = "vertical",
  readyVersionOptions = [],
  isSubmitting = false,
  onAddStep,
  onUpdateStep,
  onRemoveStep,
}: PipelineFlowDiagramProps) {
  const stages = groupByStage(steps);

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4 max-w-sm mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <Cpu className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground">Pipeline is empty</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Add your first step to start building your inference workflow. Connect model versions and map input fields.
          </p>
        </div>
        {onAddStep && (
          <AddPipelineStepDialog
            stages={stages}
            readyVersionOptions={readyVersionOptions}
            isSubmitting={isSubmitting}
            onAddStep={onAddStep}
            defaultStageChoice="__new_stage__"
            trigger={
              <Button className="h-9 px-4 text-xs font-bold gap-1.5 cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] transition-all rounded-xl btn-primary">
                <Plus className="w-3.5 h-3.5" /> Add First Step
              </Button>
            }
          />
        )}
      </div>
    );
  }

  const isHorizontal = layoutMode === "horizontal";

  return (
    <div className={cn(
      "flex items-center gap-0 py-4 select-none overflow-x-auto justify-center",
      isHorizontal ? "flex-row" : "flex-col"
    )}>
      {/* ── Input Node ── */}
      <FlowNode
        label="Input"
        sublabel="Pipeline boundary"
        variant="boundary"
        icon={<BoundaryIcon />}
      />

      {/* ── Fan-out arrow (if first stage is parallel) ── */}
      {stages.length > 0 && (
        <FanConnector
          count={stages[0].length}
          direction="out"
          layoutMode={layoutMode}
          stages={stages}
          readyVersionOptions={readyVersionOptions}
          isSubmitting={isSubmitting}
          onAddStep={onAddStep}
          targetStageOrder={0}
        />
      )}

      {/* ── Stages ── */}
      {stages.map((stage, stageIndex) => (
        <React.Fragment key={stage[0].order}>
          {/* Parallel stage row */}
          {stage.length > 1 ? (
            <div className={cn("flex items-stretch gap-3 justify-center", isHorizontal ? "flex-col" : "flex-row")}>
              {stage.map((step, i) => (
                <React.Fragment key={step.id}>
                  <FlowNode
                    label={step.label ?? step.role ?? `Step ${step.order}`}
                    sublabel={
                      step.modelVersion
                        ? `${step.modelVersion.model?.name ?? "Model"} v${step.modelVersion.versionNumber}`
                        : "No model bound"
                    }
                    variant="step"
                    icon={<Cpu className="w-3.5 h-3.5" />}
                    badge={i === 0 ? "parallel" : undefined}
                    step={step}
                    stageSteps={stage}
                    readyVersionOptions={readyVersionOptions}
                    isSubmitting={isSubmitting}
                    onUpdateStep={onUpdateStep}
                    onRemoveStep={onRemoveStep}
                  />
                </React.Fragment>
              ))}
            </div>
          ) : (
            /* Single step */
            <FlowNode
              label={stage[0].label ?? stage[0].role ?? `Step ${stage[0].order}`}
              sublabel={
                stage[0].modelVersion
                  ? `${stage[0].modelVersion.model?.name ?? "Model"} v${stage[0].modelVersion.versionNumber}`
                  : "No model bound"
              }
              variant="step"
              icon={<Cpu className="w-3.5 h-3.5" />}
              step={stage[0]}
              stageSteps={stage}
              readyVersionOptions={readyVersionOptions}
              isSubmitting={isSubmitting}
              onUpdateStep={onUpdateStep}
              onRemoveStep={onRemoveStep}
            />
          )}

          {/* Connector between stages */}
          {stageIndex < stages.length - 1 && (() => {
            const nextStage = stages[stageIndex + 1];
            const curCount = stage.length;
            const nextCount = nextStage.length;

            if (curCount > 1 && nextCount === 1) {
              // fan-in
              return (
                <FanConnector
                  count={curCount}
                  direction="in"
                  layoutMode={layoutMode}
                  stages={stages}
                  readyVersionOptions={readyVersionOptions}
                  isSubmitting={isSubmitting}
                  onAddStep={onAddStep}
                  targetStageOrder={nextStage[0].order}
                />
              );
            }
            if (curCount === 1 && nextCount > 1) {
              // fan-out
              return (
                <FanConnector
                  count={nextCount}
                  direction="out"
                  layoutMode={layoutMode}
                  stages={stages}
                  readyVersionOptions={readyVersionOptions}
                  isSubmitting={isSubmitting}
                  onAddStep={onAddStep}
                  targetStageOrder={nextStage[0].order}
                />
              );
            }
            // simple arrow
            return (
              <SimpleArrow
                layoutMode={layoutMode}
                stages={stages}
                readyVersionOptions={readyVersionOptions}
                isSubmitting={isSubmitting}
                onAddStep={onAddStep}
                targetStageOrder={nextStage[0].order}
              />
            );
          })()}

          {/* Last stage → fan-in to output */}
          {stageIndex === stages.length - 1 && stage.length > 1 && (
            <FanConnector
              count={stage.length}
              direction="in"
              layoutMode={layoutMode}
              stages={stages}
              readyVersionOptions={readyVersionOptions}
              isSubmitting={isSubmitting}
              onAddStep={onAddStep}
              targetStageOrder={stages.length}
            />
          )}
          {stageIndex === stages.length - 1 && stage.length === 1 && (
            <SimpleArrow
              layoutMode={layoutMode}
              stages={stages}
              readyVersionOptions={readyVersionOptions}
              isSubmitting={isSubmitting}
              onAddStep={onAddStep}
              targetStageOrder={stages.length}
            />
          )}
        </React.Fragment>
      ))}

      {/* ── Output Node ── */}
      <FlowNode
        label="Output"
        sublabel="Pipeline boundary"
        variant="boundary"
        icon={<BoundaryIcon />}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function BoundaryIcon() {
  return (
    <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
  );
}

interface FlowNodeProps {
  label: string;
  sublabel: string;
  variant: "boundary" | "step";
  icon: React.ReactNode;
  badge?: "parallel";
  step?: PipelineStep;
  stageSteps?: PipelineStep[];
  readyVersionOptions?: ReadyVersionOption[];
  isSubmitting?: boolean;
  onUpdateStep?: (stepId: string, input: StepInputPayload) => Promise<boolean>;
  onRemoveStep?: (stepId: string) => Promise<void>;
}

function FlowNode({
  label,
  sublabel,
  variant,
  icon,
  badge,
  step,
  stageSteps = [],
  readyVersionOptions = [],
  isSubmitting = false,
  onUpdateStep,
  onRemoveStep,
}: FlowNodeProps) {
  if (variant === "boundary") {
    return (
      <div className="flex flex-col items-center gap-1.5 bg-card rounded-2xl border border-indigo-500/20 px-5 py-2.5 shadow-sm text-center min-w-[155px] select-none">
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {icon}
          {label}
        </div>
        <span className="text-[10px] text-muted-foreground">{sublabel}</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center select-none" style={{ minWidth: 220, maxWidth: 280 }}>
      {badge === "parallel" && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
          <span className="px-1.5 py-0.5 rounded-sm bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5">
            <GitBranch className="w-2.5 h-2.5" /> Parallel
          </span>
        </div>
      )}
      <div
        className="
          w-full flex items-center gap-3 px-4 py-3
          border border-border rounded-2xl bg-card
          shadow-xs hover:border-primary/50 hover:shadow-sm
          transition-all duration-200 cursor-default
          group relative
        "
      >
        <div className="w-8 h-8 shrink-0 rounded-lg border border-primary/20 bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/25 transition-colors">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-xs font-bold text-foreground truncate leading-snug">
            {label}
          </span>
          <span className="block text-[10px] text-muted-foreground truncate leading-normal">
            {sublabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[9px] font-bold">
            Active
          </span>
          {variant === "step" && step && onUpdateStep && onRemoveStep ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center p-1 hover:bg-secondary/40 rounded">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <EditPipelineStepDialog
                  step={step}
                  stageSteps={stageSteps}
                  readyVersionOptions={readyVersionOptions}
                  isSubmitting={isSubmitting}
                  onUpdateStep={onUpdateStep}
                  trigger={
                    <button className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-accent rounded select-none cursor-pointer border-none bg-transparent">
                      <Pencil className="w-3 h-3 text-muted-foreground" />
                      Configure step
                    </button>
                  }
                />
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => onRemoveStep(step.id)}
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete step
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button className="text-muted-foreground hover:text-foreground cursor-pointer">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface SimpleArrowProps {
  layoutMode?: string;
  stages?: PipelineStep[][];
  readyVersionOptions?: ReadyVersionOption[];
  isSubmitting?: boolean;
  onAddStep?: (input: StepInputPayload, order: number) => Promise<boolean>;
  targetStageOrder?: number;
}

function SimpleArrow({
  layoutMode,
  stages = [],
  readyVersionOptions = [],
  isSubmitting = false,
  onAddStep,
  targetStageOrder,
}: SimpleArrowProps) {
  const isHorizontal = layoutMode === "horizontal";
  const buttonEl = (
    <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5.5 h-5.5 rounded-full border border-border bg-card shadow-xs flex items-center justify-center text-xs text-muted-foreground hover:text-foreground hover:bg-secondary hover:scale-105 active:scale-95 transition-all cursor-pointer">
      <Plus className="w-3 h-3" />
    </button>
  );

  return (
    <div className={cn(
      "flex items-center justify-center relative select-none",
      isHorizontal ? "h-12 w-16 flex-row my-0 mx-1" : "h-16 w-12 flex-col my-1 mx-0"
    )}>
      <div className={cn("bg-border", isHorizontal ? "h-px w-full" : "w-px h-full")} />
      {onAddStep ? (
        <AddPipelineStepDialog
          stages={stages}
          readyVersionOptions={readyVersionOptions}
          isSubmitting={isSubmitting}
          onAddStep={onAddStep}
          defaultStageChoice={targetStageOrder != null ? String(targetStageOrder) : undefined}
          trigger={buttonEl}
        />
      ) : (
        buttonEl
      )}
    </div>
  );
}

interface FanConnectorProps {
  count: number;
  direction: "out" | "in";
  layoutMode?: string;
  stages?: PipelineStep[][];
  readyVersionOptions?: ReadyVersionOption[];
  isSubmitting?: boolean;
  onAddStep?: (input: StepInputPayload, order: number) => Promise<boolean>;
  targetStageOrder?: number;
}

/**
 * Renders a fan-out (split) or fan-in (merge) SVG connector between a
 * single node and multiple parallel nodes.
 */
function FanConnector({
  count,
  direction,
  layoutMode,
  stages = [],
  readyVersionOptions = [],
  isSubmitting = false,
  onAddStep,
  targetStageOrder,
}: FanConnectorProps) {
  if (count <= 1) {
    return (
      <SimpleArrow
        layoutMode={layoutMode}
        stages={stages}
        readyVersionOptions={readyVersionOptions}
        isSubmitting={isSubmitting}
        onAddStep={onAddStep}
        targetStageOrder={targetStageOrder}
      />
    );
  }
  const isHorizontal = layoutMode === "horizontal";

  if (isHorizontal) {
    // Horizontal layout curve generator
    const nodeHeight = 84; // approx height of each node card + gap in vertical
    const totalHeight = count * nodeHeight;
    const width = 48;
    const cy = totalHeight / 2;
    const points = Array.from({ length: count }, (_, i) => {
      return cy - ((count - 1) / 2 - i) * nodeHeight;
    });

    return (
      <div className="relative flex items-center justify-center select-none" style={{ height: totalHeight, width }}>
        <svg
          width={width}
          height={totalHeight}
          className="overflow-visible"
          viewBox={`0 0 ${width} ${totalHeight}`}
        >
          {direction === "out"
            ? points.map((py, i) => (
                <path
                  key={i}
                  d={`M0,${cy} C${width * 0.5},${cy} ${width * 0.5},${py} ${width},${py}`}
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth="1.5"
                  className="transition-all"
                />
              ))
            : points.map((py, i) => (
                <path
                  key={i}
                  d={`M0,${py} C${width * 0.5},${py} ${width * 0.5},${cy} ${width},${cy}`}
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth="1.5"
                />
              ))}
        </svg>
      </div>
    );
  }

  // Layout constants
  const nodeWidth = 168; // approx width of each node card + gap
  const totalWidth = count * nodeWidth;
  const height = 48;
  const cx = totalWidth / 2;

  const points = Array.from({ length: count }, (_, i) => {
    return cx - ((count - 1) / 2 - i) * nodeWidth;
  });

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: totalWidth, height }}>
      <svg
        width={totalWidth}
        height={height}
        className="overflow-visible"
        viewBox={`0 0 ${totalWidth} ${height}`}
      >
        {direction === "out"
          ? // Fan-out: single top point → multiple bottom points
            points.map((px, i) => (
              <path
                key={i}
                d={`M${cx},0 C${cx},${height * 0.5} ${px},${height * 0.5} ${px},${height}`}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="1.5"
                className="transition-all"
              />
            ))
          : // Fan-in: multiple top points → single bottom point
            points.map((px, i) => (
              <path
                key={i}
                d={`M${px},0 C${px},${height * 0.5} ${cx},${height * 0.5} ${cx},${height}`}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="1.5"
              />
            ))}
        {/* Arrow head */}
        {direction === "out" &&
          points.map((px, i) => (
            <polygon
              key={`ah-${i}`}
              points={`${px - 3},${height - 5} ${px + 3},${height - 5} ${px},${height + 1}`}
              fill="var(--color-border)"
            />
          ))}
        {direction === "in" && (
          <polygon
            points={`${cx - 3},${height - 5} ${cx + 3},${height - 5} ${cx},${height + 1}`}
            fill="var(--color-border)"
          />
        )}
      </svg>
    </div>
  );
}
