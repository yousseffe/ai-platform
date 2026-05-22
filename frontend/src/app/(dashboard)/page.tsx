import React from "react";
import { Upload } from "lucide-react";
import Link from "next/link";
import { getModels } from "@/lib/actions/models.actions";
import { Model, ModelVersion } from "@/types";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { RecentModelsTable, RecentModelItem } from "@/components/dashboard/RecentModelsTable";
import { ResourceUtilization } from "@/components/dashboard/ResourceUtilization";

export const revalidate = 0;

/**
 * Server Component representing the landing system overview dashboard page.
 * Fetches all models and maps active deployments and recent activities.
 *
 * @returns The page component structure for System Overview.
 */
export default async function DashboardPage() {
  const models = await getModels();

  // Calculate live deployments
  let activeDeploymentsCount = 0;
  models.forEach((m) => {
    m.versions?.forEach((v) => {
      v.deployments?.forEach((d) => {
        if (d.status === "running") {
          activeDeploymentsCount++;
        }
      });
    });
  });

  // Calculate recent model configurations
  const recentModels: RecentModelItem[] = models.slice(0, 5).map((m: Model) => {
    const versions = m.versions || [];
    const latestVersion = versions.length
      ? [...versions].sort((a: ModelVersion, b: ModelVersion) => b.versionNumber - a.versionNumber)[0]
      : null;

    let status = "DRAFT";
    if (latestVersion) {
      status = latestVersion.status === "ready" ? "READY" : latestVersion.status.toUpperCase();
      const hasActive = latestVersion.deployments?.some((d) => d.status === "running");
      if (hasActive) {
        status = "LIVE";
      }
    }

    return {
      id: m.id,
      name: m.name,
      type: m.description || "Unknown",
      status: status,
      time: new Date(m.createdAt).toLocaleDateString(),
    };
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Overview</h1>
          <p className="text-slate-500 mt-1">Manage and monitor your machine learning infrastructure.</p>
        </div>
        <Link href="/models/upload" className="btn-primary">
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
