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
      <div className="flex items-center justify-center min-h-[60vh] text-foreground font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2.5 text-xs">Authenticating Admin Access...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 text-foreground font-sans text-xs animate-fade-in relative">
      {/* Decorative background glows */}
      <div className="glow-spot" />
      <div className="glow-spot-secondary" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 pb-5 relative z-10">
        <div className="text-left">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2 font-sans">
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
          className="btn-outline h-9 px-4 font-bold text-[10px] cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingFee ? "animate-spin" : ""}`} />
          <span>Refresh Config</span>
        </button>
      </div>

      {/* Configuration Status Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        {/* Workspace Creation Dues */}
        <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300 relative overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-between h-28 text-left">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Workspace Setup Dues
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 dark:bg-blue-500/5 shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-extrabold text-foreground tracking-tight">{orgFee.toFixed(2)}</span>
              <span className="text-[10px] text-muted-foreground">Charge per organization setup</span>
            </div>
          </CardContent>
        </Card>

        {/* Credit Exchange Rates */}
        <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300 relative overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-between h-28 text-left">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Exchange Rates Coefficient
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 dark:bg-purple-500/5 shrink-0">
                <Coins className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-extrabold text-foreground tracking-tight">{creditsPerEgp.toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground">Credits per 1.00 EGP</span>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Status */}
        <Card className="border border-emerald-500/25 bg-emerald-500/5 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300 relative overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-between h-28 text-left">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Parameters Registry Status
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
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
