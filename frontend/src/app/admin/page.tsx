"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useWorkspace } from "@/hooks/use-workspace";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";

import { AdminModel, PlatformStats } from "@/types";
import ActiveDeploymentsTab from "@/components/admin/ActiveDeploymentsTab";
import SystemConfigTab from "@/components/admin/SystemConfigTab";
import PlatformLedgerTab from "@/components/admin/PlatformLedgerTab";
import AdjustPricingModal from "@/components/admin/AdjustPricingModal";

/**
 * Premium Admin Control Console Page.
 * Restricts access to platform administrators and compiles active deployments,
 * live metrics monitoring, commission rate configurations, and transaction logs.
 *
 * @returns The React page component for Admin Dashboard.
 */
export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isAdmin, isLoading: isWorkspaceLoading, fetchWorkspaceDetails } = useWorkspace();

  // Load workspace context on mount if not already loaded
  useEffect(() => {
    if (session) {
      fetchWorkspaceDetails(session);
    }
  }, [session, fetchWorkspaceDetails]);

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
    <div className="w-full space-y-6 text-foreground font-mono text-xs animate-fade-in">
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
        <ActiveDeploymentsTab
          models={models}
          loading={loadingModels}
          onRefresh={loadModels}
          onEditPricing={openPricingModal}
        />
      )}

      {/* TAB CONTENT: SYSTEM CONFIG */}
      {activeTab === "settings" && (
        <SystemConfigTab
          orgFee={orgFee}
          feeInput={feeInput}
          onFeeInputChange={setFeeInput}
          loadingFee={loadingFee}
          updatingFee={updatingFee}
          onUpdateFee={handleUpdateFee}
        />
      )}

      {/* TAB CONTENT: PLATFORM LEDGER */}
      {activeTab === "ledger" && (
        <PlatformLedgerTab
          stats={stats}
          loading={loadingStats}
        />
      )}

      {/* ADJUST PRICING MODAL */}
      <AdjustPricingModal
        editingModel={editingModel}
        costInput={costInput}
        shareInput={shareInput}
        onCostInputChange={setCostInput}
        onShareInputChange={setShareInput}
        onClose={() => setEditingModel(null)}
        updatingPricing={updatingPricing}
        onUpdatePricing={handleUpdatePricing}
      />
    </div>
  );
}
