"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, Cpu, HardDrive, Network, Layers, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import { useWorkspace } from "@/hooks/use-workspace";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";

import { AdminModel } from "@/types";
import ActiveDeploymentsTab from "@/components/admin/ActiveDeploymentsTab";
import AdjustPricingModal from "@/components/admin/AdjustPricingModal";

/**
 * Admin Active Deployments page.
 * Displays active inference container metrics, ports, and telemetry dashboards
 * and exposes model pricing adjustment overrides.
 *
 * @returns The React page component for active deployments management.
 */
export default function AdminDeploymentsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isAdmin, isLoading: isWorkspaceLoading, fetchWorkspaceDetails } = useWorkspace();

  // Core data states
  const [models, setModels] = useState<AdminModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Pricing Modal states
  const [editingModel, setEditingModel] = useState<AdminModel | null>(null);
  const [costInput, setCostInput] = useState("");
  const [shareInput, setShareInput] = useState("");
  const [updatingPricing, setUpdatingPricing] = useState(false);

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

  const loadModels = async (showToast = false) => {
    setLoadingModels(true);
    try {
      const data = await smartFetch<AdminModel[]>("/admin/models");
      setModels(data || []);
      if (showToast) {
        toast.success("Docker telemetry status updated!");
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to load active model deployments");
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadModels(false);
    }
  }, [isAdmin]);

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

  // Calculate live container metrics analysis
  const totalContainers = models.length;
  const activeContainers = models.filter((m) => m.status === "ACTIVE").length;
  
  // Calculate average CPU utilization
  const activeCpuValues = models
    .filter((m) => m.status === "ACTIVE")
    .map((m) => parseFloat(m.cpu) || 0);
  const avgCpu = activeCpuValues.length > 0 
    ? (activeCpuValues.reduce((a, b) => a + b, 0) / activeCpuValues.length).toFixed(1) + "%"
    : "0.0%";

  // Calculate total memory footprint
  const totalRam = models
    .map((m) => parseInt(m.ram) || 0)
    .reduce((sum, val) => sum + val, 0);

  return (
    <div className="w-full space-y-6 text-foreground font-mono text-xs animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="text-left">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2 font-mono">
            <Shield className="w-5 h-5 text-primary" />
            Inference Container Metrics
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            Managing active inference containers, Docker telemetry statistics, and model resource utilization details.
          </p>
        </div>
        <button
          onClick={() => loadModels(true)}
          disabled={loadingModels}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50 text-foreground font-bold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingModels ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Telemetry Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Active Engines */}
        <Card className="border border-border bg-card p-0 shadow-xs relative overflow-hidden group hover:border-primary/20 transition-all">
          <CardContent className="p-4">
            <div className="absolute right-3 top-3 text-muted-foreground/15">
              <Layers className="w-8 h-8" />
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Inference Engines</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground">{activeContainers}</span>
              <span className="text-[10px] text-muted-foreground">/ {totalContainers} Running</span>
            </div>
          </CardContent>
        </Card>

        {/* Avg CPU */}
        <Card className="border border-border bg-card p-0 shadow-xs relative overflow-hidden group hover:border-primary/20 transition-all">
          <CardContent className="p-4">
            <div className="absolute right-3 top-3 text-muted-foreground/15">
              <Cpu className="w-8 h-8" />
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Avg CPU Utilization</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground">{avgCpu}</span>
              <span className="text-[10px] text-muted-foreground">Across active hosts</span>
            </div>
          </CardContent>
        </Card>

        {/* RAM Footprint */}
        <Card className="border border-border bg-card p-0 shadow-xs relative overflow-hidden group hover:border-primary/20 transition-all">
          <CardContent className="p-4">
            <div className="absolute right-3 top-3 text-muted-foreground/15">
              <HardDrive className="w-8 h-8" />
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Allocated Memory</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-foreground">{totalRam} MB</span>
              <span className="text-[10px] text-muted-foreground">Virtual allocation</span>
            </div>
          </CardContent>
        </Card>

        {/* Gateway Host Port */}
        <Card className="border border-primary/20 bg-primary/[0.02] p-0 shadow-xs relative overflow-hidden group hover:border-primary/30 transition-all">
          <CardContent className="p-4">
            <div className="absolute right-3 top-3 text-primary/20">
              <Network className="w-8 h-8" />
            </div>
            <p className="text-[9px] font-bold text-primary uppercase tracking-wider mb-1">Docker API Gateway</p>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-primary">PORT RANGE 4000+</span>
              <span className="text-[9px] text-muted-foreground">Load-balanced ingress</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <ActiveDeploymentsTab
        models={models}
        loading={loadingModels}
        onRefresh={() => loadModels(true)}
        onEditPricing={openPricingModal}
      />

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
