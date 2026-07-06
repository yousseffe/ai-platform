"use client";

import React from "react";
import { Terminal, Coins, Zap, GitCompareArrows } from "lucide-react";
import Link from "next/link";
import { useWorkspace } from "@/hooks/use-workspace";
import { ModelLog } from "@/types";
import { InferenceLogsTable } from "./InferenceLogsTable";
import BecomeProviderCard from "./BecomeProviderCard";
import DashboardHeader from "./shared/DashboardHeader";
import DashboardBanner from "./shared/DashboardBanner";
import MetricCard from "./shared/MetricCard";
import SidebarGuideCard from "./shared/SidebarGuideCard";
import { Card, CardContent } from "@/components/ui/card";

interface ConsumerDashboardProps {
  logs: ModelLog[];
}

export default function ConsumerDashboard({ logs }: ConsumerDashboardProps) {
  const { balance, canAccessBilling } = useWorkspace();

  return (
    <div className="w-full space-y-5 animate-fade-in text-foreground font-sans">
      
      {/* Reusable Header */}
      <DashboardHeader
        title="Consumer Hub"
        description="Manage your credentials, monitor your inference spend balance, and inspect query logs."
        icon={Coins}
        actions={
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary via-primary-600 to-primary-700 hover:opacity-95 text-primary-foreground font-bold px-4 h-9 rounded-lg text-xs shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />
            Explore Marketplace
          </Link>
        }
      />

      {/* Reusable Banner */}
      <DashboardBanner
        title="Active Role: API Consumer."
        description="You are charged per prediction query based on the model pricing tier. Switch roles or workspaces in the sidebar."
        icon={Terminal}
        color="primary"
      />

      <BecomeProviderCard />

      <Card className="border border-border bg-card/80 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              New Consumer Tool
            </p>
            <h3 className="text-lg font-bold text-foreground">
              Compare multiple models before you commit spend
            </h3>
            <p className="text-sm text-muted-foreground">
              Run the same prompt across marketplace models and instantly compare output, latency, tokens, errors, and cost.
            </p>
          </div>
          <Link
            href="/dashboard/compare-models"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/95"
          >
            <GitCompareArrows className="h-4 w-4" />
            Open Compare Models
          </Link>
        </CardContent>
      </Card>

      {/* Reusable Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <MetricCard
          title="Consumer Balance"
          value={canAccessBilling ? `${balance.toFixed(2)} Credits` : "Restricted"}
          icon={Coins}
          color="primary"
          actionLabel={canAccessBilling ? "Top Up Balance" : undefined}
          actionHref={canAccessBilling ? "/settings" : undefined}
          actionDisabledText={canAccessBilling ? undefined : "Only organization owners can view shared billing."}
        />

        <MetricCard
          title="Inference Requests"
          value={logs.length.toString()}
          icon={Terminal}
          color="blue"
          footerText="Total queries processed in recent history"
        />
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Inference Logs Table */}
        <InferenceLogsTable logs={logs} title="Recent Inference Query Logs" />

        {/* Reusable Sidebar Quickstart integration guide */}
        <SidebarGuideCard
          title="API Integration"
          icon={Zap}
          steps={[
            {
              title: "Authenticate Request Headers",
              description: "Pass your client secret token inside your request headers:",
              code: "Authorization: Bearer YOUR_TOKEN",
            },
            {
              title: "Execute Prediction Queries",
              description: "Query any marketplace model endpoint at the prediction route:",
              code: "POST /models/:modelId/predict",
            },
            {
              title: "Monitor Ledgers Logs",
              description: "Each execution deducts credits from your balance and is recorded here.",
            },
          ]}
          color="primary"
          actionLabel="Explore Catalog"
          actionHref="/explore"
        />
      </div>

    </div>
  );
}
