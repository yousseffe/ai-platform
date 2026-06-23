import React, { Suspense } from "react";
import { Metadata } from "next";
import { getPublicModels } from "@/lib/actions/models.actions";
import MarketplaceLandingClient from "./MarketplaceLandingClient";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "AI Model Marketplace - MLHub",
  description: "Discover, test, and integrate production-grade machine learning models built by the MLHub community.",
};

function MarketplaceLandingLoader() {
  return (
    <div className="max-w-7xl mx-auto py-24 text-center font-mono text-xs text-muted-foreground animate-pulse">
      Loading MLHub model registry...
    </div>
  );
}

export default async function MarketplacePage() {
  const publicModels = await getPublicModels();

  return (
    <Suspense fallback={<MarketplaceLandingLoader />}>
      <MarketplaceLandingClient publicModels={publicModels} />
    </Suspense>
  );
}
