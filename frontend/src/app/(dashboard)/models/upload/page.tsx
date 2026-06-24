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
    <div className="w-full pb-12 animate-in fade-in duration-500 text-foreground space-y-6">
      {/* Page Header & Developer Pipeline Preview */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/50 pb-5">
        <div className="text-left space-y-1">
          <h1 className="text-lg font-bold text-foreground tracking-tight">Deploy Model Pipeline</h1>
          <p className="text-xs text-muted-foreground">
            Upload your serialized weights and preprocessing scripts to compile a server container.
          </p>
        </div>
        
        {/* Visual Pipeline indicator */}
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary/30 border border-border/40 p-1.5 rounded-lg select-none">
          <span className="text-primary font-semibold">1. Upload</span>
          <span className="opacity-50">→</span>
          <span className="opacity-75">2. Build</span>
          <span className="opacity-50">→</span>
          <span className="opacity-75">3. Verify</span>
          <span className="opacity-50">→</span>
          <span className="opacity-75">4. Live</span>
        </div>
      </div>

      {/* Interactive Step Wizard */}
      <UploadModelWizard />

      {/* Informative Footer Badges */}
      <FeatureBadges />
    </div>
  );
}
