import React from "react";
import { Metadata } from "next";
import { getPipelines } from "@/lib/actions/pipelines.actions";
import { PipelinesTable } from "@/components/pipelines/PipelinesTable";
import { CreatePipelineDialog } from "@/components/pipelines/CreatePipelineDialog";

export const revalidate = 0;

/**
 * Static metadata configuration for the Pipelines listing page.
 */
export const metadata: Metadata = {
  title: "Pipelines - MLHub",
  description: "Chain deployed models together, mapping each step's output into the next step's input.",
};

/**
 * Server Component representing the Pipelines listing page.
 * Fetches the authenticated user's pipelines and renders the registry table.
 *
 * @returns The page component rendering the pipelines list container.
 */
export default async function PipelinesPage() {
  const pipelines = await getPipelines();

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground font-mono">Pipelines</h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Chain your models together — the output of one step feeds into the next.
          </p>
        </div>
        <CreatePipelineDialog />
      </div>

      <PipelinesTable pipelines={pipelines} />
    </div>
  );
}
