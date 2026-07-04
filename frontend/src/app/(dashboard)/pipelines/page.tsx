import React from "react";
import { Metadata } from "next";
import { getPipelines } from "@/lib/actions/pipelines.actions";
import { PipelinesTable } from "@/components/pipelines/PipelinesTable";
import { CreatePipelineDialog } from "@/components/pipelines/CreatePipelineDialog";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader
        title="Pipelines"
        description="Chain your models together — the output of one step feeds into the next."
        actions={<CreatePipelineDialog />}
      />

      <PipelinesTable pipelines={pipelines} />
    </div>
  );
}
