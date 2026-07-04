"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, GitBranch, Layers, User, Sparkles, Merge } from "lucide-react";
import { Pipeline, PipelineType } from "@/types";
import { groupByStage, stepNamespacePath } from "@/lib/utils/pipelines";

interface PublicPipelineDetailClientProps {
  /** The full public pipeline object fetched server-side. */
  pipeline: Pipeline;
}

/** Short display label for each pipeline-type preset. */
const PIPELINE_TYPE_LABELS: Record<PipelineType, string> = {
  [PipelineType.SEQUENTIAL_CHAIN]: "Sequential Chain",
  [PipelineType.CONTEXT_AUGMENTED]: "Context-Augmented",
  [PipelineType.PARALLEL]: "Parallel",
};

/**
 * Read-only public detail page for a marketplace pipeline. Shows the
 * pipeline's metadata and its step chain (grouped into stages), without
 * exposing edit/run controls — those remain restricted to the owner.
 *
 * @param props - PublicPipelineDetailClient component properties.
 * @returns The React component rendering the public pipeline detail page.
 */
export function PublicPipelineDetailClient({ pipeline }: PublicPipelineDetailClientProps) {
  const sortedSteps = [...(pipeline.steps ?? [])].sort((a, b) => a.order - b.order);
  const stages = groupByStage(sortedSteps);
  const ownerLabel = pipeline.user?.email ? `@${pipeline.user.email.split("@")[0]}` : "community";

  return (
    <div className="w-full text-foreground">
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-10">
        <Link href="/explore" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Explore
        </Link>

        <div className="border border-border bg-card rounded-2xl p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-sm shrink-0">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">{pipeline.name}</h1>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mt-0.5">
                <User className="w-3 h-3" /> {ownerLabel}
              </div>
            </div>
          </div>

          {pipeline.description && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{pipeline.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider font-mono">
            <span className="px-2.5 py-1 rounded-md border border-border bg-secondary text-muted-foreground">
              {PIPELINE_TYPE_LABELS[pipeline.type]}
            </span>
            <span className="px-2.5 py-1 rounded-md border border-border bg-secondary text-muted-foreground flex items-center gap-1">
              <Layers className="w-3 h-3" /> {sortedSteps.length} step{sortedSteps.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Step Chain */}
        <div className="border border-border bg-card rounded-2xl overflow-hidden shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-border bg-background">
            <h2 className="text-sm font-bold text-foreground">Model Chain</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              The sequence of models this pipeline calls, stage by stage.
            </p>
          </div>
          <div className="p-6 space-y-4">
            {stages.map((stage) => (
              <div key={stage[0].order} className="rounded-xl border border-border/60 bg-background/40 p-4">
                {stage.length > 1 && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary mb-3">
                    <Merge className="w-3.5 h-3.5" /> Parallel Stage {stage[0].order}
                  </div>
                )}
                <div className={stage.length > 1 ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : ""}>
                  {stage.map((step) => (
                    <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {step.modelVersion?.model?.name ?? "Unbound step"}
                          {step.modelVersion && <span className="text-muted-foreground font-normal"> v{step.modelVersion.versionNumber}</span>}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {stage.length > 1 ? stepNamespacePath(step, stage.length) : `Stage ${step.order}`}
                          {step.label ? ` — ${step.label}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {stages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">This pipeline has no steps yet.</p>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-purple-600/5 p-8 flex flex-col md:flex-row items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Want to build your own pipeline?</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              Chain your deployed models together with declarative field mappers — no code required.
            </p>
          </div>
          <Link href="/login" className="btn-primary text-sm font-semibold shrink-0 flex items-center gap-1.5 py-2.5 px-5">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
