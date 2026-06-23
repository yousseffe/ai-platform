"use client";

import React from "react";
import UploadModelWizard from "@/components/models/UploadModelWizard";
import { FeatureBadges } from "@/components/models/FeatureBadges";

/**
 * Page component for uploading and creating a new machine learning model.
 * Displays step-by-step guidance on initializing ML container builds.
 *
 * @returns The page component rendering the multi-step model upload wizard.
 */
export default function UploadModelPage() {
  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in duration-500 text-foreground space-y-8">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground font-mono">Upload Model Artifacts</h1>
        <p className="text-xs text-muted-foreground font-mono">
          Initialize your production environment by uploading your pre-trained model and support scripts.
        </p>
      </div>

      {/* Interactive Step Wizard */}
      <UploadModelWizard />

      {/* Informative Footer Badges */}
      <FeatureBadges />
    </div>
  );
}
