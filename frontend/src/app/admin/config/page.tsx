"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, DollarSign, Coins, CheckCircle, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import { useWorkspace } from "@/hooks/use-workspace";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";

import SystemConfigTab from "@/components/admin/SystemConfigTab";

/**
 * System Configurations page.
 * Restricts access to global admins and exposes settings to adjust organization setup costs,
 * general system pricing defaults, credits conversion coefficients, and trial thresholds.
 *
 * @returns The React component rendering the system config page.
 */
export default function AdminConfigPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isAdmin, isLoading: isWorkspaceLoading, fetchWorkspaceDetails } = useWorkspace();

  // Org Fee Settings states
  const [orgFee, setOrgFee] = useState<number>(50.0);
  const [feeInput, setFeeInput] = useState("");
  const [loadingFee, setLoadingFee] = useState(false);
  const [updatingFee, setUpdatingFee] = useState(false);

  // Live credits/EGP rate for the summary stat card
  const [creditsPerEgp, setCreditsPerEgp] = useState<number>(10);

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

  // Load Settings Data
  const loadFeeConfig = async (showToast = false) => {
    setLoadingFee(true);
    try {
      const [feeRes, pricingRes] = await Promise.all([
        smartFetch<{ fee: number }>("/admin/config/org-creation-fee"),
        smartFetch<{ credits_per_egp: number }>("/admin/config/pricing-defaults"),
      ]);
      if (feeRes) {
        setOrgFee(feeRes.fee);
        setFeeInput(feeRes.fee.toString());
      }
      if (pricingRes?.credits_per_egp) {
        setCreditsPerEgp(pricingRes.credits_per_egp);
      }
      if (showToast) {
        toast.success("System configurations synced!");
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load organization fee configuration");
    } finally {
      setLoadingFee(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadFeeConfig(false);
    }
  }, [isAdmin]);

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
      toast.success("Organization creation fee adjusted successfully!");
      setOrgFee(fee);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust fee parameters");
    } finally {
      setUpdatingFee(false);
    }
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
    <div className="w-full space-y-6 text-foreground font-mono text-xs animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="text-left">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2 font-mono">
            <Shield className="w-5 h-5 text-primary" />
            System Configuration Console
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            Overseeing global pricing settings, default credit exchange rates, and workspace setup dues.
          </p>
        </div>
        <button
          onClick={() => loadFeeConfig(true)}
          disabled={loadingFee}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50 text-foreground font-bold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingFee ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Configuration Status Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Workspace Creation Dues */}
        <Card className="border border-border bg-card p-0 shadow-xs relative overflow-hidden group hover:border-primary/20 transition-all">
          <CardContent className="p-4">
            <div className="absolute right-3 top-3 text-muted-foreground/15">
              <DollarSign className="w-8 h-8" />
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Workspace Setup Dues</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground">{orgFee.toFixed(2)}</span>
              <span className="text-[10px] text-muted-foreground">Charge per organization setup</span>
            </div>
          </CardContent>
        </Card>

        {/* Credit Exchange Rates */}
        <Card className="border border-border bg-card p-0 shadow-xs relative overflow-hidden group hover:border-primary/20 transition-all">
          <CardContent className="p-4">
            <div className="absolute right-3 top-3 text-muted-foreground/15">
              <Coins className="w-8 h-8" />
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Exchange Rates Coefficient</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground">{creditsPerEgp.toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground">Credits per 1.00 EGP</span>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Status */}
        <Card className="border border-emerald-500/20 bg-emerald-500/[0.02] p-0 shadow-xs relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <CardContent className="p-4">
            <div className="absolute right-3 top-3 text-emerald-500/10">
              <CheckCircle className="w-8 h-8" />
            </div>
            <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Parameters Registry Status</p>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">ACTIVE & SYNCED</span>
              <span className="text-[9px] text-muted-foreground">Global variables ready</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <SystemConfigTab
        orgFee={orgFee}
        feeInput={feeInput}
        onFeeInputChange={setFeeInput}
        loadingFee={loadingFee}
        updatingFee={updatingFee}
        onUpdateFee={handleUpdateFee}
      />
    </div>
  );
}
