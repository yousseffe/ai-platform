"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useOrgContext } from "@/hooks/use-org-context";
import { OrgType, OrgAction } from "@/types";
import OrgTypeBadge from "@/components/orgs/OrgTypeBadge";
import OrgCapabilityPanel, { consumerWorkflowSteps, providerWorkflowSteps } from "@/components/orgs/OrgCapabilityPanel";
import OrgMetricCard from "@/components/orgs/OrgMetricCard";
import { Users, FolderKanban, Layers, Coins, TrendingUp, Calendar, ArrowRight, Building2 } from "lucide-react";
import { smartFetch } from "@/lib/utils/smart-fetch";

interface OrgStats {
  memberCount: number;
  modelCount: number;
  projectCount: number;
  consumerBalance: number;
  totalEarnings: number;
}

/**
 * Org Overview page — displays org identity and key stats.
 * Stats adapt to OrgType (Provider/Consumer/Hybrid) and user role.
 *
 * @returns The React page component.
 */
export default function OrgOverviewPage() {
  const { org, can } = useOrgContext();
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (!org) return;
    const fetchStats = async () => {
      setIsLoadingStats(true);
      try {
        const data = await smartFetch<OrgStats>(`/organizations/${org.id}/stats`, {
          headers: { "X-Workspace-Id": org.id },
        });
        setStats(data);
      } catch {
        setStats(null);
      } finally {
        setIsLoadingStats(false);
      }
    };
    fetchStats();
  }, [org]);

  if (!org) return null;

  const showProvider = org.type === OrgType.PROVIDER || org.type === OrgType.HYBRID;
  const showConsumer = org.type === OrgType.CONSUMER || org.type === OrgType.HYBRID;
  const modeMessage =
    org.type === OrgType.HYBRID
      ? "Hybrid workspace: consume marketplace models and coordinate provider-side model publishing from one shared console."
      : org.type === OrgType.CONSUMER
        ? "Consumer workspace: create projects, generate API keys, and run marketplace model predictions from a shared wallet."
        : "Provider workspace: track team model publishing, readiness, deployments, and provider wallet activity.";

  const statCards = [
    { label: "Members", value: stats?.memberCount ?? "—", icon: <Users className="w-4 h-4" strokeWidth={1.8} />, tone: "blue" as const, caption: "Active organization collaborators", show: true },
    { label: "Projects", value: stats?.projectCount ?? "—", icon: <FolderKanban className="w-4 h-4" strokeWidth={1.8} />, tone: "primary" as const, caption: "Consumer app workspaces", show: showConsumer },
    { label: "Models Published", value: stats?.modelCount ?? "—", icon: <Layers className="w-4 h-4" strokeWidth={1.8} />, tone: "emerald" as const, caption: "Organization-owned provider registry", show: showProvider },
    { label: "Credits Balance", value: stats ? `${stats.consumerBalance.toLocaleString()} cr` : "—", icon: <Coins className="w-4 h-4" strokeWidth={1.8} />, tone: "amber" as const, caption: "Shared consumer wallet", show: showConsumer && can(OrgAction.VIEW_BILLING) },
    { label: "Total Earnings", value: stats ? `${stats.totalEarnings.toLocaleString()} cr` : "—", icon: <TrendingUp className="w-4 h-4" strokeWidth={1.8} />, tone: "emerald" as const, caption: "Provider wallet balance", show: showProvider && can(OrgAction.VIEW_BILLING) },
  ].filter((c) => c.show);

  return (
    <div className="space-y-5 max-w-6xl animate-fade-in">
      <div className="border-b border-border pb-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 text-primary font-extrabold text-base flex items-center justify-center shrink-0">
            {org.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground tracking-tight">{org.name}</h1>
              <OrgTypeBadge type={org.type} size="sm" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                {org.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              {org.description || modeMessage}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
                Created {new Date(org.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                {modeMessage}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {showConsumer && (
            <Link href={`/orgs/${org.slug}/projects`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-secondary transition-colors">
              <FolderKanban className="w-3.5 h-3.5 text-primary" strokeWidth={1.8} />
              Projects
            </Link>
          )}
          {can(OrgAction.VIEW_BILLING) && (
            <Link href={`/orgs/${org.slug}/billing`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/95 transition-colors">
              {showProvider && !showConsumer ? (
                <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.8} />
              ) : (
                <Coins className="w-3.5 h-3.5" strokeWidth={1.8} />
              )}
              {showProvider && !showConsumer ? "Provider Finance" : "Billing"}
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <OrgMetricCard
            key={card.label}
            label={card.label}
            value={isLoadingStats ? <span className="inline-block w-12 h-6 bg-muted rounded animate-pulse" /> : card.value}
            icon={card.icon}
            tone={card.tone}
            caption={card.caption}
          />
        ))}
      </div>

      <OrgCapabilityPanel orgSlug={org.slug} orgType={org.type} />

      {showProvider && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-5 border-b border-border bg-secondary/20 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Provider Governance Workflow</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Contributors submit work. Owners and maintainers review, approve, decline, and enforce release decisions.
              </p>
            </div>
            <Link href={`/orgs/${org.slug}/models`} className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              Open Provider Models <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
            {providerWorkflowSteps.map((step, index) => (
              <div key={step.title} className="p-5 min-h-[145px]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/15">
                    {step.icon}
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground font-mono">0{index + 1}</span>
                </div>
                <h3 className="text-sm font-bold text-foreground mt-4">{step.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {showConsumer && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-5 border-b border-border bg-secondary/20 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Consumer Workflow</h2>
              <p className="text-xs text-muted-foreground mt-1">
                The organization consumes marketplace models through projects and scoped keys.
              </p>
            </div>
            <Link href={`/orgs/${org.slug}/projects`} className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
              Open Projects <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
            {consumerWorkflowSteps.map((step, index) => (
              <div key={step.title} className="p-5 min-h-[145px]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/15">
                    {step.icon}
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground font-mono">0{index + 1}</span>
                </div>
                <h3 className="text-sm font-bold text-foreground mt-4">{step.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
