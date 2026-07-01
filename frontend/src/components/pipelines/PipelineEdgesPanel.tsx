"use client";

import React from "react";
import { Trash2, ArrowRight } from "lucide-react";
import { PipelineStep, PipelineEdge, MapperRule } from "@/types";
import { MapperEdgeDialog } from "./MapperEdgeDialog";

interface PipelineEdgesPanelProps {
  steps: PipelineStep[];
  edges: PipelineEdge[];
  isSubmitting: boolean;
  onUpsertEdge: (
    fromStepId: string | undefined,
    toStepId: string | undefined,
    spec: { rules: MapperRule[] },
  ) => Promise<boolean>;
  onRemoveEdge: (edgeId: string) => Promise<void>;
}

/**
 * Renders the mapper edges defined between pipeline steps (and the pipeline's
 * external input/output), plus the visual {@link MapperEdgeDialog} for
 * creating/replacing a mapper without hand-writing JSON.
 *
 * @param props - PipelineEdgesPanel component properties.
 * @returns The React component rendering the edges panel.
 */
export function PipelineEdgesPanel({
  steps,
  edges,
  isSubmitting,
  onUpsertEdge,
  onRemoveEdge,
}: PipelineEdgesPanelProps) {
  const stepLabel = (step: Pick<PipelineStep, "id" | "order" | "label"> | null): string => {
    if (!step) return "Pipeline Boundary";
    return step.label ?? `Step ${step.order}`;
  };

  return (
    <div className="border border-border bg-card rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-border bg-background flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground font-mono">Mappers</h2>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            Transforms applied at each edge. Field rules use{" "}
            <code className="bg-secondary/50 px-1 rounded">input.x</code>{" "}
            <code className="bg-secondary/50 px-1 rounded">previous.x</code>{" "}
            <code className="bg-secondary/50 px-1 rounded">steps.0.x</code> — no mapper passes the previous payload through unchanged.
          </p>
        </div>
        <MapperEdgeDialog steps={steps} isSubmitting={isSubmitting} onUpsert={onUpsertEdge} />
      </div>

      <div className="p-6">
        {edges.length === 0 ? (
          <p className="text-xs text-muted-foreground font-mono text-center py-4">
            No mappers defined — payloads pass straight from step to step.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {edges.map((edge) => (
              <div
                key={edge.id}
                className="flex items-center justify-between gap-4 border border-border rounded-lg px-4 py-3 bg-background text-xs font-mono"
              >
                <div className="flex items-center gap-2 flex-wrap text-foreground">
                  <span className="font-semibold">{stepLabel(edge.fromStep)}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-semibold">{stepLabel(edge.toStep)}</span>
                  <span className="text-muted-foreground ml-2">
                    {edge.spec.rules.length === 0
                      ? "pass-through"
                      : `${edge.spec.rules.length} rule${edge.spec.rules.length === 1 ? "" : "s"}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveEdge(edge.id)}
                  disabled={isSubmitting}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
