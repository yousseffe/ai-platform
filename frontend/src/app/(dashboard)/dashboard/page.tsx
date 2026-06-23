"use client";

import React, { useState, useEffect } from "react";
import { getModels, getConsumerLogs, getProviderLogs } from "@/lib/actions/models.actions";
import { Model, ModelLog, WalletType } from "@/types";
import { useWorkspace } from "@/hooks/use-workspace";
import ConsumerDashboard from "@/components/dashboard/ConsumerDashboard";
import PublisherDashboard from "@/components/dashboard/PublisherDashboard";

/**
 * Dashboard Controller page resolving consumer vs provider workspace layouts.
 * Loads registered platform models and user prediction logs to render role-specific consoles.
 */
export default function DashboardPage() {
  const { viewMode, balance } = useWorkspace();
  const [models, setModels] = useState<Model[]>([]);
  const [logs, setLogs] = useState<ModelLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    
    const loadingTimeout = setTimeout(() => {
      if (active) setLoading(true);
    }, 0);

    const loadDashboardData = async () => {
      try {
        // Fetch all models
        const fetchedModels = await getModels();
        
        // Fetch logs matching the view mode
        let fetchedLogs: ModelLog[] = [];
        if (viewMode === WalletType.PROVIDER) {
          fetchedLogs = await getProviderLogs();
        } else {
          fetchedLogs = await getConsumerLogs();
        }

        if (active) {
          setModels(fetchedModels);
          setLogs(fetchedLogs);
          setLoading(false);
        }
      } catch (err) {
        console.error("Dashboard controller loading failed:", err);
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      active = false;
      clearTimeout(loadingTimeout);
    };
  }, [viewMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] font-mono text-xs text-slate-500">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <span className="font-medium">Resolving workspace dashboard...</span>
        </div>
      </div>
    );
  }

  if (viewMode === WalletType.PROVIDER) {
    return <PublisherDashboard models={models} balance={balance} logs={logs} />;
  }

  return <ConsumerDashboard logs={logs} />;
}
