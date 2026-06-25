"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useWorkspace } from "@/hooks/use-workspace";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdjustBalanceModal from "@/components/admin/AdjustBalanceModal";
import {
  Loader2,
  UserCheck,
  UserX,
  Trash2,
  Sparkles,
  Coins,
  RefreshCw,
  Key,
  ChevronLeft,
  Calendar,
  User,
  Activity,
  BarChart3,
} from "lucide-react";

interface ApiKeyDetails {
  id: string;
  key: string;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  model: { id: string; name: string } | null;
}

interface ModelDetails {
  id: string;
  name: string;
  framework: string;
  costPerRequest: number;
  isPublic: boolean;
  createdAt: string;
}

interface UsageStatDetails {
  modelId: string;
  modelName: string;
  modelType: string;
  modelFramework: string;
  costPerRequest: number;
  callCount: number;
  totalSpent: number;
}

interface AdminUserDetails {
  id: string;
  fullName: string;
  email: string;
  isAdmin: boolean;
  providerMode: boolean;
  status: string;
  createdAt: string;
  consumerBalance: number;
  providerBalance: number;
  apiKeys: ApiKeyDetails[];
  models: ModelDetails[];
  usageStats: UsageStatDetails[];
}

/**
 * Calculates a relative time difference string from the current time.
 *
 * @param dateString - The ISO date string.
 * @returns A formatted relative time description (e.g. '3d ago').
 */
function getRelativeTimeString(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${diffYears}y ago`;
}

/**
 * Capitalizes a string value.
 *
 * @param text - Input text.
 * @returns Text with capitalized first letter.
 */
function capitalize(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Dedicated Admin Developer Details and Control Center page.
 * Displays user balances, credential history, model listings, and roles configuration.
 *
 * @param props - dynamic route parameters.
 * @returns React element.
 */
export default function AdminUserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  const router = useRouter();
  const { data: session } = useSession();
  const { isAdmin, isLoading: isWorkspaceLoading, fetchWorkspaceDetails } = useWorkspace();

  const [userDetails, setUserDetails] = useState<AdminUserDetails | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

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

  const loadUserDetails = async (showToast = false) => {
    setLoading(true);
    try {
      const data = await smartFetch<AdminUserDetails>(`/admin/users/${userId}`);
      setUserDetails(data);
      if (showToast) {
        toast.success("Developer profile data synced!");
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load developer profile details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUserDetails(false);
    }
  }, [isAdmin, userId]);

  const handleToggleAdmin = async () => {
    if (!userDetails) return;
    try {
      const res = await smartFetch<{ success: boolean; isAdmin: boolean }>(`/admin/users/${userId}/toggle-admin`, {
        method: "PATCH",
      });
      if (res.success) {
        toast.success(`Admin status ${res.isAdmin ? "granted" : "revoked"} successfully!`);
        setUserDetails((prev) => (prev ? { ...prev, isAdmin: res.isAdmin } : null));
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle role");
    }
  };

  const handleToggleProvider = async () => {
    if (!userDetails) return;
    try {
      const res = await smartFetch<{ success: boolean; providerMode: boolean }>(`/admin/users/${userId}/toggle-provider`, {
        method: "PATCH",
      });
      if (res.success) {
        toast.success(`Provider status ${res.providerMode ? "activated" : "deactivated"} successfully!`);
        setUserDetails((prev) => (prev ? { ...prev, providerMode: res.providerMode } : null));
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle role");
    }
  };

  const handleDeleteUser = async () => {
    if (!userDetails) return;
    if (userDetails.email.toLowerCase().includes("admin")) {
      toast.error("Cannot delete administrator user account");
      return;
    }
    if (!confirm(`Are you absolutely sure you want to permanently delete user account "${userDetails.fullName}"? All wallets and models will be deleted. This is irreversible!`)) {
      return;
    }
    try {
      const res = await smartFetch<{ success: boolean }>(`/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (res.success) {
        toast.success("User account successfully purged");
        router.push("/admin/users");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
    }
  };


  if (isWorkspaceLoading || !isAdmin || !userDetails) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-foreground font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2.5 text-xs">Loading Developer Context...</span>
      </div>
    );
  }

  // Adjust Wallet Balance Modal Payload Mapper
  const adjustUserModalPayload = {
    id: userDetails.id,
    fullName: userDetails.fullName,
    consumerBalance: userDetails.consumerBalance,
    providerBalance: userDetails.providerBalance,
  };

  return (
    <div className="w-full space-y-6 text-foreground font-mono text-xs animate-fade-in">
      {/* Header & Back Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5 gap-4">
        <div className="text-left space-y-1">
          <button
            onClick={() => router.push("/admin/users")}
            className="group flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-2 font-sans font-semibold"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to User Registry
          </button>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2 font-mono">
            <User className="w-5 h-5 text-primary" />
            Developer Profile Controls
          </h1>
          <p className="text-xs text-muted-foreground font-sans">
            Detailed resource registry, security credentials, balances ledger, and system overrides for developer contexts.
          </p>
        </div>
        <button
          onClick={() => loadUserDetails(true)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50 text-foreground font-bold font-mono self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Profile</span>
        </button>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: General Profile Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-border bg-card shadow-xs overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/15 p-4">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Account Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-left">
              {/* Profile Avatar / Badge */}
              <div className="flex items-center gap-3 bg-secondary/20 p-3 rounded-lg border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-sans font-bold text-primary text-base">
                  {userDetails.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="font-bold text-foreground block font-sans text-sm">{userDetails.fullName}</span>
                  <span className="text-[10px] text-muted-foreground block font-sans mt-0.5">{userDetails.email}</span>
                </div>
              </div>

              {/* Attributes fields */}
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-0.5">Developer ID</span>
                  <span className="text-foreground select-all break-all block p-1.5 bg-secondary/10 border border-border rounded font-mono text-[10px]">
                    {userDetails.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-0.5">Account Status</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border font-sans ${
                      userDetails.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                    }`}>
                      {userDetails.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-0.5">Member Since</span>
                    <span className="text-foreground flex items-center gap-1.5 mt-0.5" title={new Date(userDetails.createdAt).toLocaleString()}>
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{getRelativeTimeString(userDetails.createdAt)}</span>
                    </span>
                  </div>
                </div>

                <div className="border-t border-border pt-3 mt-3">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-1.5">Platform Privileges</span>
                  <div className="flex flex-wrap gap-1.5 font-sans">
                    {userDetails.isAdmin && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                        ADMINISTRATOR
                      </span>
                    )}
                    {userDetails.providerMode && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        SERVICE PROVIDER
                      </span>
                    )}
                    {!userDetails.isAdmin && !userDetails.providerMode && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-muted text-muted-foreground border border-border">
                        CONSUMER MODE ONLY
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Balances Card */}
          <Card className="border border-border bg-card shadow-xs overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/15 p-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-500" />
                Wallet Registry
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAdjustModalOpen(true)}
                className="h-6 text-[10px] hover:bg-secondary cursor-pointer text-primary border border-primary/20 font-bold px-2 rounded"
              >
                Adjust Balance
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              {/* Consumer Wallet (Credits) */}
              <div className="p-3 border border-primary/20 bg-primary/[0.01] rounded-lg text-left relative overflow-hidden">
                <div className="absolute right-3 top-3 text-primary/10">
                  <Coins className="w-8 h-8" />
                </div>
                <span className="text-[9px] font-bold text-primary uppercase block tracking-wider mb-1">Consumer Balance</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-extrabold text-primary">{Math.round(userDetails.consumerBalance)}</span>
                  <span className="text-[10px] text-muted-foreground font-sans">Credits</span>
                </div>
              </div>

              {/* Provider Wallet (EGP) */}
              <div className="p-3 border border-emerald-500/20 bg-emerald-500/[0.01] rounded-lg text-left relative overflow-hidden">
                <div className="absolute right-3 top-3 text-emerald-500/10">
                  <Coins className="w-8 h-8" />
                </div>
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block tracking-wider mb-1">Provider Balance</span>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{userDetails.providerBalance.toFixed(2)}</span>
                  <span className="text-[10px] text-muted-foreground font-sans">EGP</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Override Center */}
          <Card className="border border-border bg-card shadow-xs overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/15 p-4">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-500" />
                Administrative Overrides
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 font-sans">
              <Button
                variant="outline"
                onClick={handleToggleAdmin}
                className={`w-full justify-start gap-2 h-9 text-xs cursor-pointer text-foreground hover:bg-secondary font-bold ${
                  userDetails.isAdmin ? "border-red-500/30 bg-red-500/5 hover:bg-red-500/10" : "border-border"
                }`}
              >
                {userDetails.isAdmin ? <UserX className="w-4 h-4 text-red-500" /> : <UserCheck className="w-4 h-4 text-primary" />}
                {userDetails.isAdmin ? "Revoke Admin Status" : "Grant Admin Status"}
              </Button>
              <Button
                variant="outline"
                onClick={handleToggleProvider}
                className={`w-full justify-start gap-2 h-9 text-xs cursor-pointer text-foreground hover:bg-secondary font-bold ${
                  userDetails.providerMode ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10" : "border-border"
                }`}
              >
                <UserCheck className={`w-4 h-4 ${userDetails.providerMode ? "text-emerald-500" : "text-muted-foreground"}`} />
                {userDetails.providerMode ? "Deactivate Provider Mode" : "Activate Provider Mode"}
              </Button>
              <Button
                variant="outline"
                disabled={userDetails.email.toLowerCase().includes("admin")}
                onClick={handleDeleteUser}
                className="w-full justify-start gap-2 h-9 text-xs cursor-pointer border-red-500/30 hover:border-red-600 bg-red-500/5 hover:bg-red-500/15 text-red-500 hover:text-red-600 font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Purge Account Context
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Detailed API Credentials & Hosted Models */}
        <div className="lg:col-span-2 space-y-6 text-left">
          {/* API Keys Ledger */}
          <Card className="border border-border bg-card shadow-xs overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/15 p-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  API Credentials Ledger
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                  Active live keys and playground credentials history.
                </CardDescription>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                {userDetails.apiKeys?.filter((k) => k.model).length || 0} Total
              </span>
            </CardHeader>
            <CardContent className="p-4">
              {userDetails.apiKeys && userDetails.apiKeys.filter((k) => k.model).length > 0 ? (
                <div className="space-y-3.5">
                  {userDetails.apiKeys.filter((k) => k.model).map((apiKey) => (
                    <div
                      key={apiKey.id}
                      className="border border-border rounded-lg bg-secondary/15 p-3 relative hover:border-primary/20 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-foreground font-sans">
                            {apiKey.name}
                          </span>
                          <span className={`px-1.5 py-0.25 rounded text-[8px] font-bold tracking-wider font-mono ${
                            apiKey.type === "LIVE"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              : "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                          }`}>
                            {apiKey.type}
                          </span>
                          {apiKey.model && (
                            <span className="px-1.5 py-0.25 rounded text-[8px] font-bold bg-muted border border-border text-muted-foreground font-sans max-w-[150px] truncate" title={`Model Scope: ${apiKey.model.name}`}>
                              Scope: {apiKey.model.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className={`inline-flex items-center px-1.5 py-0.25 rounded text-[8px] font-bold font-sans ${
                            apiKey.isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                          }`}>
                            {apiKey.isActive ? "Active" : "Revoked"}
                          </span>
                          <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {getRelativeTimeString(apiKey.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 p-2 bg-card border border-border rounded-lg font-mono">
                        <span className="text-[10px] select-all break-all flex-1 text-primary font-bold pr-2">
                          {apiKey.key}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-border rounded-lg text-center text-muted-foreground text-[10px] font-sans">
                  No active or historical API credentials found for this developer.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hosted Models Registry */}
          <Card className="border border-border bg-card shadow-xs overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/15 p-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  Hosted Model Registries
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                  Machine learning model catalogs registered by this developer.
                </CardDescription>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                {userDetails.models?.length || 0} Registered
              </span>
            </CardHeader>
            <CardContent className="p-4">
              {userDetails.models && userDetails.models.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userDetails.models.map((model) => (
                    <Card
                      key={model.id}
                      className="border border-border bg-secondary/15 relative overflow-hidden group hover:border-primary/20 transition-all p-3 text-left font-sans"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs text-foreground block group-hover:text-primary transition-colors">
                            {model.name}
                          </span>
                          <span className="text-[9px] text-muted-foreground/60 select-all block font-mono">
                            {model.id}
                          </span>
                        </div>
                        <span className={`px-1.5 py-0.25 rounded text-[8px] font-bold font-mono tracking-wider shrink-0 ${
                          model.isPublic
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            : "bg-muted border border-border text-muted-foreground"
                        }`}>
                          {model.isPublic ? "PUBLIC" : "PRIVATE"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between border-t border-border/60 pt-2.5 mt-2 gap-2 text-[10px]">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.25 rounded bg-card border border-border font-bold font-mono text-[8px] uppercase">
                            {capitalize(model.framework)}
                          </span>
                          <span className="text-muted-foreground text-[9px] flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3" />
                            {getRelativeTimeString(model.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-primary font-bold text-xs">
                          <Coins className="w-3.5 h-3.5" />
                          <span>{model.costPerRequest} Cr.</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-border rounded-lg text-center text-muted-foreground text-[10px] font-sans">
                  This developer is not currently hosting any machine learning models in the registry.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consumer Model Usage Statistics */}
          <Card className="border border-border bg-card shadow-xs overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/15 p-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Consumer Models Usage
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                  Machine learning models consumed by this developer account and credit spends.
                </CardDescription>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                {userDetails.usageStats?.length || 0} Models Used
              </span>
            </CardHeader>
            <CardContent className="p-4">
              {userDetails.usageStats && userDetails.usageStats.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {userDetails.usageStats.map((stat) => (
                    <Card
                      key={stat.modelId}
                      className="border border-border bg-secondary/15 relative overflow-hidden p-3 text-left font-sans"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="space-y-0.5">
                          <span className="font-bold text-xs text-foreground block">
                            {stat.modelName}
                          </span>
                          <span className="text-[9px] text-muted-foreground/60 select-all block font-mono">
                            {stat.modelId}
                          </span>
                        </div>
                        <span className="px-1.5 py-0.25 rounded text-[8px] font-bold font-mono tracking-wider shrink-0 bg-muted border border-border text-muted-foreground uppercase">
                          {capitalize(stat.modelFramework)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between border-t border-border/60 pt-2.5 mt-2 gap-2 text-[10px]">
                        <div className="grid grid-cols-2 gap-4 text-left">
                          <div>
                            <span className="block text-[8px] text-muted-foreground/50 uppercase tracking-wider font-mono">Call Volume</span>
                            <span className="font-bold text-foreground font-mono text-[10px]">{stat.callCount} calls</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-muted-foreground/50 uppercase tracking-wider font-mono">Credits Spent</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">{Math.round(stat.totalSpent)} Cr.</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-muted-foreground text-[10px] ml-auto self-end">
                          <span>Cost: {stat.costPerRequest} Cr.</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-border rounded-lg text-center text-muted-foreground text-[10px] font-sans">
                  No model prediction usage recorded yet for this developer account.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Adjust Wallet Balance Modal */}
      <AdjustBalanceModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        user={adjustUserModalPayload}
        onSuccess={() => loadUserDetails(false)}
      />
    </div>
  );
}
