import { notFound } from "next/navigation";
import { Metadata } from "next";

import { getPublicPipelineById } from "@/lib/actions/pipelines.actions";
import { PublicPipelineDetailClient } from "./PublicPipelineDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Generates dynamic SEO metadata for the public pipeline detail page.
 *
 * @param props - Page props containing the pipeline ID route param.
 * @returns Metadata object for Next.js head injection.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const pipeline = await getPublicPipelineById(id);
  if (!pipeline) {
    return { title: "Pipeline Not Found — Qantara" };
  }
  return {
    title: `${pipeline.name} — Qantara Pipeline Catalog`,
    description: pipeline.description || `Explore the "${pipeline.name}" model chain on Qantara.`,
  };
}

/**
 * Public pipeline detail page — accessible without authentication.
 * Displays the pipeline's step chain and metadata.
 *
 * @param props - Page props with the pipeline ID from the URL.
 * @returns The rendered pipeline detail page.
 */
export default async function PublicPipelineDetailPage({ params }: PageProps) {
  const { id } = await params;
  const pipeline = await getPublicPipelineById(id);

  if (!pipeline) {
    notFound();
  }

  return <PublicPipelineDetailClient pipeline={pipeline} />;
}
