"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gauge,
  Globe,
  Layers3,
  Play,
  Server,
  Target,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DeploymentStatus,
  Model,
  ModelLog,
  ProviderInsights,
} from "@/types";
import { InferenceLogsTable } from "./InferenceLogsTable";
import { useWorkspace } from "@/hooks/use-workspace";
import DashboardHeader from "./shared/DashboardHeader";
import DashboardBanner from "./shared/DashboardBanner";
import MetricCard from "./shared/MetricCard";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PublisherDashboardProps {
  models: Model[];
  balance: number;
  logs: ModelLog[];
  insights: ProviderInsights | null;
}

const MODELS_PAGE_SIZE = 5;
const CHART_COLORS = ["#2563eb", "#0f766e", "#d97706", "#7c3aed", "#dc2626", "#0891b2"];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PublisherDashboard({
  models,
  balance,
  logs,
  insights,
}: PublisherDashboardProps) {
  const { canAccessBilling } = useWorkspace();
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"overview" | "catalog" | "analytics" | "logs">("overview");
  const effectiveModels = models;
  const effectiveBalance = balance;
  const effectiveLogs = logs;
  const effectiveInsights = insights;

  const totalPages = Math.ceil(effectiveModels.length / MODELS_PAGE_SIZE);
  const visiblePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const startIndex = (visiblePage - 1) * MODELS_PAGE_SIZE;
  const endIndex = startIndex + MODELS_PAGE_SIZE;
  const currentModels = effectiveModels.slice(startIndex, endIndex);

  const summary = effectiveInsights?.summary ?? null;
  const comparison = effectiveInsights?.comparison ?? null;
  const topModels = effectiveInsights?.topModels ?? [];
  const typeBreakdown = effectiveInsights?.typeBreakdown ?? [];
  const taskBreakdown = effectiveInsights?.taskBreakdown ?? [];

  const trendSeries = (effectiveInsights?.series ?? []).map((point) => ({
    ...point,
    label: formatShortDate(point.date),
    primaryValue: canAccessBilling ? point.revenueEgp : point.requests,
  }));

  const topModel = topModels[0] ?? null;
  const bestType = typeBreakdown[0] ?? null;
  const bestTask = taskBreakdown[0] ?? null;
  const watchModel =
    [...topModels]
      .filter((model) => model.requests > 0)
      .sort((left, right) => {
        if (left.successRate !== right.successRate) {
          return left.successRate - right.successRate;
        }
        return right.avgLatencyMs - left.avgLatencyMs;
      })[0] ?? null;

  const topModelsChart = topModels.map((model) => ({
    label: truncate(model.modelName, 16),
    fullLabel: model.modelName,
    value: canAccessBilling ? model.revenueEgp : model.requests,
  }));

  const taskChart = taskBreakdown.map((task) => ({
    label: humanizeLabel(task.taskType),
    value: canAccessBilling ? task.revenueEgp : task.requests,
    successRate: task.successRate,
  }));

  const kpiRevenue = summary?.estimatedRevenueEgp ?? 0;
  const kpiSuccessRate = summary?.successRate ?? 0;
  const kpiRequests = summary?.totalRequests ?? effectiveLogs.length;
  const growthDelta = comparison?.revenueDeltaPercent ?? 0;
  const textGrowthDelta = growthDelta > 0 ? `+${growthDelta.toFixed(1)}%` : `${growthDelta.toFixed(1)}%`;
  const demandDelta = comparison?.requestsDeltaPercent ?? 0;
  const textDemandDelta = demandDelta > 0 ? `+${demandDelta.toFixed(1)}%` : `${demandDelta.toFixed(1)}%`;

  const executiveSignals = [
    {
      title: canAccessBilling ? "Revenue Momentum" : "Demand Momentum",
      icon: TrendingUp,
      tone: getDeltaTone(canAccessBilling ? growthDelta : demandDelta),
      body:
        comparison && (canAccessBilling ? comparison.current.revenueEgp : comparison.current.requests) > 0
          ? `${canAccessBilling ? textGrowthDelta : textDemandDelta} versus the previous ${effectiveInsights?.periodDays ?? 30}-day window.`
          : "The current period is still building a performance baseline.",
      footer: canAccessBilling
        ? `Current run-rate ${formatCurrency(comparison?.current.revenueEgp ?? 0)}`
        : `Current run-rate ${comparison?.current.requests ?? 0} served requests`,
    },
    {
      title: canAccessBilling ? "Winning Segment" : "Most Active Segment",
      icon: Target,
      tone: "positive" as const,
      body: bestTask
        ? `${humanizeLabel(bestTask.taskType)} leads with ${
            canAccessBilling
              ? formatCurrency(bestTask.revenueEgp)
              : `${bestTask.requests} requests`
          }.`
        : "Segment performance will appear as soon as the first production traffic lands.",
      footer: bestTask ? `${bestTask.successRate.toFixed(1)}% success rate` : "No segment data yet",
    },
    {
      title: "Management Priority",
      icon: watchModel ? AlertTriangle : Gauge,
      tone: watchModel ? ("warning" as const) : ("neutral" as const),
      body: watchModel
        ? `${watchModel.modelName} needs attention with ${watchModel.successRate.toFixed(1)}% success and ${watchModel.avgLatencyMs.toFixed(0)}ms latency.`
        : "No underperforming model detected in the current window.",
      footer: watchModel
        ? "Improve stability or routing before scaling spend behind it."
        : "Your active portfolio is stable so far.",
    },
  ];

  return (
    <div className="w-full space-y-5 animate-fade-in text-foreground font-sans">
      
      {/* Dashboard Top Header */}
      <DashboardHeader
        title="Provider Intelligence Hub"
        description="Track wallet earnings, portfolio demand, and decision-support signals for every model you monetize."
        icon={TrendingUp}
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/provider/subscriptions"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background hover:bg-secondary px-3.5 h-8.5 text-xs font-bold text-foreground hover:text-primary transition-all shadow-sm shrink-0"
            >
              <Crown className="w-3.5 h-3.5" strokeWidth={2} />
              Manage Plan
            </Link>
            <Link
              href="/models/upload"
              className={cn(
                buttonVariants({ variant: "default" }),
                "bg-linear-to-r from-primary via-primary-600 to-primary-700 hover:opacity-95 text-primary-foreground font-semibold px-3.5 h-8.5 rounded-lg text-xs shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer shrink-0 gap-1.5",
              )}
            >
              <Upload className="w-3.5 h-3.5" strokeWidth={2} />
              Publish Model
            </Link>
          </div>
        }
      />

      <DashboardBanner
        title="Decision-support mode is live."
        description="Use the panels below to understand which models, categories, and traffic patterns are building the strongest provider business."
        icon={Server}
        color="emerald"
        isLive={true}
      />

      {/* Segmented Sub-Tabs Track */}
      <div className="flex bg-secondary/35 border border-border/80 p-1 rounded-xl gap-1 w-full md:w-fit select-none overflow-x-auto scrollbar-none shrink-0 mb-5 shadow-sm">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "overview"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          <Gauge className="w-3.5 h-3.5 text-primary" />
          <span>Overview</span>
        </button>
        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "catalog"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>Model Catalog</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
            activeTab === "catalog" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}>
            {effectiveModels.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "analytics"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span>Traffic Analytics</span>
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "logs"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
          }`}
        >
          <Server className="w-3.5 h-3.5 text-primary" />
          <span>Served Logs</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
            activeTab === "logs" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}>
            {effectiveLogs.length}
          </span>
        </button>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <MetricCard
          title="Published Models"
          value={effectiveModels.length.toString()}
          icon={Globe}
          color="blue"
          footerText={`${summary?.activeTypes ?? 0} active model types in the current window`}
        />

        <MetricCard
          title="Served Requests"
          value={kpiRequests.toString()}
          icon={Play}
          color="emerald"
          footerText={
            comparison
              ? `${formatSignedPercent(demandDelta)} vs previous period`
              : "Waiting for comparison baseline"
          }
        />

        <MetricCard
          title="Available Earnings"
          value={canAccessBilling ? formatCurrency(effectiveBalance) : "Restricted"}
          icon={Wallet}
          color="amber"
          actionLabel={canAccessBilling ? "Withdraw" : undefined}
          actionHref={canAccessBilling ? "/settings/billing" : undefined}
          actionDisabledText={canAccessBilling ? undefined : "Only billing-enabled workspace owners can view wallet earnings."}
          footerText={canAccessBilling ? "Provider wallet balance ready for payout" : undefined}
        />

        <MetricCard
          title={`Last ${effectiveInsights?.periodDays ?? 30} Days`}
          value={canAccessBilling ? formatCurrency(kpiRevenue) : `${kpiSuccessRate.toFixed(1)}%`}
          icon={TrendingUp}
          color="primary"
          footerText={
            canAccessBilling
              ? `${kpiSuccessRate.toFixed(1)}% success rate`
              : `${summary?.failedRequests ?? 0} failed requests need attention`
          }
        />
      </div>

      {/* Tabs Content Sections */}
      <div className="space-y-5">
        
        {/* Tab 1: Overview Panel */}
        {activeTab === "overview" && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-5">
              <Card className="overflow-hidden border border-border bg-card p-0 shadow-sm rounded-xl">
                <CardHeader className="border-b border-border/60 bg-secondary/15 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        {canAccessBilling ? "Revenue Trajectory" : "Demand Trajectory"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {canAccessBilling
                          ? `Estimated provider earnings versus request flow over the last ${effectiveInsights?.periodDays ?? 30} days.`
                          : `Request volume and success quality over the last ${effectiveInsights?.periodDays ?? 30} days.`}
                      </p>
                    </div>
                    {topModel && (
                      <div className="rounded-xl border border-border bg-card px-3 py-2 text-right shadow-2xs select-none">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">Lead Driver</p>
                        <p className="text-sm font-bold text-foreground">
                          {truncate(topModel.modelName, 18)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {canAccessBilling
                            ? formatCurrency(topModel.revenueEgp)
                            : `${topModel.requests} requests`}
                        </p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  {trendSeries.length === 0 ? (
                    <EmptyState
                      icon={<TrendingUp />}
                      title="No earnings signals yet"
                      description="As soon as inference traffic starts, this panel will chart performance and period-over-period momentum."
                    />
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <ExecutiveStat
                          label={canAccessBilling ? "Estimated Revenue" : "Served Demand"}
                          value={canAccessBilling ? formatCurrency(kpiRevenue) : `${kpiRequests} requests`}
                          hint={
                            comparison
                              ? `${formatSignedPercent(canAccessBilling ? growthDelta : demandDelta)} vs previous window`
                              : "Comparison will appear after another full window"
                          }
                        />
                        <ExecutiveStat
                          label="Portfolio Health"
                          value={`${kpiSuccessRate.toFixed(1)}% success`}
                          hint={`${summary?.failedRequests ?? 0} failed requests this period`}
                        />
                        <ExecutiveStat
                          label="Pricing Yield"
                          value={
                            canAccessBilling
                              ? formatCurrency(summary?.averageRevenuePerRequestEgp ?? 0)
                              : `${((summary?.grossCredits ?? 0) / Math.max(summary?.totalRequests ?? 1, 1)).toFixed(2)} credits`
                          }
                          hint={canAccessBilling ? "Average payout per served request" : "Average billed credits per request"}
                        />
                      </div>

                      <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trendSeries} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="providerPrimaryArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.28} />
                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.03} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="none" />
                            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="none" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "var(--card)",
                                borderColor: "var(--border)",
                                borderRadius: "12px",
                                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                              }}
                              formatter={(value: unknown, name: unknown) => {
                                const numVal = Number(value);
                                if (name === "Revenue") {
                                  return formatCurrency(numVal);
                                }
                                if (name === "Requests") {
                                  return `${numVal} requests`;
                                }
                                if (name === "successRate") {
                                  return `${numVal.toFixed(1)}%`;
                                }
                                return numVal;
                              }}
                              labelFormatter={(label) => `Day: ${label}`}
                            />
                            <Area
                              type="monotone"
                              dataKey="primaryValue"
                              name={canAccessBilling ? "Revenue" : "Requests"}
                              stroke="var(--primary)"
                              strokeWidth={2.5}
                              fill="url(#providerPrimaryArea)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Signals Area */}
              <div className="grid grid-cols-1 gap-5">
                {executiveSignals.map((signal) => (
                  <SignalCard
                    key={signal.title}
                    title={signal.title}
                    body={signal.body}
                    footer={signal.footer}
                    icon={signal.icon}
                    tone={signal.tone as "positive" | "warning" | "neutral"}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Models Catalog */}
        {activeTab === "catalog" && (
          <div className="animate-in fade-in duration-300">
            <Card className="p-0 border border-border bg-card flex flex-col justify-between overflow-hidden shadow-sm rounded-xl text-left">
              <div className="flex-1 flex flex-col">
                <CardHeader className="p-4 border-b border-border/60 flex flex-col space-y-1 bg-secondary/20 select-none">
                  <CardTitle className="font-bold text-foreground text-xs uppercase tracking-wider">Published Models Registry</CardTitle>
                  <p className="text-[10px] text-muted-foreground">
                    Operational registry with pricing, deployment, and monetization status for every published model.
                  </p>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col justify-between">
                  {effectiveModels.length === 0 ? (
                    <EmptyState
                      icon={<Globe />}
                      title="No models published yet"
                      description="Publish your first model to unlock earnings analytics, category comparisons, and management signals."
                      action={
                        <Link href="/models/upload" className={cn(buttonVariants({ variant: "default", size: "sm" }))}>
                          <Upload className="w-3.5 h-3.5" strokeWidth={2} /> Publish Model
                        </Link>
                      }
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className="w-full text-left border-collapse text-xs">
                        <TableHeader>
                          <TableRow className="bg-secondary/30 border-b border-border/60 hover:bg-secondary/30 select-none">
                            <TableHead className="px-4.5 py-3 font-bold text-[9px] text-muted-foreground uppercase tracking-widest h-auto">Model</TableHead>
                            <TableHead className="px-4.5 py-3 font-bold text-[9px] text-muted-foreground uppercase tracking-widest h-auto">Category</TableHead>
                            <TableHead className="px-4.5 py-3 font-bold text-[9px] text-muted-foreground uppercase tracking-widest h-auto">Pricing</TableHead>
                            <TableHead className="px-4.5 py-3 font-bold text-[9px] text-muted-foreground uppercase tracking-widest h-auto">Earned</TableHead>
                            <TableHead className="px-4.5 py-3 font-bold text-[9px] text-muted-foreground uppercase tracking-widest h-auto">Status</TableHead>
                            <TableHead className="px-4.5 py-3 font-bold text-[9px] text-muted-foreground uppercase tracking-widest h-auto text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/40 text-xs font-mono">
                          {currentModels.map((model) => {
                            const isActive = model.versions?.some((version) =>
                              version.deployments?.some((deployment) => deployment.status === DeploymentStatus.RUNNING),
                            );

                            return (
                              <TableRow key={model.id} className="hover:bg-secondary/40 border-b border-border/30 transition-colors">
                                <TableCell className="px-4.5 py-3.5 font-sans">
                                  <p className="font-bold text-foreground text-xs">{model.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{humanizeLabel(model.framework || "CUSTOM")}</p>
                                </TableCell>
                                <TableCell className="px-4.5 py-3.5 text-muted-foreground text-[10.5px]">
                                  <div className="space-y-1">
                                    <p>{humanizeLabel(model.type || "UNKNOWN")}</p>
                                    <p className="text-[10px]">{humanizeLabel(model.taskType || "OTHER")}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="px-4.5 py-3.5 text-muted-foreground text-[10.5px]">
                                  <div className="space-y-1">
                                    <p>{formatCredits(parseNumberish(model.costPerRequest))} / request</p>
                                    <p className="text-[10px]">{parseNumberish(model.providerSharePercent || 80)}% provider share</p>
                                  </div>
                                </TableCell>
                                <TableCell className="px-4.5 py-3.5 text-[10.5px]">
                                  {canAccessBilling ? (
                                    <span className="font-semibold text-foreground">
                                      {formatCurrency(parseNumberish(model.totalEarnings))}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">Restricted</span>
                                  )}
                                </TableCell>
                                <TableCell className="px-4.5 py-3.5">
                                  {isActive ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold tracking-wider">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ACTIVE
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-border bg-secondary/50 text-muted-foreground text-[9px] font-bold tracking-wider">
                                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/45" /> INACTIVE
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="px-4.5 py-3.5 text-right font-sans">
                                  <Link
                                    href={`/models/${model.id}`}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-750 transition-colors"
                                  >
                                    Manage <ArrowUpRight className="w-3.5 h-3.5" />
                                  </Link>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4.5 py-3 border-t border-border bg-secondary/15 select-none font-sans text-xs">
                  <div className="text-muted-foreground text-[10px] font-medium font-mono">
                    Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{" "}
                    <span className="font-semibold text-foreground">{Math.min(endIndex, effectiveModels.length)}</span> of{" "}
                    <span className="font-semibold text-foreground">{effectiveModels.length}</span> models
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((previous) => Math.max(previous - 1, 1))}
                      disabled={visiblePage === 1}
                      className="p-1 rounded-md border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-bold text-foreground font-mono">
                      Page {visiblePage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((previous) => Math.min(previous + 1, totalPages))}
                      disabled={visiblePage === totalPages}
                      className="p-1 rounded-md border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Tab 3: Traffic Analytics */}
        {activeTab === "analytics" && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <Card className="overflow-hidden border border-border bg-card p-0 shadow-sm rounded-xl">
                <CardHeader className="border-b border-border/60 bg-secondary/15 px-5 py-4">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Layers3 className="w-4 h-4 text-primary" />
                    {canAccessBilling ? "Top Earning Models" : "Most Active Models"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Identify which individual models deserve more inventory, better routing, or pricing review.
                  </p>
                </CardHeader>
                <CardContent className="p-5">
                  {topModelsChart.length === 0 ? (
                    <EmptyState
                      icon={<Layers3 />}
                      title="No model leaderboard yet"
                      description="Once requests start flowing, this chart will rank the models driving your provider business."
                    />
                  ) : (
                    <div className="space-y-4">
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topModelsChart} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" />
                            <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="none" />
                            <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: "var(--foreground)" }} width={110} stroke="none" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "var(--card)",
                                borderColor: "var(--border)",
                                borderRadius: "12px",
                              }}
                              formatter={(value: unknown) => (canAccessBilling ? formatCurrency(Number(value)) : `${value} requests`)}
                              labelFormatter={(label) => {
                                const match = topModelsChart.find((item) => item.label === label);
                                return match?.fullLabel ?? label;
                              }}
                            />
                            <Bar dataKey="value" radius={[10, 10, 10, 10]}>
                              {topModelsChart.map((entry, index) => (
                                <Cell key={entry.fullLabel} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {topModel && (
                        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] px-4 py-3 select-none">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
                            Best Performer
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-foreground">{topModel.modelName}</p>
                              <p className="text-xs text-muted-foreground">
                                {humanizeLabel(topModel.type)} - {humanizeLabel(topModel.taskType)} - {topModel.successRate.toFixed(1)}% success
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-foreground">
                                {canAccessBilling ? formatCurrency(topModel.revenueEgp) : `${topModel.requests} requests`}
                              </p>
                              <p className="text-xs text-muted-foreground">{topModel.avgLatencyMs.toFixed(0)}ms avg latency</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="overflow-hidden border border-border bg-card p-0 shadow-sm rounded-xl">
                <CardHeader className="border-b border-border/60 bg-secondary/15 px-5 py-4">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    {canAccessBilling ? "Highest Yield Categories" : "Highest Demand Categories"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Understand which task families deserve more marketing, deeper capacity, or portfolio expansion.
                  </p>
                </CardHeader>
                <CardContent className="p-5">
                  {taskChart.length === 0 ? (
                    <EmptyState
                      icon={<Target />}
                      title="No category mix yet"
                      description="Category-level performance will show up after your first round of production usage."
                    />
                  ) : (
                    <div className="space-y-4">
                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={taskChart} margin={{ top: 0, right: 10, left: -18, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="none" />
                            <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="none" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "var(--card)",
                                borderColor: "var(--border)",
                                borderRadius: "12px",
                              }}
                              formatter={(value: unknown) => (canAccessBilling ? formatCurrency(Number(value)) : `${value} requests`)}
                            />
                            <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                              {taskChart.map((entry, index) => (
                                <Cell key={entry.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 select-none">
                        <SegmentSnapshot
                          title="Best Model Type"
                          label={bestType ? humanizeLabel(bestType.type) : "No data yet"}
                          value={
                            bestType
                              ? canAccessBilling
                                ? formatCurrency(bestType.revenueEgp)
                                : `${bestType.requests} requests`
                              : "Awaiting traffic"
                          }
                          caption={bestType ? `${bestType.successRate.toFixed(1)}% success rate` : "No billing history yet"}
                        />
                        <SegmentSnapshot
                          title="Best Task Family"
                          label={bestTask ? humanizeLabel(bestTask.taskType) : "No data yet"}
                          value={
                            bestTask
                              ? canAccessBilling
                                ? formatCurrency(bestTask.revenueEgp)
                                : `${bestTask.requests} requests`
                              : "Awaiting traffic"
                          }
                          caption={bestTask ? `${bestTask.successRate.toFixed(1)}% success rate` : "No task telemetry yet"}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Operator Notes & Snapshots */}
            <Card className="overflow-hidden border border-border bg-card p-0 shadow-sm rounded-xl">
              <CardHeader className="border-b border-border/60 bg-secondary/15 px-5 py-4 select-none">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-primary" />
                  Operator Notes
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Fast executive takeaways for scaling, pricing, and portfolio management.
                </p>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <OperatorNote
                  icon={TrendingUp}
                  title="Scale the winner"
                  body={
                    topModel
                      ? `${topModel.modelName} is currently the strongest performer. Consider pushing more traffic or marketplace visibility behind it.`
                      : "Your first revenue winner will appear here once production usage begins."
                  }
                />
                <OperatorNote
                  icon={Target}
                  title="Double down on category fit"
                  body={
                    bestTask
                      ? `${humanizeLabel(bestTask.taskType)} has the best mix of monetization and delivery quality right now.`
                      : "Category-level direction will become visible after the first wave of traffic."
                  }
                />
                <OperatorNote
                  icon={Gauge}
                  title="Protect experience quality"
                  body={
                    watchModel
                      ? `${watchModel.modelName} is the main operational risk in the current window. Review latency, container size, and stability settings.`
                      : "No major quality hotspot is standing out in the current time window."
                  }
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 4: Served Traffic Logs */}
        {activeTab === "logs" && (
          <div className="animate-in fade-in duration-300">
            <InferenceLogsTable logs={effectiveLogs} title="Recent Inferences Served Traffic" />
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Sub-components and Helpers ──────────────────────────────────────────────

function ExecutiveStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-2xs">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-bold">{label}</p>
      <p className="mt-2 text-lg font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function SignalCard({
  title,
  body,
  footer,
  icon: Icon,
  tone,
}: {
  title: string;
  body: string;
  footer: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "positive" | "warning" | "neutral";
}) {
  const toneClasses = {
    positive: "border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-700 dark:text-emerald-300",
    warning: "border-amber-500/20 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300",
    neutral: "border-border bg-card text-foreground",
  };

  return (
    <Card className={cn("overflow-hidden border p-0 shadow-sm rounded-xl", toneClasses[tone])}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 select-none">
          <div className="rounded-xl border border-current/10 bg-white/40 p-2 dark:bg-black/10">
            <Icon className="w-4 h-4" />
          </div>
          <p className="text-sm font-bold">{title}</p>
        </div>
        <p className="text-sm leading-6">{body}</p>
        <p className="text-xs opacity-80">{footer}</p>
      </CardContent>
    </Card>
  );
}

function SegmentSnapshot({
  title,
  label,
  value,
  caption,
}: {
  title: string;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-2xs">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-bold">{title}</p>
      <p className="mt-2 text-sm font-bold text-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold text-primary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}

function OperatorNote({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/10 px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <p className="text-sm font-bold text-foreground">{title}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatCredits(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value)} credits`;
}

function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function humanizeLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function parseNumberish(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDeltaTone(value: number): "positive" | "warning" | "neutral" {
  if (value > 5) {
    return "positive";
  }
  if (value < -5) {
    return "warning";
  }
  return "neutral";
}
