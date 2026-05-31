import React from "react";
import { Metadata } from "next";
import { getModel } from "@/lib/actions/models.actions";
import { notFound } from "next/navigation";
import ModelDetailsClient from "./ModelDetailsClient";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

/**
 * Dynamically generates SEO metadata for the specific model details page.
 *
 * @param props - Route parameters containing the model ID.
 * @returns A promise resolving to the metadata config.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const model = await getModel(resolvedParams.id);

  if (!model) {
    return {
      title: "Model Not Found | MLHub",
      description: "The requested machine learning model could not be found.",
    };
  }

  return {
    title: `${model.name} - Model Details | MLHub`,
    description: model.description || `Explore version history, framework configurations, and sandbox deployments for ${model.name}.`,
  };
}

export default async function ModelDetailsPage({ params }: PageProps) {
  // Await params if it's a promise (standard in Next 15/16)
  const resolvedParams = await params;
  const model = await getModel(resolvedParams.id);

  if (!model) {
    notFound();
  }

  return <ModelDetailsClient initialModel={model} modelId={resolvedParams.id} />;
}
