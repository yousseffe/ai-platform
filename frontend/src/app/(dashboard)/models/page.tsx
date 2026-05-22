import React from "react";
import { Filter, Plus } from "lucide-react";
import Link from "next/link";
import { getModels } from "@/lib/actions/models.actions";
import type { Model, ModelVersion } from "@/types";
import { RegistryStatsOverview } from "@/components/models/RegistryStatsOverview";
import { ModelsTable, RegistryModelItem } from "@/components/models/ModelsTable";

export const revalidate = 0;

/**
 * Server Component representing the Model Registry listing page.
 * Fetches models lists, aggregates details, and renders dashboard metrics & tables.
 *
 * @returns The page component rendering the models registry container.
 */
export default async function ModelsRegistryPage() {
  const rawModels = await getModels();

  // Maps backend model list into RegistryModelItem objects
  const models: RegistryModelItem[] = rawModels.map((m: Model) => {
    const versions = m.versions || [];
    const latestVersionNumber = versions.length
      ? Math.max(...versions.map((v: ModelVersion) => v.versionNumber))
      : 0;
    const prevVersionNumber = latestVersionNumber > 1 ? latestVersionNumber - 1 : 0;
    const latestVersion = versions.find((v) => v.versionNumber === latestVersionNumber);

    let status = "Draft";
    if (latestVersion) {
      status = latestVersion.status === "ready" ? "Ready" : latestVersion.status;
      const activeDeployment = latestVersion.deployments?.find((d) => d.status === "running");
      if (activeDeployment) {
        status = "Deployed";
      }
    }

    return {
      id: m.id,
      initials: m.name.substring(0, 2).toUpperCase(),
      name: m.name,
      time: new Date(m.createdAt).toLocaleDateString(),
      type: m.description || "Unknown",
      version: latestVersionNumber > 0 ? `v${latestVersionNumber}` : "-",
      prevVersion: prevVersionNumber > 0 ? `v${prevVersionNumber}` : "",
      status: status,
    };
  });

  // Calculate status counts for stats grid
  const productionReadyCount = models.filter((m) => m.status === "Deployed" || m.status === "Ready").length;
  const buildingCount = models.filter((m) => m.status.toLowerCase() === "building").length;
  const failedCount = models.filter((m) => m.status.toLowerCase() === "failed").length;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Title & Action Buttons Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Models Registry</h1>
          <p className="text-slate-500 mt-1">Manage, version, and deploy your machine learning assets across environments.</p>
        </div>
        <div className="flex gap-3">
          <button type="button" className="btn-outline cursor-pointer flex items-center gap-1.5">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <Link href="/models/upload" className="btn-primary">
            <Plus className="w-4 h-4" /> New Model
          </Link>
        </div>
      </div>

      {/* Registry Specific Status Metric Cards */}
      <RegistryStatsOverview
        totalModels={models.length}
        productionReadyCount={productionReadyCount}
        buildingCount={buildingCount}
        failedCount={failedCount}
      />

      {/* Models Interactive Registry Table */}
      <ModelsTable models={models} />
    </div>
  );
}
