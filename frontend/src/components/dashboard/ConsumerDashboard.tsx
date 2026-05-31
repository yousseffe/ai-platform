"use client";

import React from "react";
import { Upload } from "lucide-react";
import Link from "next/link";
import { StatsOverview } from "./StatsOverview";
import { RecentModelsTable, RecentModelItem } from "./RecentModelsTable";
import { ResourceUtilization } from "./ResourceUtilization";
import ContributionsHeatmap from "./ContributionsHeatmap";
import { Model } from "@/types";

interface ConsumerDashboardProps {
  models: Model[];
  activeDeploymentsCount: number;
  recentModels: RecentModelItem[];
}

/**
 * Consumer Dashboard View.
 * Displays total models count, active deployments count, recent models table,
 * and hardware resource utilization.
 *
 * @param props - Component properties containing statistics and model arrays.
 * @returns The React component rendering the consumer dashboard interface.
 */
export default function ConsumerDashboard({
  models,
  activeDeploymentsCount,
  recentModels,
}: ConsumerDashboardProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in text-foreground">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground font-mono">Developer Console</h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Manage, deploy, and monitor your machine learning models and serverless infrastructure.
          </p>
        </div>
        <Link href="/models/upload" className="btn-primary flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Upload Model
        </Link>
      </div>

      {/* Stats Summary Grid */}
      <StatsOverview
        totalModels={models.length}
        activeDeploymentsCount={activeDeploymentsCount}
      />

      {/* Inference Activity Heatmap Grid */}
      <ContributionsHeatmap />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Models Table Widget */}
        <RecentModelsTable recentModels={recentModels} />

        {/* Resources Metrics & Recommendations */}
        <ResourceUtilization />
      </div>
    </div>
  );
}
