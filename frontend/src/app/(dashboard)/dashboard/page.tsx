"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getModels, getConsumerLogs, getProviderInsights, getProviderLogs } from "@/lib/actions/models.actions";
import { Model, ModelLog, ProviderInsights, WalletType } from "@/types";
import { useWorkspace } from "@/hooks/use-workspace";
import ConsumerDashboard from "@/components/dashboard/ConsumerDashboard";
import PublisherDashboard from "@/components/dashboard/PublisherDashboard";

/**
 * Dashboard Controller page resolving consumer vs provider workspace layouts.
 * Loads registered platform models and user prediction logs to render role-specific consoles.
 */
export default function DashboardPage() {
  const router = useRouter();
  const { activeWorkspace, viewMode, balance, isAdmin, isLoading: workspaceLoading } = useWorkspace();
  const [models, setModels] = useState<Model[]>([]);
  const [logs, setLogs] = useState<ModelLog[]>([]);
  const [providerInsights, setProviderInsights] = useState<ProviderInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const activeWorkspaceId = activeWorkspace?.id;

  // Redirect admin users to their console
  useEffect(() => {
    if (isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, router]);

  useEffect(() => {
    let active = true;

    if (workspaceLoading || !activeWorkspaceId) {
      Promise.resolve().then(() => {
        if (active) setLoading(true);
      });
      return () => {
        active = false;
      };
    }
    
    const loadingTimeout = setTimeout(() => {
      if (active) setLoading(true);
    }, 0);

    const loadDashboardData = async () => {
      try {
        let fetchedModels: Model[] = [];
        let fetchedLogs: ModelLog[] = [];
        let fetchedInsights: ProviderInsights | null = null;

        if (viewMode === WalletType.PROVIDER) {
          [fetchedModels, fetchedLogs, fetchedInsights] = await Promise.all([
            getModels(),
            getProviderLogs(),
            getProviderInsights(30),
          ]);
        } else {
          [fetchedModels, fetchedLogs] = await Promise.all([
            getModels(),
            getConsumerLogs(),
          ]);
        }

        if (active) {
          setModels(fetchedModels);
          setLogs(fetchedLogs);
          setProviderInsights(fetchedInsights);
          setLoading(false);
        }
      } catch (err) {
        console.error("Dashboard controller loading failed:", err);
        if (active) {
          setModels([]);
          setLogs([]);
          setProviderInsights(null);
          setLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      active = false;
      clearTimeout(loadingTimeout);
    };
  }, [activeWorkspaceId, viewMode, workspaceLoading]);

  if (loading) {
    return (
      <div className="w-full space-y-6 font-sans">
        {/* Shimmer Header */}
        <div className="border-b border-border pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2 text-left">
            <div className="h-6 w-48 bg-muted animate-pulse rounded-lg" />
            <div className="h-4 w-72 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-9 w-32 bg-muted animate-pulse rounded-lg" />
        </div>

        {/* Shimmer Indicator Banner */}
        <div className="h-10 w-full bg-muted animate-pulse rounded-xl" />

        {/* Shimmer Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-28 bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
            <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            <div className="h-8 w-16 bg-muted animate-pulse rounded-lg" />
            <div className="h-3 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-28 bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-12 bg-muted animate-pulse rounded-lg" />
            <div className="h-3 w-28 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-28 bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
            <div className="h-3 w-28 bg-muted animate-pulse rounded" />
            <div className="h-8 w-24 bg-muted animate-pulse rounded-lg" />
            <div className="h-3 w-36 bg-muted animate-pulse rounded" />
          </div>
        </div>

        {/* Shimmer Main Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Shimmer Table */}
          <div className="lg:col-span-2 border border-border bg-card rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center pb-2">
              <div className="h-4 w-36 bg-muted animate-pulse rounded" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            </div>
            <div className="space-y-3">
              <div className="h-8 bg-muted animate-pulse rounded-md" />
              <div className="h-10 bg-muted/60 animate-pulse rounded-md" />
              <div className="h-10 bg-muted/40 animate-pulse rounded-md" />
              <div className="h-10 bg-muted/20 animate-pulse rounded-md" />
            </div>
          </div>
          {/* Shimmer Sidebar card */}
          <div className="border border-border bg-card rounded-xl p-5 space-y-4 flex flex-col justify-between h-[300px]">
            <div className="space-y-3">
              <div className="h-4 w-28 bg-muted animate-pulse rounded" />
              <div className="h-3 w-full bg-muted animate-pulse rounded" />
              <div className="h-3 w-5/6 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-10 w-full bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === WalletType.PROVIDER) {
    return (
      <PublisherDashboard
        models={models}
        balance={balance}
        logs={logs}
        insights={providerInsights}
      />
    );
  }

  return <ConsumerDashboard logs={logs} />;
}
