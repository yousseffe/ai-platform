import React from "react";
import { getModel } from "@/lib/actions/models.actions";
import { notFound } from "next/navigation";
import ModelDetailsClient from "./ModelDetailsClient";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
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
