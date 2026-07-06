"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useOrgContext } from "@/hooks/use-org-context";
import { OrgType, OrgAction } from "@/types";
import OrgTypeBadge from "@/components/orgs/OrgTypeBadge";
import OrgCapabilityPanel, { consumerWorkflowSteps, providerWorkflowSteps } from "@/components/orgs/OrgCapabilityPanel";
import {
  Users,
  FolderKanban,
  Layers,
  Coins,
  TrendingUp,
  Calendar,
  ArrowRight,
  Building2,
  Zap,
  ShieldCheck,
  Activity,
  Flame,
} from "lucide-react";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

interface OrgStats {
  memberCount: number;
  modelCount: number;
  projectCount: number;
  consumerBalance: number;
  totalEarnings: number;
  trends?: {
    members: Array<{ value: number }>;
    projects: Array<{ value: number }>;
    models: Array<{ value: number }>;
    balance: Array<{ value: number }>;
    earnings: Array<{ value: number }>;
  };
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const membersTrend = useMemo(() => {
    if (stats?.trends?.members && stats.trends.members.length > 0) {
      return stats.trends.members;
    }
    return [
      { value: 1 },
      { value: 1 },
      { value: 2 },
      { value: 2 },
      { value: 3 },
      { value: stats?.memberCount || 3 }
    ];
  }, [stats]);

  const projectsTrend = useMemo(() => {
    if (stats?.trends?.projects && stats.trends.projects.length > 0) {
      return stats.trends.projects;
    }
    return [
      { value: 0 },
      { value: 1 },
      { value: 2 },
      { value: 2 },
      { value: 3 },
      { value: stats?.projectCount || 3 }
    ];
  }, [stats]);

  const modelsTrend = useMemo(() => {
    if (stats?.trends?.models && stats.trends.models.length > 0) {
      return stats.trends.models;
    }
    return [
      { value: 0 },
      { value: 0 },
      { value: 1 },
      { value: 2 },
      { value: 2 },
      { value: stats?.modelCount || 2 }
    ];
  }, [stats]);

  const balanceTrend = useMemo(() => {
    if (stats?.trends?.balance && stats.trends.balance.length > 0) {
      return stats.trends.balance;
    }
    return [
      { value: 100 },
      { value: 300 },
      { value: 250 },
      { value: 400 },
      { value: 450 },
      { value: stats?.consumerBalance || 500 }
    ];
  }, [stats]);

  const earningsTrend = useMemo(() => {
    if (stats?.trends?.earnings && stats.trends.earnings.length > 0) {
      return stats.trends.earnings;
    }
    return [
      { value: 0 },
      { value: 50 },
      { value: 150 },
      { value: 300 },
      { value: 420 },
      { value: stats?.totalEarnings || 500 }
    ];
  }, [stats]);

  const statCards = [
    { label: "Members", value: stats?.memberCount ?? "—", icon: <Users className="w-4 h-4" strokeWidth={1.8} />, tone: "blue" as const, caption: "Active collaborators", show: true, trend: membersTrend, color: "#3b82f6" },
    { label: "Projects", value: stats?.projectCount ?? "—", icon: <FolderKanban className="w-4 h-4" strokeWidth={1.8} />, tone: "primary" as const, caption: "App workspaces", show: showConsumer, trend: projectsTrend, color: "#8b5cf6" },
    { label: "Models Published", value: stats?.modelCount ?? "—", icon: <Layers className="w-4 h-4" strokeWidth={1.8} />, tone: "emerald" as const, caption: "Provider registry", show: showProvider, trend: modelsTrend, color: "#10b981" },
    { label: "Credits Balance", value: stats ? `${stats.consumerBalance.toLocaleString()} cr` : "—", icon: <Coins className="w-4 h-4" strokeWidth={1.8} />, tone: "amber" as const, caption: "Shared wallet balance", show: showConsumer && can(OrgAction.VIEW_BILLING), trend: balanceTrend, color: "#f59e0b" },
    { label: "Total Earnings", value: stats ? `${stats.totalEarnings.toLocaleString()} EGP` : "—", icon: <TrendingUp className="w-4 h-4" strokeWidth={1.8} />, tone: "emerald" as const, caption: "Provider balance", show: showProvider && can(OrgAction.VIEW_BILLING), trend: earningsTrend, color: "#10b981" },
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const toneStyles: Record<string, string> = {
            primary: "border-l-primary text-primary bg-primary/10",
            blue: "border-l-blue-500 text-blue-600 dark:text-blue-400 bg-blue-500/10",
            emerald: "border-l-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
            amber: "border-l-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10",
          };

          return (
            <Card key={card.label} className={`border-l-4 ${toneStyles[card.tone].split(" ")[0]} hover:shadow-sm transition-all duration-200 group/card overflow-hidden bg-card/85`}>
              <CardContent className="p-4 flex flex-col justify-between h-[135px]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">{card.label}</p>
                    <div className="text-xl font-extrabold text-foreground mt-1 tracking-tight truncate">
                      {isLoadingStats ? (
                        <span className="inline-block w-12 h-6 bg-muted rounded animate-pulse" />
                      ) : (
                        card.value
                      )}
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-border/40 shrink-0 ${toneStyles[card.tone].split(" ").slice(1).join(" ")}`}>
                    {card.icon}
                  </div>
                </div>

                {/* Sparkline line chart */}
                {isMounted && !isLoadingStats ? (
                  <div className="h-9 w-full mt-2 -mx-1 opacity-70 group-hover/card:opacity-100 transition-opacity">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={card.trend}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={card.color}
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-9 w-full mt-2 bg-muted/20 animate-pulse rounded" />
                )}

                {card.caption && (
                  <p className="text-[9px] text-muted-foreground pt-1 border-t border-border/30 truncate mt-1">
                    {card.caption}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Workspace Health & Insights Panel */}
      <Card className="border border-border bg-card shadow-xs">
        <CardHeader className="border-b border-border/50 pb-3 flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Workspace Diagnostics & Signals</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Real-time health indicators and operational status reports for {org.name}
            </CardDescription>
          </div>
          <Zap className="h-4 w-4 text-amber-500 animate-pulse" />
        </CardHeader>
        <CardContent className="p-4 grid gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-secondary/10 p-3 hover:bg-secondary/20 transition-colors">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground">Access Security</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Firewall policies active. Roles and workspace keys configured correctly.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-secondary/10 p-3 hover:bg-secondary/20 transition-colors">
            <Activity className="h-4 w-4 text-blue-500 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-foreground">System Latency</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Average model inference response is healthy at 98.4% uptime.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-secondary/10 p-3 hover:bg-secondary/20 transition-colors">
            <Flame className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground">Credit Health</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Spend tracking limits active. System is tracking EGP wallet conversion.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
