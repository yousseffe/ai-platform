"use client";

import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Key,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useWorkspace } from "@/hooks/use-workspace";
import { getWalletAnalytics, WalletAnalytics } from "@/lib/services/wallets.service";
import toast from "react-hot-toast";

interface WalletAnalyticsPanelProps {
  mode: "charts" | "keys";
}

export default function WalletAnalyticsPanel({ mode }: WalletAnalyticsPanelProps) {
  const { activeWorkspace, viewMode } = useWorkspace();
  const [data, setData] = useState<WalletAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const res = await getWalletAnalytics(activeWorkspace.id, viewMode);
      setData(res);
    } catch (err) {
      console.error("Failed to load wallet analytics:", err);
      toast.error("Could not fetch latest billing metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id, viewMode]);

  if (!activeWorkspace?.id) return null;

  if (mode === "charts") {
    const totalCreditsToppedUp = data?.dailyTransactions.reduce((acc, row) => acc + row.credits, 0) || 0;
    const totalCreditsSpent = data?.dailyTransactions.reduce((acc, row) => acc + row.debits, 0) || 0;

    return (
      <Card className="w-full border border-border bg-card rounded-2xl shadow-sm overflow-hidden select-none">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Spending & Top-up Analytics (Last 30 Days)
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Daily breakdown of credits added versus credits consumed on model inference.
                </p>
              </div>
            </div>

            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors bg-secondary/50 border border-border px-2.5 py-1.5 rounded-lg font-sans font-bold"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              <span>Sync Metrics</span>
            </button>
          </div>

          {/* Quick aggregate counts */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-secondary/20 rounded-xl border border-border/40 text-xs">
            <div className="space-y-0.5">
              <span className="text-muted-foreground block text-[10px]">Total Credits Topped Up</span>
              <span className="text-sm font-extrabold text-foreground font-mono">
                +{totalCreditsToppedUp.toFixed(2)} Credits
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground block text-[10px]">Total Credits Spent</span>
              <span className="text-sm font-extrabold text-red-500 font-mono">
                -{totalCreditsSpent.toFixed(2)} Credits
              </span>
            </div>
          </div>

          <div className="h-64">
            {data && data.dailyTransactions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyTransactions} margin={{ left: -10, right: 10, top: 10 }}>
                  <defs>
                    <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDebits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={9} />
                  <YAxis stroke="#64748b" fontSize={9} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "12px",
                      fontSize: "10px",
                      color: "var(--foreground)"
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={10} style={{ fontSize: "10px" }} />
                  <Area
                    type="monotone"
                    dataKey="credits"
                    name="Credits Added"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCredits)"
                  />
                  <Area
                    type="monotone"
                    dataKey="debits"
                    name="Credits Consumed"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDebits)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                Gathering spending telemetry...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // mode === "keys"
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-foreground font-sans">
              API Credentials & Daily Budget Limits
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-sans">
              Monitor active keys daily spend caps, request rate thresholds, and real-time usage statistics.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors bg-secondary/50 border border-border px-2.5 py-1.5 rounded-lg font-sans font-bold"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          <span>Sync Limits</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {data && data.apiKeysUsage.length > 0 ? (
          data.apiKeysUsage.map((key) => {
            const cap = key.maxDailySpendCredits;
            const spend = key.todaySpend;
            const ratio = cap && cap > 0 ? Math.min((spend / cap) * 100, 100) : 0;
            const hasCap = cap !== null && cap > 0;
            
            const isHighUsage = ratio >= 85;
            const isBudgetExceeded = hasCap && spend >= cap;

            return (
              <Card
                key={key.id}
                className="border border-border/80 bg-card hover:border-border/100 hover:shadow-xs transition-all duration-300"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate">
                      <span className="font-bold text-xs text-foreground block truncate">
                        {key.name}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground mt-0.5 block">
                        Key: {key.keyPrefix}
                      </span>
                    </div>
                    
                    {isBudgetExceeded ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-[9px] font-bold text-red-500 border border-red-500/20">
                        <ShieldAlert className="w-3 h-3" /> EXCEEDED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-500 border border-emerald-500/20">
                        <Sparkles className="w-3 h-3" /> ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Spend Progress Bar */}
                  <div className="space-y-2 select-none">
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>Model: <strong className="text-foreground">{key.modelName}</strong></span>
                      <span>Today's Spend</span>
                    </div>
                    
                    {hasCap ? (
                      <div className="space-y-1">
                        <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isBudgetExceeded
                                ? "bg-red-500"
                                : isHighUsage
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-mono text-muted-foreground mt-0.5">
                          <span>Budget Cap: {cap.toFixed(2)} Credits</span>
                          <span className="font-bold text-foreground">
                            {spend.toFixed(2)} / {cap.toFixed(2)} Credits ({ratio.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-[9px] font-mono text-muted-foreground">
                        <span>Daily Budget Cap: <strong>Unlimited</strong></span>
                        <span className="font-bold text-foreground">
                          {spend.toFixed(2)} Credits Spent
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Additional rate limit indicator */}
                  {key.maxRequestsPerMinute && (
                    <div className="text-[9px] text-muted-foreground border-t border-border/40 pt-2 flex items-center justify-between">
                      <span>Request Rate Limit:</span>
                      <span className="font-bold font-mono text-foreground">
                        {key.maxRequestsPerMinute} Req/Min
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full p-8 text-center text-muted-foreground select-none border border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1.5">
            <AlertTriangle className="w-6 h-6 text-amber-500/70" />
            <span className="text-[11px] font-sans">No API Keys with budget limits found.</span>
          </div>
        )}
      </div>
    </div>
  );
}
