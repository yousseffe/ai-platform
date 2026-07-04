"use client";

import React from "react";
import Link from "next/link";
import { GitBranch, Layers, ArrowRight, User } from "lucide-react";
import { Pipeline, PipelineType } from "@/types";

/** Short display label for each pipeline-type preset. */
const PIPELINE_TYPE_LABELS: Record<PipelineType, string> = {
  [PipelineType.SEQUENTIAL_CHAIN]: "Sequential",
  [PipelineType.CONTEXT_AUGMENTED]: "Context-Augmented",
  [PipelineType.PARALLEL]: "Parallel",
};

interface PipelineMarketplaceCardProps {
  pipeline: Pipeline;
}

/**
 * Marketplace card for a publicly-listed pipeline, linking to its read-only
 * public detail page. Mirrors the model marketplace card's visual language.
 *
 * @param props - PipelineMarketplaceCard component properties.
 * @returns The React component rendering one pipeline catalog card.
 */
export function PipelineMarketplaceCard({ pipeline }: PipelineMarketplaceCardProps) {
  const stepCount = pipeline.steps?.length ?? 0;
  const ownerLabel = pipeline.user?.email ? `@${pipeline.user.email.split("@")[0]}` : "community";

  return (
    <Link
      href={`/explore/pipelines/${pipeline.id}`}
      className="group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 hover:border-primary/30"
    >
      <div className="h-1 w-full bg-gradient-to-r from-primary to-purple-500 opacity-80 group-hover:opacity-100 transition-opacity" />

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-sm shrink-0">
            <GitBranch className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-muted-foreground bg-muted border border-border">
            {PIPELINE_TYPE_LABELS[pipeline.type]}
          </span>
        </div>

        <h3 className="text-sm font-bold text-foreground truncate mb-1 group-hover:text-primary transition-colors">
          {pipeline.name}
        </h3>

        <div className="flex items-center gap-1.5 mb-3 text-xs font-mono text-muted-foreground">
          <User className="w-3 h-3 shrink-0 text-muted-foreground/80" />
          <span className="truncate">{ownerLabel}</span>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1 mb-4">
          {pipeline.description || "No description provided for this pipeline."}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
            <Layers className="w-3 h-3" />
            <span>{stepCount} step{stepCount !== 1 ? "s" : ""}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
            View Pipeline
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
