import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getPipeline, listPipelineRuns, listPipelineEdges } from "@/lib/actions/pipelines.actions";
import { getModels } from "@/lib/actions/models.actions";
import { VersionStatus } from "@/types";
import { PipelineDetailsClient } from "./PipelineDetailsClient";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * Static metadata configuration for the Pipeline detail/builder page.
 */
export const metadata: Metadata = {
  title: "Pipeline Builder - Qantara",
};

/**
 * Server Component for a single pipeline's detail/builder/run view. Fetches
 * the pipeline (with its steps), recent runs, and the caller's own READY
 * model versions (the pool a new step can be bound to), then hands them off
 * to the thin client orchestration component.
 *
 * @param props - Next.js route props carrying the pipeline ID param.
 * @returns The page component rendering the pipeline builder container.
 */
export default async function PipelineDetailPage({ params }: PageProps) {
  const resolvedParams = await params;

  const [pipeline, runs, edges, models] = await Promise.all([
    getPipeline(resolvedParams.id),
    listPipelineRuns(resolvedParams.id),
    listPipelineEdges(resolvedParams.id),
    getModels(),
  ]);

  if (!pipeline) {
    notFound();
  }

  const readyVersionOptions = models.flatMap((model) =>
    (model.versions ?? [])
      .filter((version) => version.status === VersionStatus.READY)
      .map((version) => ({
        modelVersionId: version.id,
        label: `${model.name} · v${version.versionNumber}`,
      }))
  );

  return (
    <PipelineDetailsClient
      pipeline={pipeline}
      runs={runs}
      edges={edges}
      readyVersionOptions={readyVersionOptions}
    />
  );
}
