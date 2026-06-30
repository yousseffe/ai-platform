"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Loader2,
  Users as UsersIcon,
  Layers,
  Database,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  RefreshCw,
  Cpu,
  HardDrive,
  Activity,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useWorkspace } from "@/hooks/use-workspace";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlatformStats, PlatformTransaction } from "@/types";
import { AlertsPanel } from "@/components/admin/AlertsPanel";

/**
 * Premium Admin Overview Dashboard.
 * Displays global system statistics, platform payout details, and searchable/filterable
 * logs of the platform ledgers.
 *
 * @returns The React component rendering the dashboard overview.
 */
export default function AdminOverviewPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isAdmin, isLoading: isWorkspaceLoading, fetchWorkspaceDetails } = useWorkspace();

  // Stats data
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Infrastructure metrics state
  const [infraMetrics, setInfraMetrics] = useState<any>(null);
  const [loadingInfra, setLoadingInfra] = useState(false);

  // Filters & Ledger state
  const [searchTerm, setSearchTerm] = useState("");
  const [txType, setTxType] = useState<"ALL" | "CREDIT" | "DEBIT">("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [scope, setScope] = useState<"ALL" | "SYSTEM_REVENUE">("ALL");
  const [transactions, setTransactions] = useState<PlatformTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [txLoading, setTxLoading] = useState(false);
  const limit = 10;

  // Load workspace context on mount
  useEffect(() => {
    if (session) {
      fetchWorkspaceDetails(session);
    }
  }, [session, fetchWorkspaceDetails]);

  // Redirect non-admins
  useEffect(() => {
    if (!isWorkspaceLoading && !isAdmin) {
      toast.error("Access denied: Admin permissions required");
      router.push("/dashboard");
    }
  }, [isAdmin, isWorkspaceLoading, router]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await smartFetch<PlatformStats>("/admin/stats");
      if (res) {
        setStats(res);
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load platform stats");
    } finally {
      setLoading(false);
    }
  };

  const loadInfraMetrics = async () => {
    setLoadingInfra(true);
    try {
      const res = await smartFetch<any>("/analytics/admin/metrics");
      if (res) {
        setInfraMetrics(res);
      }
    } catch (err) {
      console.error("Failed to load infrastructure metrics:", err);
    } finally {
      setLoadingInfra(false);
    }
  };

  const loadTransactions = async (pageTarget = 1) => {
    setTxLoading(true);
    try {
      let url = `/admin/transactions?page=${pageTarget}&limit=${limit}&scope=${scope}&type=${txType}`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      if (fromDate) {
        url += `&startDate=${encodeURIComponent(fromDate)}`;
      }
      if (toDate) {
        url += `&endDate=${encodeURIComponent(toDate)}`;
      }
      const res = await smartFetch<{ success: boolean; data: PlatformTransaction[]; total: number; page: number }>(url);
      if (res && res.success) {
        setTransactions(res.data);
        setTotal(res.total);
        setPage(res.page);
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load transactions ledger");
    } finally {
      setTxLoading(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadStats(), loadTransactions(1), loadInfraMetrics()]);
  };

  useEffect(() => {
    if (isAdmin) {
      loadStats();
      loadInfraMetrics();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadTransactions(1);
    }
  }, [isAdmin, scope, txType, fromDate, toDate]);

  if (isWorkspaceLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-foreground font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2.5 text-xs">Authenticating Admin Access...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 text-foreground font-mono text-xs animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="text-left">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2 font-mono">
            <Shield className="w-5 h-5 text-primary" />
            Admin Operations Center
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            Global system health overview, platform payout wallet vault, and general ledger operations.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50 text-foreground font-bold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && !stats ? (
        <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-card border border-border rounded-xl">
          <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
          <span>Fetching system statistics...</span>
        </div>
      ) : stats ? (
        <>
          {/* KPI Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border border-border bg-card p-0 shadow-xs relative overflow-hidden">
              <CardContent className="p-5">
                <div className="absolute right-3 top-3 text-muted-foreground/15">
                  <UsersIcon className="w-10 h-10" />
                </div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Platform Users</p>
                <CardTitle className="text-2xl font-extrabold text-foreground border-none p-0 h-auto">{stats.totalUsers}</CardTitle>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card p-0 shadow-xs relative overflow-hidden">
              <CardContent className="p-5">
                <div className="absolute right-3 top-3 text-muted-foreground/15">
                  <Layers className="w-10 h-10" />
                </div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Orgs</p>
                <CardTitle className="text-2xl font-extrabold text-foreground border-none p-0 h-auto">{stats.totalOrgs}</CardTitle>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card p-0 shadow-xs relative overflow-hidden">
              <CardContent className="p-5">
                <div className="absolute right-3 top-3 text-muted-foreground/15">
                  <Database className="w-10 h-10" />
                </div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Registered Models</p>
                <CardTitle className="text-2xl font-extrabold text-foreground border-none p-0 h-auto">{stats.totalModels}</CardTitle>
              </CardContent>
            </Card>

            {/* Platform Revenue Payout Wallet Card - Extremely Premium */}
            <Card className="border border-primary/30 bg-primary/4 p-0 shadow-xs relative overflow-hidden group hover:border-primary/50 transition-all">
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/15 transition-all" />
              <CardContent className="p-5">
                <div className="absolute right-3 top-3 text-primary/30 dark:text-primary/20">
                  <Coins className="w-10 h-10" />
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <p className="text-[9px] font-bold text-primary uppercase tracking-wider">Revenue Wallet</p>
                </div>
                <CardTitle className="text-2xl font-extrabold text-primary border-none p-0 h-auto font-mono">
                  {stats.platformBalance.toFixed(2)} {stats.platformCurrency || "EGP"}
                </CardTitle>
              </CardContent>
            </Card>

            {/* Infrastructure Health Status Card */}
            <Card className="border border-border bg-card p-0 shadow-xs relative overflow-hidden hover:border-border/80 transition-all">
              <CardContent className="p-5 space-y-2">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-purple-400" /> Host Infrastructure
                </p>
                {infraMetrics ? (
                  <div className="space-y-1.5 font-mono text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Host CPU:</span>
                      <span className="font-bold text-slate-200">{infraMetrics.hostCpu}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Host RAM:</span>
                      <span className="font-bold text-slate-200">{infraMetrics.hostRam}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Containers:</span>
                      <span className="font-bold text-purple-400">{infraMetrics.activeContainers} active</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground animate-pulse py-2">
                    Loading cAdvisor stats...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Split 2-column layout for Ledger and AlertsPanel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="border border-border bg-card shadow-xs p-0 overflow-hidden">
            <CardHeader className="p-5 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-bold text-foreground">Global Platform Ledger Logs</CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                Real-time ledger recording credit adjustments, organization creation dues, and platform revenue commission fees.
              </CardDescription>

              {/* Scope Tabs */}
              <div className="flex border-b border-border mt-4 mb-2">
                <button
                  onClick={() => {
                    setScope("ALL");
                    setPage(1);
                  }}
                  className={`px-4 py-2 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                    scope === "ALL"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All Platform Transactions
                </button>
                <button
                  onClick={() => {
                    setScope("SYSTEM_REVENUE");
                    setPage(1);
                  }}
                  className={`px-4 py-2 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                    scope === "SYSTEM_REVENUE"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Platform Revenue Ledger
                </button>
              </div>

              {/* Filters Section */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono mt-2">
                {/* Search */}
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Search ID/Ref (Press Enter)</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        loadTransactions(1);
                      }
                    }}
                    onBlur={() => loadTransactions(1)}
                    placeholder="Search reference..."
                    className="w-full h-8 px-3 rounded-md border border-border bg-background text-foreground text-xs font-mono placeholder:text-muted-foreground/60 outline-hidden focus:border-primary transition-all"
                  />
                </div>

                {/* Type Filter */}
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Transaction Type</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as "ALL" | "CREDIT" | "DEBIT")}
                    className="w-full h-8 px-2 rounded-md border border-border bg-background text-foreground text-xs font-mono outline-hidden focus:border-primary transition-all"
                  >
                    <option value="ALL">All Types</option>
                    <option value="CREDIT">CREDIT (Inflow)</option>
                    <option value="DEBIT">DEBIT (Outflow)</option>
                  </select>
                </div>

                {/* From Date */}
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 text-muted-foreground" /> From Date
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full h-8 px-3 rounded-md border border-border bg-background text-foreground text-xs font-mono outline-hidden focus:border-primary transition-all"
                  />
                </div>

                {/* To Date */}
                <div>
                  <label className="text-[9px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 text-muted-foreground" /> To Date
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full h-8 px-3 rounded-md border border-border bg-background text-foreground text-xs font-mono outline-hidden focus:border-primary transition-all"
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {txLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-card">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                  <span>Loading ledger records...</span>
                </div>
              ) : transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="w-full text-left border-collapse">
                    <TableHeader>
                      <TableRow className="bg-muted/10 border-b border-border">
                        <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Reference</TableHead>
                        <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Type</TableHead>
                        <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Amount</TableHead>
                        <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Transaction ID</TableHead>
                        <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border text-xs font-mono">
                      {transactions.map((tx) => {
                        const isCredit = tx.type === "CREDIT";
                        const valFloat = typeof tx.amount === "string" ? parseFloat(tx.amount) : tx.amount;
                        const isCreditsWallet = tx.walletCurrency === "CREDITS";
                        const displayAmount = isCreditsWallet
                          ? `${Math.round(valFloat)} Credits`
                          : `${valFloat.toFixed(2)} ${tx.walletCurrency || "EGP"}`;
                        return (
                          <TableRow key={tx.id} className="hover:bg-muted/30 border-b border-border">
                            <TableCell className="px-5 py-3 font-bold text-foreground max-w-xs truncate">
                              {tx.reference}
                            </TableCell>
                            <TableCell className="px-5 py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                                  isCredit 
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                                    : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                }`}
                              >
                                {isCredit ? (
                                  <ArrowDownLeft className="w-2.5 h-2.5" />
                                ) : (
                                  <ArrowUpRight className="w-2.5 h-2.5" />
                                )}
                                {tx.type}
                              </span>
                            </TableCell>
                            <TableCell className={`px-5 py-3 font-bold ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                              {isCredit ? "+" : "-"}{displayAmount}
                            </TableCell>
                            <TableCell className="px-5 py-3 text-muted-foreground select-all text-[10px]">
                              {tx.id}
                            </TableCell>
                            <TableCell className="px-5 py-3 text-muted-foreground text-[10px]">
                              {new Date(tx.createdAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No system transactions matched your filters.
                </div>
              )}
            </CardContent>

            {/* Pagination Controls */}
            {total > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/10 font-mono text-[10px]">
                <div className="text-muted-foreground">
                  Showing <span className="font-bold text-foreground">{(page - 1) * limit + 1}</span> to{" "}
                  <span className="font-bold text-foreground">
                    {Math.min(page * limit, total)}
                  </span>{" "}
                  of <span className="font-bold text-foreground">{total}</span> records
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (page > 1) {
                        const newPage = page - 1;
                        setPage(newPage);
                        loadTransactions(newPage);
                      }
                    }}
                    disabled={page === 1}
                    className="px-2 py-1 rounded border border-border bg-card hover:bg-secondary disabled:opacity-40 transition-colors cursor-pointer text-foreground font-bold"
                  >
                    Previous
                  </button>
                  <span className="text-muted-foreground">
                    Page <span className="font-bold text-foreground">{page}</span> of{" "}
                    <span className="font-bold text-foreground">{Math.ceil(total / limit) || 1}</span>
                  </span>
                  <button
                    onClick={() => {
                      if (page * limit < total) {
                        const newPage = page + 1;
                        setPage(newPage);
                        loadTransactions(newPage);
                      }
                    }}
                    disabled={page * limit >= total}
                    className="px-2 py-1 rounded border border-border bg-card hover:bg-secondary disabled:opacity-40 transition-colors cursor-pointer text-foreground font-bold"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </Card>
            </div>
            <div>
              <AlertsPanel />
            </div>
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-xl">
          Failed to load system dashboard analytics.
        </div>
      )}
    </div>
  );
}
