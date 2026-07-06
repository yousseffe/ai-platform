"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Coins,
  FolderKanban,
  KeyRound,
  Layers,
  Loader2,
  Calendar,
} from "lucide-react";
import { useOrgContext } from "@/hooks/use-org-context";
import { OrgAction, OrgType } from "@/types";
import {
  getOrganizationUsageSummary,
  OrganizationUsageSummary,
} from "@/lib/services/projects.service";
import { toast } from "react-hot-toast";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-popover p-3 shadow-md text-xs space-y-1">
        <p className="font-bold text-foreground">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="flex items-center gap-2" style={{ color: p.color || p.fill }}>
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: p.color || p.fill }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-semibold text-foreground">
              {p.name.includes("Credits") ? `${Number(p.value).toFixed(2)} cr` : p.value.toLocaleString()}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-popover p-3 shadow-md text-xs space-y-1">
        <p className="font-bold text-foreground">{data.name}</p>
        <p className="flex items-center gap-2">
          <span className="text-muted-foreground">Volume/Credits:</span>
          <span className="font-semibold text-foreground">{Number(data.value).toLocaleString()}</span>
        </p>
        <p className="text-[10px] text-muted-foreground">({data.percentage}% of total)</p>
      </div>
    );
  }
  return null;
};

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatCredits(value: number) {
  return `${Number(value ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} cr`;
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MiniBar({
  label,
  value,
  max,
  failed,
}: {
  label: string;
  value: number;
  max: number;
  failed: number;
}) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  const hasFailures = failed > 0;

  return (
    <div className="grid grid-cols-[82px_1fr_64px] items-center gap-3 text-xs">
      <span className="truncate font-medium text-muted-foreground">
        {label}
      </span>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${hasFailures ? "bg-amber-500" : "bg-primary"}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-right font-semibold text-foreground">
        {formatNumber(value)}
      </span>
    </div>
  );
}

/**
 * Organization usage dashboard for consumer-capable workspaces.
 */
export default function OrgUsagePage() {
  const { org, can } = useOrgContext();
  const [summary, setSummary] = useState<OrganizationUsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7" | "14" | "30">("14");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchUsage = useCallback(async () => {
    if (!org) return;
    setIsLoading(true);
    try {
      setSummary(await getOrganizationUsageSummary(org.id));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load usage",
      );
    } finally {
      setIsLoading(false);
    }
  }, [org]);

  useEffect(() => {
    Promise.resolve().then(fetchUsage);
  }, [fetchUsage]);

  const daily = useMemo(() => {
    if (!summary?.daily) return [];
    const limit = parseInt(timeRange);
    return summary.daily.slice(-limit);
  }, [summary, timeRange]);

  const monthly = useMemo(() => summary?.monthly.slice(-6) ?? [], [summary]);
  const maxDaily = Math.max(...daily.map((item) => item.requests), 0);
  const maxMonthly = Math.max(...monthly.map((item) => item.requests), 0);

  const dailyChartData = useMemo(() => {
    return daily.map(d => ({
      dateStr: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      Success: d.requests - d.failedRequests,
      Failed: d.failedRequests,
      Total: d.requests,
      Credits: d.creditsCharged
    }));
  }, [daily]);

  const monthlyChartData = useMemo(() => {
    return monthly.map(m => ({
      month: m.month,
      Requests: m.requests,
      Credits: m.creditsCharged
    }));
  }, [monthly]);

  const modelBreakdownData = useMemo(() => {
    if (!summary?.models) return [];
    const total = summary.models.reduce((sum, m) => sum + m.requests, 0) || 1;
    return summary.models.map(m => ({
      name: m.name,
      value: m.requests,
      percentage: ((m.requests / total) * 100).toFixed(1)
    })).sort((a, b) => b.value - a.value).slice(0, 7);
  }, [summary]);

  const projectBreakdownData = useMemo(() => {
    if (!summary?.projects) return [];
    const total = summary.projects.reduce((sum, p) => sum + p.creditsCharged, 0) || 1;
    return summary.projects.map(p => ({
      name: p.name,
      value: p.creditsCharged,
      percentage: ((p.creditsCharged / total) * 100).toFixed(1)
    })).sort((a, b) => b.value - a.value).slice(0, 7);
  }, [summary]);

  const canUseUsage =
    !!org &&
    (org.type === OrgType.CONSUMER || org.type === OrgType.HYBRID) &&
    can(OrgAction.VIEW_USAGE);
  const canSeeKeyBreakdown =
    summary?.scope === "FULL" || summary?.scope === "OPERATIONAL";

  if (!org) return null;

  if (!canUseUsage) {
    return (
      <div className="mx-auto max-w-4xl rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">
              Usage is not available
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This area is available for consumer-capable organization
              workspaces.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 animate-fade-in">
      <PageHeader
        title={
          <>
            Usage Tracking
            {summary && (
              <span className="rounded-md border border-border bg-card px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
                {summary.scope.toLowerCase()}
              </span>
            )}
          </>
        }
        description="Project requests, model consumption, API key activity, and spend signals for this organization."
        className="mb-0"
        actions={
          <Link
            href={`/orgs/${org.slug}/projects`}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <FolderKanban className="h-3.5 w-3.5" strokeWidth={1.8} />
            Projects
          </Link>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2
            className="h-6 w-6 animate-spin text-muted-foreground"
            strokeWidth={1.5}
          />
        </div>
      ) : !summary ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icon={<AlertTriangle />}
            title="Usage could not be loaded"
            description="Something went wrong fetching usage data for this organization."
            action={
              <Button variant="outline" size="sm" onClick={() => fetchUsage()}>
                Try again
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Requests"
              value={formatNumber(summary.totals.requests)}
              caption={`${formatNumber(summary.totals.successfulRequests)} successful requests`}
              icon={<Activity />}
              tone="primary"
            />
            <StatCard
              label="Credits Used"
              value={formatCredits(summary.totals.creditsCharged)}
              caption="Total organization consumer spend"
              icon={<Coins />}
              tone="warning"
            />
            <StatCard
              label="Error Rate"
              value={`${summary.totals.errorRate}%`}
              caption={`${formatNumber(summary.totals.failedRequests)} failed requests`}
              icon={<AlertTriangle />}
              tone="danger"
            />
            <StatCard
              label="Last Used"
              value={formatDate(summary.totals.lastUsedAt)}
              caption="Most recent model request"
              icon={<Clock />}
              tone="success"
            />
          </section>

          <Tabs defaultValue="trends" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <TabsList className="bg-secondary/40 border border-border/80 w-fit">
                <TabsTrigger value="trends">Consumption Trends</TabsTrigger>
                <TabsTrigger value="breakdown">Distribution Breakdown</TabsTrigger>
              </TabsList>

              {/* Time Range Selector for trends */}
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card p-1 self-start sm:self-auto">
                {(["7", "14", "30"] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setTimeRange(range)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                      timeRange === range
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    {range} Days
                  </button>
                ))}
              </div>
            </div>

            <TabsContent value="trends" className="space-y-4 outline-none">
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Daily Volume AreaChart */}
                <Card className="border border-border bg-card">
                  <CardHeader className="border-b border-border/50 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground">Daily Request Volume</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                          Successful and failed requests over the selected window
                        </CardDescription>
                      </div>
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="h-72 w-full">
                      {isMounted && dailyChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                            <XAxis dataKey="dateStr" tickLine={false} axisLine={false} className="text-[10px] fill-muted-foreground" />
                            <YAxis tickLine={false} axisLine={false} className="text-[10px] fill-muted-foreground" />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="Success" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSuccess)" name="Success" />
                            <Area type="monotone" dataKey="Failed" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorFailed)" name="Failed" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          No trend data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Credit Spend BarChart */}
                <Card className="border border-border bg-card">
                  <CardHeader className="border-b border-border/50 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold text-foreground">Monthly Credit Spend</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                          Consumer wallet credit utilization over recent months
                        </CardDescription>
                      </div>
                      <Coins className="h-4 w-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="h-72 w-full">
                      {isMounted && monthlyChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                            <XAxis dataKey="month" tickLine={false} axisLine={false} className="text-[10px] fill-muted-foreground" />
                            <YAxis tickLine={false} axisLine={false} className="text-[10px] fill-muted-foreground" />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="Credits" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Credits Charged" />
                            <Bar dataKey="Requests" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Requests" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          No monthly data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-4 outline-none">
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Pie Chart: Model Breakdown */}
                <Card className="border border-border bg-card">
                  <CardHeader className="border-b border-border/50 pb-4">
                    <CardTitle className="text-sm font-bold text-foreground">Inference Volume by Model</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Breakdown of total model request distributions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 h-72">
                      {isMounted && modelBreakdownData.length > 0 ? (
                        <>
                          <div className="h-56 w-56 flex-shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Tooltip content={<CustomPieTooltip />} />
                                <Pie
                                  data={modelBreakdownData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={75}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {modelBreakdownData.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                  ))}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto w-full sm:w-auto text-xs">
                            {modelBreakdownData.map((entry, idx) => (
                              <div key={entry.name} className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                <span className="truncate max-w-[150px] font-semibold text-foreground">{entry.name}:</span>
                                <span className="text-muted-foreground font-mono text-[11px] ml-auto">{entry.percentage}%</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">No model distribution data available</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Pie Chart: Project Breakdown */}
                <Card className="border border-border bg-card">
                  <CardHeader className="border-b border-border/50 pb-4">
                    <CardTitle className="text-sm font-bold text-foreground">Spend Distribution by Project</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Breakdown of total credit spend across active projects
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 h-72">
                      {isMounted && projectBreakdownData.length > 0 ? (
                        <>
                          <div className="h-56 w-56 flex-shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Tooltip content={<CustomPieTooltip />} />
                                <Pie
                                  data={projectBreakdownData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={75}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {projectBreakdownData.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                  ))}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto w-full sm:w-auto text-xs">
                            {projectBreakdownData.map((entry, idx) => (
                              <div key={entry.name} className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                <span className="truncate max-w-[150px] font-semibold text-foreground">{entry.name}:</span>
                                <span className="text-muted-foreground font-mono text-[11px] ml-auto">{entry.percentage}%</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">No project distribution data available</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    Projects
                  </p>
                  <h2 className="mt-1 text-base font-bold text-foreground">
                    Usage by project
                  </h2>
                </div>
                <FolderKanban
                  className="h-4 w-4 text-primary"
                  strokeWidth={1.8}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="border-b border-border bg-secondary/40">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Project
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Requests
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Credits
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Errors
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Last Used
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.projects.map((project) => (
                      <tr
                        key={project.id}
                        className="border-b border-border/70 last:border-0"
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">
                          {project.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {formatNumber(project.requests)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {formatCredits(project.creditsCharged)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {project.errorRate}%
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(project.lastUsedAt)}
                        </td>
                      </tr>
                    ))}
                    {summary.projects.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-sm text-muted-foreground"
                        >
                          No project usage recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    Models
                  </p>
                  <h2 className="mt-1 text-base font-bold text-foreground">
                    Usage by model
                  </h2>
                </div>
                <Layers className="h-4 w-4 text-primary" strokeWidth={1.8} />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="border-b border-border bg-secondary/40">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Model
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Requests
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Credits
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Latency
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Errors
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.models.map((model) => (
                      <tr
                        key={model.id}
                        className="border-b border-border/70 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-foreground">
                            {model.name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {model.framework} · {model.type}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {formatNumber(model.requests)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {formatCredits(model.creditsCharged)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {model.averageLatencyMs}ms
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {model.errorRate}%
                        </td>
                      </tr>
                    ))}
                    {summary.models.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-sm text-muted-foreground"
                        >
                          No model usage recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  API Keys
                </p>
                <h2 className="mt-1 text-base font-bold text-foreground">
                  Usage by API key
                </h2>
              </div>
              <KeyRound className="h-4 w-4 text-primary" strokeWidth={1.8} />
            </div>
            {!canSeeKeyBreakdown ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Limited usage visibility
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  API key breakdown is available to organization owners and
                  maintainers.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="border-b border-border bg-secondary/40">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Key
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Project
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Requests
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Credits
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Errors
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Last Used
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.apiKeys.map((apiKey) => (
                      <tr
                        key={apiKey.id}
                        className="border-b border-border/70 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-foreground">
                            {apiKey.label}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            {apiKey.keyPrefix}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {apiKey.projectName}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {formatNumber(apiKey.requests)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {formatCredits(apiKey.creditsCharged)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {apiKey.errorRate}%
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(apiKey.lastUsedAt)}
                        </td>
                      </tr>
                    ))}
                    {summary.apiKeys.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-sm text-muted-foreground"
                        >
                          No API key usage recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
