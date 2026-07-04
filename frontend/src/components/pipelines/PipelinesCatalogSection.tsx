"use client";

import React, { useEffect, useState } from "react";
import { GitBranch, Loader2 } from "lucide-react";
import { Pipeline } from "@/types";
import { getPublicPipelines } from "@/lib/actions/pipelines.actions";
import { PipelineMarketplaceCard } from "./PipelineMarketplaceCard";

/**
 * Fetches and renders the public pipeline marketplace catalog: a simple grid
 * of every `VALIDATED` pipeline its owner has marked public. Unlike the model
 * catalog, this isn't OpenSearch-backed — pipeline counts are expected to
 * stay small, so a single unfiltered listing is fetched on mount.
 *
 * @returns The React component rendering the pipelines catalog grid.
 */
export function PipelinesCatalogSection() {
  const [pipelines, setPipelines] = useState<Pipeline[] | null>(null);

  useEffect(() => {
    let active = true;
    getPublicPipelines().then((result) => {
      if (active) setPipelines(result);
    });
    return () => {
      active = false;
    };
  }, []);

  if (pipelines === null) {
    return (
      <div className="py-24 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading pipeline catalog...</span>
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6 rounded-2xl border border-dashed border-border bg-muted/10">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <GitBranch className="w-7 h-7 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">No public pipelines yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          Pipelines marked public by their owners will be listed here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {pipelines.map((pipeline) => (
        <PipelineMarketplaceCard key={pipeline.id} pipeline={pipeline} />
      ))}
    </div>
  );
}
