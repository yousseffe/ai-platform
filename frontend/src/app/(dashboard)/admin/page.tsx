"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Coins,
  Cpu,
  Database,
  Users as UsersIcon,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Check,
  Edit2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useWorkspace } from "@/hooks/use-workspace";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";

interface AdminModel {
  id: string;
  name: string;
  description: string;
  tier: string;
  costPerRequest: number;
  providerSharePercent: number;
  status: string;
  port: number | null;
  cpu: string;
  ram: string;
  owner: string;
}

interface PlatformTransaction {
  id: string;
  walletId: string;
  type: "CREDIT" | "DEBIT";
  amount: string | number;
  reference: string;
  status: string;
  createdAt: string;
}

interface PlatformStats {
  totalUsers: number;
  totalModels: number;
  totalOrgs: number;
  platformBalance: number;
  recentTransactions: PlatformTransaction[];
}

/**
 * Premium Admin Control Console Page.
 * Restricts access to platform administrators and compiles active deployments,
 * live metrics monitoring, commission rate configurations, and transaction logs.
 */
export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAdmin, isLoading: isWorkspaceLoading } = useWorkspace();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<"deployments" | "settings" | "ledger">("deployments");

  // Core data states
  const [models, setModels] = useState<AdminModel[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [orgFee, setOrgFee] = useState<number>(50.0);

  // Loading states
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingFee, setLoadingFee] = useState(false);

  // Pricing Modal states
  const [editingModel, setEditingModel] = useState<AdminModel | null>(null);
  const [costInput, setCostInput] = useState("");
  const [shareInput, setShareInput] = useState("");
  const [updatingPricing, setUpdatingPricing] = useState(false);

  // Org Fee Settings states
  const [feeInput, setFeeInput] = useState("");
  const [updatingFee, setUpdatingFee] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!isWorkspaceLoading && !isAdmin) {
      toast.error("Access denied: Admin permissions required");
      router.push("/dashboard");
    }
  }, [isAdmin, isWorkspaceLoading, router]);

  // Load Deployments Tab Data
  const loadModels = async () => {
    setLoadingModels(true);
    try {
      const data = await smartFetch<AdminModel[]>("/admin/models");
      setModels(data || []);
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load active model deployments");
    } finally {
      setLoadingModels(false);
    }
  };

  // Load Settings Tab Data
  const loadFeeConfig = async () => {
    setLoadingFee(true);
    try {
      const res = await smartFetch<{ fee: number }>("/admin/config/org-creation-fee");
      if (res) {
        setOrgFee(res.fee);
        setFeeInput(res.fee.toString());
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load organization fee configuration");
    } finally {
      setLoadingFee(false);
    }
  };

  // Load Platform Ledger Tab Data
  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await smartFetch<PlatformStats>("/admin/stats");
      if (res) {
        setStats(res);
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load platform stats and ledger");
    } finally {
      setLoadingStats(false);
    }
  };

  // Switch tab triggers
  useEffect(() => {
    if (!isAdmin) return;

    if (activeTab === "deployments") {
      const t = setTimeout(() => { loadModels(); }, 0);
      return () => clearTimeout(t);
    } else if (activeTab === "settings") {
      const t = setTimeout(() => { loadFeeConfig(); }, 0);
      return () => clearTimeout(t);
    } else if (activeTab === "ledger") {
      const t = setTimeout(() => { loadStats(); }, 0);
      return () => clearTimeout(t);
    }
  }, [activeTab, isAdmin]);

  // Pricing configuration submit handler
  const handleUpdatePricing = async () => {
    if (!editingModel) return;

    const cost = parseFloat(costInput);
    const share = parseFloat(shareInput);

    if (isNaN(cost) || cost < 0) {
      toast.error("Please enter a valid cost per request");
      return;
    }

    if (isNaN(share) || share < 0 || share > 100) {
      toast.error("Provider share percentage must be between 0 and 100");
      return;
    }

    setUpdatingPricing(true);
    try {
      await smartFetch(`/admin/models/${editingModel.id}/pricing`, {
        method: "PATCH",
        body: JSON.stringify({
          costPerRequest: cost,
          providerSharePercent: share,
        }),
      });
      toast.success("Pricing parameters updated successfully!");
      setEditingModel(null);
      await loadModels();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust parameters");
    } finally {
      setUpdatingPricing(false);
    }
  };

  // Org Fee config submit handler
  const handleUpdateFee = async () => {
    const fee = parseFloat(feeInput);
    if (isNaN(fee) || fee < 0) {
      toast.error("Please enter a valid positive fee amount");
      return;
    }

    setUpdatingFee(true);
    try {
      await smartFetch("/admin/config/org-creation-fee", {
        method: "PATCH",
        body: JSON.stringify({ fee }),
      });
      toast.success("Organization creation fee adjusted!");
      setOrgFee(fee);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust fee parameters");
    } finally {
      setUpdatingFee(false);
    }
  };

  const openPricingModal = (model: AdminModel) => {
    setEditingModel(model);
    const parsedCost = typeof model.costPerRequest === "string" ? parseFloat(model.costPerRequest) : model.costPerRequest;
    setCostInput(parsedCost.toString());
    setShareInput(model.providerSharePercent.toString());
  };

  if (isWorkspaceLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-foreground font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2.5 text-xs">Authenticating Admin Access...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-foreground font-mono text-xs animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="text-left">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            Admin Operations Center
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Global pricing parameters configuration, running container resource utilization, and platform ledgers.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("deployments")}
          className={`pb-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "deployments"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Active Deployments
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "settings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          System Config
        </button>
        <button
          onClick={() => setActiveTab("ledger")}
          className={`pb-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "ledger"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Platform Ledger
        </button>
      </div>

      {/* TAB CONTENT: DEPLOYMENTS */}
      {activeTab === "deployments" && (
        <div className="space-y-6 animate-fade-in text-left">
          <Card className="border border-border bg-card shadow-sm p-0 overflow-hidden">
            <CardHeader className="p-5 border-b border-border bg-accent/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">Container Metrics Registry</CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground mt-0.5">
                  Currently running inference containers, port mapping, and live CPU/RAM utilization.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadModels}
                disabled={loadingModels}
                className="h-8 text-[10px] gap-1 px-3"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingModels ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingModels ? (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                  <span>Polling Docker Engine...</span>
                </div>
              ) : models.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="w-full text-left border-collapse">
                    <TableHeader>
                      <TableRow className="bg-background border-b border-border hover:bg-background">
                        <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Model</TableHead>
                        <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Status</TableHead>
                        <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Host Port</TableHead>
                        <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">CPU Usage</TableHead>
                        <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">RAM Memory</TableHead>
                        <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Cost / Req</TableHead>
                        <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Split Share</TableHead>
                        <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border text-xs font-mono">
                      {models.map((model) => {
                        const isActive = model.status === "ACTIVE";
                        return (
                          <TableRow key={model.id} className="hover:bg-accent/40 border-b border-border">
                            <TableCell className="px-5 py-3.5">
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground">{model.name}</span>
                                <span className="text-[9px] text-muted-foreground mt-0.5">Owner: {model.owner}</span>
                              </div>
                            </TableCell>
                            <TableCell className="px-5 py-3.5">
                              <Badge
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                  isActive
                                    ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                                    : "bg-slate-900/60 text-slate-400 border-slate-700/50"
                                }`}
                              >
                                {model.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-5 py-3.5 font-bold text-primary">
                              {model.port ? `:${model.port}` : "—"}
                            </TableCell>
                            <TableCell className="px-5 py-3.5 text-foreground font-mono">
                              <span className="flex items-center gap-1.5">
                                <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                                {model.cpu}
                              </span>
                            </TableCell>
                            <TableCell className="px-5 py-3.5 text-foreground font-mono">
                              {model.ram}
                            </TableCell>
                            <TableCell className="px-5 py-3.5 font-bold text-foreground">
                              ${(typeof model.costPerRequest === "string" ? parseFloat(model.costPerRequest) : model.costPerRequest).toFixed(2)}
                            </TableCell>
                            <TableCell className="px-5 py-3.5 text-muted-foreground">
                              {model.providerSharePercent}% Provider / {100 - model.providerSharePercent}% Platform
                            </TableCell>
                            <TableCell className="px-5 py-3.5 text-right font-sans">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPricingModal(model)}
                                className="h-7 text-[10px] font-bold text-primary hover:bg-primary/10 gap-1 cursor-pointer font-mono"
                              >
                                <Edit2 className="w-3 h-3" /> Adjust Pricing
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No models have been published to the registry yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: SYSTEM CONFIG */}
      {activeTab === "settings" && (
        <div className="space-y-6 animate-fade-in text-left max-w-xl">
          <Card className="border border-border bg-card shadow-sm font-mono text-xs text-foreground">
            <CardHeader className="border-b border-border bg-accent/20">
              <CardTitle className="text-sm font-bold text-foreground">Workspace Platform Constraints</CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground mt-0.5">
                Configure global ledger constraints, onboarding organization creation fees, and platform default commissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {loadingFee ? (
                <div className="py-6 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                  <span>Fetching system configs...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Organization Creation Fee (Credits)
                    </label>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                          $
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={feeInput}
                          onChange={(e) => setFeeInput(e.target.value)}
                          className="pl-7 bg-input border-border text-foreground font-medium rounded-lg h-9 text-xs focus-visible:ring-primary/20"
                        />
                      </div>
                      <Button
                        onClick={handleUpdateFee}
                        disabled={updatingFee}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs px-4 rounded-lg border-none cursor-pointer"
                      >
                        {updatingFee ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          "Apply Fee"
                        )}
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-snug mt-1">
                      This fee is charged to a user&apos;s personal Consumer wallet whenever they initialize a new organization workspace. Current setting is **${orgFee.toFixed(2)} Credits**.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: PLATFORM LEDGER */}
      {activeTab === "ledger" && (
        <div className="space-y-6 animate-fade-in text-left">
          {/* Stats KPI Cards */}
          {loadingStats ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-card border border-border rounded-xl">
              <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
              <span>Fetching financial ledgers...</span>
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
                <Card className="border border-border bg-card p-0 shadow-sm relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="absolute right-3 top-3 text-muted-foreground/10"><UsersIcon className="w-10 h-10" /></div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Platform Users</p>
                    <CardTitle className="text-2xl font-extrabold text-foreground border-none p-0 h-auto">{stats.totalUsers}</CardTitle>
                  </CardContent>
                </Card>

                <Card className="border border-border bg-card p-0 shadow-sm relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="absolute right-3 top-3 text-muted-foreground/10"><Layers className="w-10 h-10" /></div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Total Orgs</p>
                    <CardTitle className="text-2xl font-extrabold text-foreground border-none p-0 h-auto">{stats.totalOrgs}</CardTitle>
                  </CardContent>
                </Card>

                <Card className="border border-border bg-card p-0 shadow-sm relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="absolute right-3 top-3 text-muted-foreground/10"><Database className="w-10 h-10" /></div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Registered Models</p>
                    <CardTitle className="text-2xl font-extrabold text-foreground border-none p-0 h-auto">{stats.totalModels}</CardTitle>
                  </CardContent>
                </Card>

                <Card className="border border-border bg-emerald-950/20 border-emerald-500/20 p-0 shadow-sm relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="absolute right-3 top-3 text-emerald-500/10"><Coins className="w-10 h-10" /></div>
                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">System Admin Wallet</p>
                    <CardTitle className="text-2xl font-extrabold text-emerald-400 border-none p-0 h-auto">
                      ${stats.platformBalance.toFixed(2)}
                    </CardTitle>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions Log Grid */}
              <Card className="border border-border bg-card shadow-sm p-0 overflow-hidden mt-6">
                <CardHeader className="p-5 border-b border-border bg-accent/20">
                  <CardTitle className="text-sm font-bold text-foreground">Global Platforms Ledger Logs</CardTitle>
                  <CardDescription className="text-[10px] text-muted-foreground mt-0.5">
                    Real-time transaction history recording credits deposits, organization creations, and prediction commission splits.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {stats.recentTransactions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table className="w-full text-left border-collapse">
                        <TableHeader>
                          <TableRow className="bg-background border-b border-border hover:bg-background">
                            <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Reference</TableHead>
                            <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Type</TableHead>
                            <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Amount</TableHead>
                            <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Transaction ID</TableHead>
                            <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Timestamp</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border text-xs font-mono">
                          {stats.recentTransactions.map((tx) => {
                            const isCredit = tx.type === "CREDIT";
                            const valFloat = typeof tx.amount === "string" ? parseFloat(tx.amount) : tx.amount;
                            return (
                              <TableRow key={tx.id} className="hover:bg-accent/40 border-b border-border">
                                <TableCell className="px-5 py-3 font-bold text-foreground max-w-xs truncate">
                                  {tx.reference}
                                </TableCell>
                                <TableCell className="px-5 py-3">
                                  <Badge
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold border tracking-wider ${
                                      isCredit
                                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                                        : "bg-red-950/40 text-red-400 border-red-500/30"
                                    }`}
                                  >
                                    <span className="flex items-center gap-1">
                                      {isCredit ? (
                                        <ArrowDownLeft className="w-2.5 h-2.5" />
                                      ) : (
                                        <ArrowUpRight className="w-2.5 h-2.5" />
                                      )}
                                      {tx.type}
                                    </span>
                                  </Badge>
                                </TableCell>
                                <TableCell className={`px-5 py-3 font-bold ${isCredit ? "text-emerald-400" : "text-red-400"}`}>
                                  {isCredit ? "+" : "-"}${valFloat.toFixed(2)}
                                </TableCell>
                                <TableCell className="px-5 py-3 text-muted-foreground select-all">
                                  {tx.id}
                                </TableCell>
                                <TableCell className="px-5 py-3 text-muted-foreground">
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
                      No system transactions logged in database ledger.
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Failed to load platform data.
            </div>
          )}
        </div>
      )}

      {/* ADJUST PRICING MODAL */}
      <Dialog open={editingModel !== null} onOpenChange={(open) => !open && setEditingModel(null)}>
        <DialogContent className="sm:max-w-[420px] bg-card border border-border text-foreground font-mono text-xs">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-sm font-bold text-foreground">Adjust Model Pricing Parameters</DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground">
              Configure cost charged per prediction inference, and the provider earnings distribution split for model <strong className="text-foreground">{editingModel?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Cost Per Request (Credits)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                  $
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costInput}
                  onChange={(e) => setCostInput(e.target.value)}
                  className="pl-7 bg-input border-border text-foreground font-medium rounded-lg h-9 text-xs"
                />
              </div>
              <p className="text-[9px] text-muted-foreground leading-normal mt-1">
                The fee subtracted from a consumer&apos;s wallet balance upon executing a prediction request on this model.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Provider Share Rate (%)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={shareInput}
                  onChange={(e) => setShareInput(e.target.value)}
                  className="pr-7 bg-input border-border text-foreground font-medium rounded-lg h-9 text-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                  %
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground leading-normal mt-1">
                Percentage of cost per request allocated to the provider&apos;s earnings. Remaining share goes to the platform commission balance ({editingModel ? 100 - (parseFloat(shareInput) || 0) : 0}%).
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingModel(null)}
              className="py-1.5 h-9 text-[10px] flex-1 cursor-pointer"
              disabled={updatingPricing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePricing}
              className="bg-primary hover:bg-primary/90 text-primary-foreground py-1.5 h-9 text-[10px] flex-1 cursor-pointer font-bold"
              disabled={updatingPricing}
            >
              {updatingPricing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  Save Configuration <Check className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
