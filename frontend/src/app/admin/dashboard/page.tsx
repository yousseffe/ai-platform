"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/hooks/use-workspace";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";
import { AdminDashboardOverview, AdminMetricCard } from "@/types";
import { Subscriber } from "@/components/admin/SubscribersOverview";
import {
  LayoutGrid,
  Users,
  HardDrive,
  Cpu,
  LineChart as LineChartIcon,
  Bell,
  RefreshCw,
  Loader2,
  DollarSign,
  BriefcaseBusiness,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminEmptyState } from "@/components/admin/common/AdminEmptyState";
import { AdminMoney } from "@/components/admin/common/AdminMoney";
import { AdminTrendBadge } from "@/components/admin/common/AdminTrendBadge";

// Sub-components
import AnalyticsCharts from "@/components/admin/AnalyticsCharts";
import InfrastructureStats from "@/components/admin/InfrastructureStats";
import InsightsEngine from "@/components/admin/InsightsEngine";
import SubscribersOverview from "@/components/admin/SubscribersOverview";

type Tab = "overview" | "subscriptions" | "infrastructure" | "analytics" | "insights";

const TABS: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "overview", label: "Operations Wall", icon: <LayoutGrid className="w-3.5 h-3.5" />, desc: "Global KPI indexes & revenue distributions" },
  { id: "subscriptions", label: "Subscriptions", icon: <BriefcaseBusiness className="w-3.5 h-3.5" />, desc: "Contract timelines & active tenant ledger" },
  { id: "infrastructure", label: "Infrastructure", icon: <HardDrive className="w-3.5 h-3.5" />, desc: "BullMQ queues & Docker telemetry diagnostics" },
  { id: "analytics", label: "Telemetry Charts", icon: <LineChartIcon className="w-3.5 h-3.5" />, desc: "Growth area charts & latency percentiles" },
  { id: "insights", label: "Insights Engine", icon: <Cpu className="w-3.5 h-3.5" />, desc: "Automated thresholds & dynamic upgrades" },
];
interface InfrastructureContainer {
  deploymentId: string;
  modelName: string;
  url: string;
  modelType: string;
  port?: number | string;
  cpu: number;
  ram: number;
  tier?: string;
  [key: string]: unknown;
}

interface InsightsRecommendation {
  modelId: string;
  modelName: string;
  actionType: string;
  reason: string;
  currentPrice: number;
  suggestedPrice: number;
  currentTier: string;
  suggestedTier: string;
  [key: string]: unknown;
}

interface InsightsAlert {
  id: string;
  alertName: string;
  severity: string;
  summary: string;
  receivedAt: string | number;
  [key: string]: unknown;
}

interface AdminInsightsTelemetry {
  infrastructure: {
    activeContainers: number;
    containersList: InfrastructureContainer[];
    storage: {
      bucket: string;
      fallback: boolean;
      objectCount: number;
      totalSizeBytes: number;
    };
    queues: {
      buildQueue: { waiting: number; active: number; completed: number; failed: number; delayed: number };
      deployQueue: { waiting: number; active: number; completed: number; failed: number; delayed: number };
    };
  };
  subscriptions: {
    subscribers: Subscriber[];
    planBreakdown: { name: string; value: number }[];
  };
  userGrowth?: { month: string; signups: number; totalUsers: number }[];
  caps: Record<string, { cpuPercent: number; ramMb: number }>;
  recommendations: InsightsRecommendation[];
  alerts: InsightsAlert[];
}
export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isAdmin, isLoading: isWorkspaceLoading, fetchWorkspaceDetails } = useWorkspace();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  // States for API Payloads
  const [kpiOverview, setKpiOverview] = useState<AdminDashboardOverview | null>(null);
  const [insights, setInsights] = useState<AdminInsightsTelemetry | null>(null);

  // Load workspace details on mount
  useEffect(() => {
    if (session) {
      fetchWorkspaceDetails(session);
    }
  }, [session, fetchWorkspaceDetails]);

  // Redirect non-admins
  useEffect(() => {
    if (!isWorkspaceLoading && !isAdmin) {
      toast.error("Access denied: Admin credentials required");
      router.push("/dashboard");
    }
  }, [isAdmin, isWorkspaceLoading, router]);

  const loadData = async (showToast = false) => {
    setLoading(true);
    try {
      const [overviewData, insightsData] = await Promise.all([
        smartFetch<AdminDashboardOverview>("/admin/dashboard/overview"),
        smartFetch<AdminInsightsTelemetry>("/admin/dashboard/insights"),
      ]);

      setKpiOverview(overviewData);
      setInsights(insightsData);

      if (showToast) {
        toast.success("Operations console telemetry synced!");
      }
    } catch (err: unknown) {
      toast.error("Failed to retrieve platform dashboard analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      const timer = setTimeout(() => {
        loadData(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAdmin]);

  if (isWorkspaceLoading || !isAdmin || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-foreground font-sans text-left">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
        <span className="text-xs font-semibold">Processing Admin Operations Console...</span>
      </div>
    );
  }

  // Filter KPI cards to present on the Overview tab
  const getCards = () => {
    if (!kpiOverview?.cards) return [];
    return kpiOverview.cards.filter((card) =>
      ["total-users", "total-revenue", "platform-commission", "inference-revenue"].includes(card.key)
    );
  };

  return (
    <div className="w-full space-y-6 text-foreground font-sans text-xs animate-fade-in relative min-h-screen pb-12 text-left">
      {/* Background radial glow accents */}
      <div className="glow-spot" />
      <div className="glow-spot-secondary" />

      {/* Premium Operations Hero Banner */}
      <div className="relative z-10 border border-border/80 bg-card/65 rounded-3xl p-6 backdrop-blur-md shadow-sm overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover-lift transition-all duration-300">
        <div className="absolute top-0 right-0 w-[300px] h-[100px] bg-gradient-to-l from-primary/10 to-transparent blur-3xl" />
        <div className="space-y-1.5 text-left max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3 h-3 text-primary animate-pulse" />
            <span>OPERATIONAL SYSTEMS ACTIVE</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            Operations Control Center
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed font-medium">
            Monitor real-time subscription splits, object storage limits, docker containers health, and run live insights optimizations across the platform.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-[9px] font-bold text-muted-foreground uppercase">SYSTEM HEALTH</span>
            <span className="text-xs font-black text-emerald-500 flex items-center gap-1 mt-0.5 justify-end">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              100% ONLINE
            </span>
          </div>
          <Button
            onClick={() => loadData(true)}
            disabled={loading}
            className="btn-primary h-10 px-4 font-bold text-[10px] flex items-center gap-2 cursor-pointer hover-lift shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Control Metrics</span>
          </Button>
        </div>
      </div>

      {/* Tabs Selector Navigation panel */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 border border-border/60 rounded-2xl p-1 bg-secondary/35 backdrop-blur-md relative z-10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-start gap-1 p-3 rounded-xl transition-all cursor-pointer select-none text-left ${
              activeTab === tab.id
                ? "bg-card text-foreground shadow-xs border border-border/80"
                : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-[11px]">
              {tab.icon}
              <span>{tab.label}</span>
            </div>
            <span className="text-[9px] text-muted-foreground font-medium hidden md:block">
              {tab.desc}
            </span>
          </button>
        ))}
      </div>

      {/* Content Tabs Area */}
      <div className="w-full relative z-10">
        {/* TAB 1: OPERATIONS WALL */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Real-time KPI Card matrix */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {getCards().map((card: AdminMetricCard) => {
                let Icon = LayoutGrid;
                let colorClass = "text-primary bg-primary/10 border-primary/20 dark:bg-primary/5";
                let decoration = "from-primary/10 to-transparent";

                if (card.key === "total-users") {
                  Icon = Users;
                  colorClass = "text-blue-500 bg-blue-500/10 border-blue-500/20 dark:bg-blue-500/5";
                  decoration = "from-blue-500/10 to-transparent";
                } else if (card.key === "total-revenue") {
                  Icon = DollarSign;
                  colorClass = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/5";
                  decoration = "from-emerald-500/10 to-transparent";
                } else if (card.key === "platform-commission") {
                  Icon = BriefcaseBusiness;
                  colorClass = "text-purple-500 bg-purple-500/10 border-purple-500/20 dark:bg-purple-500/5";
                  decoration = "from-purple-500/10 to-transparent";
                } else if (card.key === "inference-revenue") {
                  Icon = Cpu;
                  colorClass = "text-amber-500 bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/5";
                  decoration = "from-amber-500/10 to-transparent";
                }

                return (
                  <Card
                    key={card.key}
                    className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md relative overflow-hidden rounded-2xl hover-lift transition-all duration-300"
                  >
                    <div className={`absolute top-0 right-0 w-[150px] h-[80px] bg-gradient-to-l ${decoration} blur-2xl`} />
                    <CardContent className="p-5 flex flex-col justify-between h-32 text-left relative z-10">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {card.label}
                        </span>
                        <div className={`p-2 rounded-xl border ${colorClass} shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="text-2xl font-extrabold text-foreground tracking-tight">
                          {card.format === "currency" ? (
                            <AdminMoney amount={card.value} />
                          ) : (
                            card.value
                          )}
                        </span>
                        {card.changePercent !== null && card.changePercent !== 0 && (
                          <AdminTrendBadge
                            changePercent={card.changePercent}
                            trend={card.changePercent > 0 ? "up" : "down"}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Providers Ledger & Live telemetry queue summaries */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Providers Table */}
              <Card className="lg:col-span-2 border border-border/85 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl overflow-hidden hover-lift transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="border-b border-border bg-muted/20 px-5 py-4 text-left flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Top Providers By Earnings</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                        ML workspace providers that generated the most EGP commission share.
                      </p>
                    </div>
                    <BriefcaseBusiness className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                  <CardContent className="p-0">
                    {(!kpiOverview?.topProviders || kpiOverview.topProviders.length === 0) ? (
                      <AdminEmptyState
                        title="No provider revenue yet"
                        description="Top-performing providers will appear here as the marketplace generates earnings."
                      />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/10 border-b border-border text-[9px] uppercase tracking-wider text-muted-foreground">
                            <TableHead className="px-5 py-3">Provider Name</TableHead>
                            <TableHead className="px-5 py-3">Subscribed Plan</TableHead>
                            <TableHead className="px-5 py-3">Public Models</TableHead>
                            <TableHead className="px-5 py-3">Total Earnings</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(kpiOverview?.topProviders || []).map((provider) => (
                            <TableRow key={provider.id} className="hover:bg-muted/25 transition-all">
                              <TableCell className="font-bold text-foreground px-5 py-3.5">
                                {provider.name}
                              </TableCell>
                              <TableCell className="px-5 py-3.5">
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary/10 text-primary border border-primary/20 dark:bg-primary/5">
                                  {provider.tierName.toUpperCase()}
                                </span>
                              </TableCell>
                              <TableCell className="px-5 py-3.5 font-bold text-foreground">{provider.publicModels}</TableCell>
                              <TableCell className="px-5 py-3.5 font-bold text-emerald-500">
                                <AdminMoney amount={provider.totalEarnings} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </div>
              </Card>

              {/* Operations Stats side widget */}
              <div className="space-y-6">
                <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl overflow-hidden hover-lift transition-all duration-300 text-left p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm text-foreground">Operational Status</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Active Inference Containers:</span>
                      <span className="font-extrabold text-foreground bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                        {insights?.infrastructure?.activeContainers || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Build Queue jobs:</span>
                      <span className="font-bold text-foreground">
                        {insights?.infrastructure?.queues?.buildQueue?.active || 0} active / {insights?.infrastructure?.queues?.buildQueue?.waiting || 0} waiting
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Deploy Queue jobs:</span>
                      <span className="font-bold text-foreground">
                        {insights?.infrastructure?.queues?.deployQueue?.active || 0} active / {insights?.infrastructure?.queues?.deployQueue?.waiting || 0} waiting
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Object weights storage:</span>
                      <span className="font-bold text-foreground">
                        {insights?.infrastructure?.storage?.objectCount || 0} objects
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUBSCRIPTIONS */}
        {activeTab === "subscriptions" && (
          <SubscribersOverview subscribers={insights?.subscriptions?.subscribers || []} />
        )}

        {/* TAB 3: INFRASTRUCTURE */}
        {activeTab === "infrastructure" && (
          <InfrastructureStats
            infrastructure={
              insights?.infrastructure || {
                activeContainers: 0,
                containersList: [],
                storage: { bucket: "models", fallback: true, objectCount: 0, totalSizeBytes: 0 },
                queues: {
                  buildQueue: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
                  deployQueue: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
                },
              }
            }
            onRefresh={() => loadData(true)}
            loading={loading}
          />
        )}

        {/* TAB 4: TELEMETRY CHARTS */}
        {activeTab === "analytics" && (
          <AnalyticsCharts
            userGrowth={insights?.userGrowth || []}
            planBreakdown={insights?.subscriptions?.planBreakdown || []}
            containerStats={insights?.infrastructure?.containersList || []}
          />
        )}

        {/* TAB 5: INSIGHTS ENGINE */}
        {activeTab === "insights" && (
          <InsightsEngine
            caps={insights?.caps || ({} as Record<string, { cpuPercent: number; ramMb: number }>)}
            recommendations={insights?.recommendations || []}
            alerts={insights?.alerts || []}
            onRefresh={() => loadData(true)}
          />
        )}
      </div>
    </div>
  );
}
