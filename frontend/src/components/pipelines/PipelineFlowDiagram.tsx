"use client";

import React from "react";
import { PipelineStep, PipelineType } from "@/types";
import { groupByStage } from "@/lib/utils/pipelines";
import { Cpu, GitMerge, GitBranch, ArrowDown } from "lucide-react";

interface PipelineFlowDiagramProps {
  steps: PipelineStep[];
  pipelineType: PipelineType;
}

/**
 * Renders a visual DAG-style flow diagram for the pipeline, showing
 * Input → stages (with parallel fan-out) → Output with connecting arrows.
 *
 * @param props - PipelineFlowDiagram component properties.
 * @returns The React component rendering the pipeline flow diagram.
 */
export function PipelineFlowDiagram({ steps, pipelineType }: PipelineFlowDiagramProps) {
  const stages = groupByStage(steps);

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
          <Cpu className="w-4 h-4" />
        </div>
        <p className="text-xs text-muted-foreground font-mono text-center">
          Add steps to visualize the pipeline flow
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0 py-4 select-none overflow-x-auto">
      {/* ── Input Node ── */}
      <FlowNode
        label="Input"
        sublabel="Pipeline boundary"
        variant="boundary"
        icon={<BoundaryIcon />}
      />

      {/* ── Fan-out arrow (if first stage is parallel) ── */}
      {stages.length > 0 && (
        <FanConnector count={stages[0].length} direction="out" />
      )}

      {/* ── Stages ── */}
      {stages.map((stage, stageIndex) => (
        <React.Fragment key={stage[0].order}>
          {/* Parallel stage row */}
          {stage.length > 1 ? (
            <div className="flex items-stretch gap-3 w-full justify-center">
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
            />
          )}

          {/* Connector between stages */}
          {stageIndex < stages.length - 1 && (() => {
            const nextStage = stages[stageIndex + 1];
            const curCount = stage.length;
            const nextCount = nextStage.length;

            if (curCount > 1 && nextCount === 1) {
              // fan-in
              return <FanConnector count={curCount} direction="in" />;
            }
            if (curCount === 1 && nextCount > 1) {
              // fan-out
              return <FanConnector count={nextCount} direction="out" />;
            }
            // simple arrow down
            return <SimpleArrow />;
          })()}

          {/* Last stage → fan-in to output */}
          {stageIndex === stages.length - 1 && stage.length > 1 && (
            <FanConnector count={stage.length} direction="in" />
          )}
          {stageIndex === stages.length - 1 && stage.length === 1 && (
            <SimpleArrow />
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
    <div className="w-2 h-2 rounded-full bg-current" />
  );
}

interface FlowNodeProps {
  label: string;
  sublabel: string;
  variant: "boundary" | "step";
  icon: React.ReactNode;
  badge?: "parallel";
}

function FlowNode({ label, sublabel, variant, icon, badge }: FlowNodeProps) {
  if (variant === "boundary") {
    return (
      <div className="flex flex-col items-center gap-1">
        <div
          className="
            flex items-center gap-2 px-4 py-1.5
            rounded-full border border-primary/40 bg-primary/10
            text-primary text-xs font-bold font-mono
            shadow-sm
          "
        >
          {icon}
          {label}
        </div>
        <span className="text-[9px] text-muted-foreground font-mono">{sublabel}</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center" style={{ minWidth: 140, maxWidth: 200 }}>
      {badge === "parallel" && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
          <span className="px-1.5 py-0.5 rounded-sm bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[8px] font-bold uppercase tracking-wider font-mono flex items-center gap-0.5">
            <GitBranch className="w-2.5 h-2.5" /> Parallel
          </span>
        </div>
      )}
      <div
        className="
          w-full flex flex-col gap-1 px-3 py-2.5
          border border-border rounded-xl bg-card
          shadow-sm hover:border-primary/40 hover:shadow-md
          transition-all duration-200 cursor-default
          group
        "
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 shrink-0 rounded-md border border-border bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            {icon}
          </div>
          <span className="text-xs font-bold font-mono text-foreground truncate leading-tight">
            {label}
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground font-mono truncate pl-8 leading-tight">
          {sublabel}
        </span>
      </div>
    </div>
  );
}

function SimpleArrow() {
  return (
    <div className="flex flex-col items-center gap-0 my-0.5">
      <div className="w-px h-5 bg-border" />
      <ArrowDown className="w-3 h-3 text-muted-foreground -mt-0.5" />
    </div>
  );
}

/**
 * Renders a fan-out (split) or fan-in (merge) SVG connector between a
 * single node and multiple parallel nodes.
 */
function FanConnector({ count, direction }: { count: number; direction: "out" | "in" }) {
  if (count <= 1) return <SimpleArrow />;

  // Layout constants
  const nodeWidth = 168; // approx width of each node card + gap
  const totalWidth = count * nodeWidth;
  const height = 48;
  const cx = totalWidth / 2;

  const points = Array.from({ length: count }, (_, i) => {
    return cx - ((count - 1) / 2 - i) * nodeWidth;
  });

  return (
    <div className="relative flex items-center justify-center" style={{ width: totalWidth, height }}>
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
