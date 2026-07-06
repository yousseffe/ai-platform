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
      <div className="flex items-center justify-center min-h-[60vh] text-foreground font-sans">
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
    <div className="w-full space-y-6 text-foreground font-sans text-xs animate-fade-in relative min-h-screen pb-12">
      {/* Decorative background glows */}
      <div className="glow-spot" />
      <div className="glow-spot-secondary" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 pb-5 relative z-10">
        <div className="text-left">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2 font-sans">
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
          className="btn-outline h-9 px-4 font-bold text-[10px] cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingModels ? "animate-spin" : ""}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Telemetry Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
        {/* Active Engines */}
        <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300 relative overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-between h-28 text-left">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Inference Engines
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 dark:bg-blue-500/5 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-extrabold text-foreground tracking-tight">{activeContainers}</span>
              <span className="text-[10px] text-muted-foreground">/ {totalContainers} Running</span>
            </div>
          </CardContent>
        </Card>

        {/* Avg CPU */}
        <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300 relative overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-between h-28 text-left">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Avg CPU Utilization
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 dark:bg-purple-500/5 shrink-0">
                <Cpu className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline mt-2">
              <span className="text-2xl font-extrabold text-foreground tracking-tight">{avgCpu}</span>
              <span className="text-[10px] text-muted-foreground">Across active hosts</span>
            </div>
          </CardContent>
        </Card>

        {/* RAM Footprint */}
        <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300 relative overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-between h-28 text-left">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Allocated Memory
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 dark:bg-amber-500/5 shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline mt-2">
              <span className="text-2xl font-extrabold text-foreground tracking-tight">{totalRam} MB</span>
              <span className="text-[10px] text-muted-foreground">Virtual allocation</span>
            </div>
          </CardContent>
        </Card>

        {/* Gateway Host Port */}
        <Card className="border border-primary/25 bg-primary/5 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300 relative overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-between h-28 text-left">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                Docker API Gateway
              </span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Network className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-sm font-bold text-primary">PORT RANGE 4000+</span>
              <span className="text-[9px] text-muted-foreground">Load-balanced ingress</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative z-10">
        <ActiveDeploymentsTab
          models={models}
          loading={loadingModels}
          onRefresh={() => loadModels(true)}
          onEditPricing={openPricingModal}
        />
      </div>

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
