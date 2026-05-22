import React from "react";
import { getModel } from "@/lib/actions/models.actions";
import { notFound } from "next/navigation";
import TestPredictionClient from "./TestPredictionClient";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function TestPredictionPage({ params }: PageProps) {
  const resolvedParams = await params;
  const model = await getModel(resolvedParams.id);

  if (!model) {
    notFound();
  }

  return <TestPredictionClient model={model} />;
}
