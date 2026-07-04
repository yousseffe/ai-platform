import React, { Suspense } from "react";
import { Metadata } from "next";
import MarketplaceExploreClient from "./MarketplaceExploreClient";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Explore Models Catalog - Qantara",
  description: "Browse, filter, and search community machine learning models in the Qantara catalog.",
};

/**
 * Lightweight loading fallback shown while the explore client component hydrates.
 */
function MarketplaceExploreLoader() {
  return (
    <div className="max-w-6xl mx-auto py-12 text-center font-mono text-xs text-muted-foreground animate-pulse">
      Loading models registry catalog...
    </div>
  );
}

/**
 * Explore page server component.
 * Search is executed client-side via the OpenSearch server action — no pre-fetch needed.
 */
export default function MarketplaceExplorePage() {
  return (
    <Suspense fallback={<MarketplaceExploreLoader />}>
      <MarketplaceExploreClient />
    </Suspense>
  );
}
