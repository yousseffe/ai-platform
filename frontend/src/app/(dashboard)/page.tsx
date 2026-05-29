"use client";

import React, { useState, useEffect } from "react";
import { getModels } from "@/lib/actions/models.actions";
import { Model, ModelVersion, DeploymentStatus, VersionStatus, WalletType } from "@/types";
import { useWorkspace } from "@/hooks/use-workspace";
import { RecentModelItem } from "@/components/dashboard/RecentModelsTable";
import ConsumerDashboard from "@/components/dashboard/ConsumerDashboard";
import PublisherDashboard from "@/components/dashboard/PublisherDashboard";

/**
 * Dashboard Controller page resolving consumer vs provider workspace layouts.
 * Loads registered platform models from actions and delegates rendering to subcomponents.
 */
export default function DashboardPage() {
  const { viewMode, balance } = useWorkspace();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    getModels()
      .then((data) => {
        if (active) {
          setModels(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Calculate live deployments
  let activeDeploymentsCount = 0;
  models.forEach((m) => {
    m.versions?.forEach((v) => {
      v.deployments?.forEach((d) => {
        if (d.status === DeploymentStatus.RUNNING) {
          activeDeploymentsCount++;
        }
      });
    });
  });

  // Calculate recent model configurations (for Consumer)
  const recentModels: RecentModelItem[] = models.slice(0, 5).map((m: Model) => {
    const versions = m.versions || [];
    const latestVersion = versions.length
      ? [...versions].sort((a: ModelVersion, b: ModelVersion) => b.versionNumber - a.versionNumber)[0]
      : null;

    let status = "DRAFT";
    if (latestVersion) {
      status = latestVersion.status === VersionStatus.READY ? "READY" : latestVersion.status.toUpperCase();
      const hasActive = latestVersion.deployments?.some((d) => d.status === DeploymentStatus.RUNNING);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Resolving workspace dashboard...</span>
        </div>
      </div>
    );
  }

  if (viewMode === WalletType.PROVIDER) {
    return <PublisherDashboard models={models} balance={balance} />;
  }

  return (
    <ConsumerDashboard
      models={models}
      activeDeploymentsCount={activeDeploymentsCount}
      recentModels={recentModels}
    />
  );
}
