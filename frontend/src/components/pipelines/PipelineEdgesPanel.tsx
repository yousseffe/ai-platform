"use client";

import React from "react";
import { Trash2, ArrowRight, Merge, GitBranch, Copy, RefreshCw, Hash, FileText, ChevronRight } from "lucide-react";
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

/** Groups edges by their shared target (`toStep`, or `null` for the pipeline's output). */
function groupByTarget(edges: PipelineEdge[]): Map<string, PipelineEdge[]> {
  const groups = new Map<string, PipelineEdge[]>();
  for (const edge of edges) {
    const key = edge.toStep?.id ?? "__output__";
    const bucket = groups.get(key) ?? [];
    bucket.push(edge);
    groups.set(key, bucket);
  }
  return groups;
}

/** Returns a Lucide icon for a mapper rule's operation. */
function RuleOpIcon({ op }: { op: MapperRule["op"] }) {
  switch (op) {
    case "copy":
      return <Copy className="w-3 h-3" />;
    case "cast":
      return <RefreshCw className="w-3 h-3" />;
    case "default":
      return <Hash className="w-3 h-3" />;
    case "template":
      return <FileText className="w-3 h-3" />;
    default:
      return <ChevronRight className="w-3 h-3" />;
  }
}

/** Colour classes for each operation badge. */
const OP_COLORS: Record<string, string> = {
  copy:     "bg-blue-500/10 text-blue-500 border-blue-500/25",
  cast:     "bg-violet-500/10 text-violet-500 border-violet-500/25",
  default:  "bg-amber-500/10 text-amber-500 border-amber-500/25",
  template: "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
};

/** Renders one rule as a compact readable badge row. */
function RuleChip({ rule }: { rule: MapperRule }) {
  const colorCls = OP_COLORS[rule.op] ?? "bg-muted text-muted-foreground border-border";

  const fromDesc = (() => {
    if ("from" in rule) return rule.from as string;
    if ("value" in rule) return JSON.stringify((rule as { value: unknown }).value);
    if ("template" in rule) return `"${(rule as { template: string }).template}"`;
    return "—";
  })();

  const castSuffix = rule.op === "cast" && "as" in rule
    ? ` → ${(rule as { as: string }).as}`
    : "";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Op badge */}
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider font-mono ${colorCls}`}>
        <RuleOpIcon op={rule.op} />
        {rule.op}
      </span>
      {/* From */}
      <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60 max-w-[12rem] truncate">
        {fromDesc}{castSuffix}
      </code>
      {/* Arrow */}
      <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
      {/* To */}
      <code className="text-[10px] font-mono text-foreground bg-primary/8 px-1.5 py-0.5 rounded border border-primary/20 max-w-[10rem] truncate">
        {rule.to}
      </code>
    </div>
  );
}

/**
 * Renders the mapper edges panel with a rich card-based layout per edge group,
 * showing each rule as a readable chip rather than raw JSON.
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
  const stepLabel = (step: Pick<PipelineStep, "id" | "order" | "label" | "role"> | null): string => {
    if (!step) return "Pipeline Boundary";
    return step.label ?? (step.role ? `${step.role} (Stage ${step.order})` : `Step ${step.order}`);
  };

  const groups = groupByTarget(edges);

  return (
    <div className="border border-border bg-card rounded-xl overflow-hidden shadow-sm">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-border bg-background flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-foreground font-mono">Mappers</h2>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            Field-level transforms at each edge.{" "}
            <code className="bg-secondary/50 px-1 rounded">input.x</code>{" "}
            <code className="bg-secondary/50 px-1 rounded">previous.x</code>{" "}
            <code className="bg-secondary/50 px-1 rounded">steps.0.x</code>{" "}
            — empty mapper passes payload unchanged.
          </p>
        </div>
        <MapperEdgeDialog steps={steps} isSubmitting={isSubmitting} onUpsert={onUpsertEdge} />
      </div>

      {/* ── Body ── */}
      <div className="p-6">
        {edges.length === 0 ? (
          <p className="text-xs text-muted-foreground font-mono text-center py-4">
            No mappers defined — payloads pass straight from step to step.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {[...groups.entries()].map(([targetKey, targetEdges]) => {
              const isJoin = targetEdges.length > 1;
              return (
                <div
                  key={targetKey}
                  className={`rounded-xl border overflow-hidden ${
                    isJoin ? "border-primary/30 bg-primary/3" : "border-border bg-background"
                  }`}
                >
                  {/* Group header */}
                  <div className={`flex items-center gap-2 px-4 py-2.5 border-b text-xs font-mono ${
                    isJoin ? "border-primary/20 bg-primary/8" : "border-border bg-muted/40"
                  }`}>
                    {isJoin ? (
                      <Merge className="w-3.5 h-3.5 text-primary shrink-0" />
                    ) : (
                      <GitBranch className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="font-bold text-foreground">→ {stepLabel(targetEdges[0].toStep)}</span>
                    {isJoin && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25 text-[9px] font-bold uppercase tracking-wider">
                        {targetEdges.length}-branch join
                      </span>
                    )}
                  </div>

                  {/* Edges in this group */}
                  <div className="divide-y divide-border">
                    {targetEdges.map((edge) => (
                      <div key={edge.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                        {/* Edge header: from → to */}
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 font-mono text-xs min-w-0">
                            <span className="shrink-0 px-2 py-0.5 rounded border border-border bg-muted text-foreground font-semibold text-[10px]">
                              {stepLabel(edge.fromStep)}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="shrink-0 px-2 py-0.5 rounded border border-border bg-muted text-foreground font-semibold text-[10px]">
                              {stepLabel(edge.toStep)}
                            </span>
                            <span className="text-muted-foreground text-[9px] shrink-0">
                              {edge.spec.rules.length === 0
                                ? "(pass-through)"
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

                        {/* Rules */}
                        {edge.spec.rules.length > 0 ? (
                          <div className="flex flex-col gap-1.5 pl-2 border-l-2 border-border ml-2">
                            {edge.spec.rules.map((rule, i) => (
                              <RuleChip key={i} rule={rule} />
                            ))}
                          </div>
                        ) : (
                          <p className="text-[9px] text-muted-foreground font-mono pl-2 italic">
                            No rules — passes previous payload unchanged.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
