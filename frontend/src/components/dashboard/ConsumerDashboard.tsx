"use client";

import React from "react";
import { Upload } from "lucide-react";
import Link from "next/link";
import { StatsOverview } from "./StatsOverview";
import { RecentModelsTable, RecentModelItem } from "./RecentModelsTable";
import { ResourceUtilization } from "./ResourceUtilization";
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
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Overview</h1>
          <p className="text-slate-500 mt-1">Manage and monitor your machine learning infrastructure.</p>
        </div>
        <Link href="/models/upload" className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-all shadow-sm shadow-primary-500/10">
          <Upload className="w-4 h-4" />
          Upload Model
        </Link>
      </div>

      {/* Stats Summary Grid */}
      <StatsOverview
        totalModels={models.length}
        activeDeploymentsCount={activeDeploymentsCount}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Models Table Widget */}
        <RecentModelsTable recentModels={recentModels} />

        {/* Resources Metrics & Recommendations */}
        <ResourceUtilization />
      </div>
    </div>
  );
}
