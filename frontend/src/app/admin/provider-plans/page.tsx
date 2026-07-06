"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Layers3,
  ShieldCheck,
  BadgeInfo,
  Sparkles,
  Crown,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Check,
  X,
  Shield,
  Coins,
  ArrowRight,
  Sliders,
  Settings,
  Info,
  Loader2
} from "lucide-react";
import { toast } from "react-hot-toast";
import { AdminPageHeader } from "@/components/admin/common/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/common/AdminStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  AdminProviderTier,
  AdminProviderTierPayload,
  createAdminProviderPlan,
  deleteAdminProviderPlan,
  listAdminProviderPlans,
  updateAdminProviderPlan,
} from "@/lib/services/admin-provider-plans.service";

type TierFormState = Record<keyof AdminProviderTierPayload, string | boolean>;

const EMPTY_FORM: TierFormState = {
  code: "",
  displayName: "",
  description: "",
  monthlyPriceEgp: "0",
  annualPriceEgp: "",
  platformCommissionPercent: "20",
  providerSharePercent: "80",
  maxModels: "",
  maxPublicModels: "",
  maxVersionsPerModel: "",
  maxLLMModels: "",
  maxVisionModels: "",
  maxNLPModels: "",
  maxTabularModels: "",
  maxDiffusionModels: "",
  maxAudioModels: "",
  maxEmbeddingModels: "",
  allowPrivateModels: false,
  allowCustomPricing: false,
  allowPriorityReview: false,
  allowOrgPublishing: false,
  allowDedicatedSupport: false,
  allowFeaturedPlacement: false,
  allowAdvancedAnalytics: false,
  isActive: true,
  sortOrder: "0",
};

const LIMIT_FIELDS: Array<{ name: keyof AdminProviderTierPayload; label: string; placeholder: string }> = [
  { name: "maxModels", label: "Max Total Models", placeholder: "Unlimited" },
  { name: "maxPublicModels", label: "Max Public Models", placeholder: "Unlimited" },
  { name: "maxVersionsPerModel", label: "Max Versions / Model", placeholder: "Unlimited" },
  { name: "maxLLMModels", label: "Max LLM Models", placeholder: "Unlimited" },
  { name: "maxVisionModels", label: "Max Vision Models", placeholder: "Unlimited" },
  { name: "maxNLPModels", label: "Max NLP Models", placeholder: "Unlimited" },
  { name: "maxTabularModels", label: "Max Tabular Models", placeholder: "Unlimited" },
  { name: "maxDiffusionModels", label: "Max Diffusion Models", placeholder: "Unlimited" },
  { name: "maxAudioModels", label: "Max Audio Models", placeholder: "Unlimited" },
  { name: "maxEmbeddingModels", label: "Max Embedding Models", placeholder: "Unlimited" },
];

const FEATURE_FIELDS: Array<{ name: keyof AdminProviderTierPayload; label: string; description: string }> = [
  { name: "allowPrivateModels", label: "Allow Private Models", description: "Allow hosting proprietary or private models." },
  { name: "allowCustomPricing", label: "Allow Custom Pricing", description: "Let providers override default platform token coefficients." },
  { name: "allowPriorityReview", label: "Allow Priority Review", description: "Expedite listing checks for models published under this tier." },
  { name: "allowOrgPublishing", label: "Allow Org Publishing", description: "Publish model artifacts under organization workspaces." },
  { name: "allowDedicatedSupport", label: "Dedicated Support Dues", description: "Direct communication channels to platform operations." },
  { name: "allowFeaturedPlacement", label: "Allow Featured Placement", description: "Feature model artifacts on the marketplace explorer page." },
  { name: "allowAdvancedAnalytics", label: "Allow Advanced Analytics", description: "Detailed charts, EWMA baselines, and loki aggregated logs." },
  { name: "isActive", label: "Tier Status is Active", description: "Enable this subscription tier for marketplace enrollment." },
];

function toNumber(value: string | boolean): number {
  return typeof value === "string" ? Number(value) || 0 : 0;
}

function nullableNumber(value: string | boolean): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return Number(value);
}

function formatLimit(value: number | string | null): string {
  if (value === null || value === "") return "Unlimited";
  return typeof value === "number" ? value.toLocaleString() : value;
}

function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0 EGP";
  const numeric = typeof value === "string" ? Number(value) || 0 : value;
  return `${numeric.toLocaleString()} EGP`;
}

function tierToForm(tier: AdminProviderTier): TierFormState {
  return {
    code: tier.code,
    displayName: tier.displayName,
    description: tier.description ?? "",
    monthlyPriceEgp: String(tier.monthlyPriceEgp ?? 0),
    annualPriceEgp: tier.annualPriceEgp === null ? "" : String(tier.annualPriceEgp),
    platformCommissionPercent: String(tier.platformCommissionPercent),
    providerSharePercent: String(tier.providerSharePercent),
    maxModels: tier.maxModels === null ? "" : String(tier.maxModels),
    maxPublicModels: tier.maxPublicModels === null ? "" : String(tier.maxPublicModels),
    maxVersionsPerModel: tier.maxVersionsPerModel === null ? "" : String(tier.maxVersionsPerModel),
    maxLLMModels: tier.maxLLMModels === null ? "" : String(tier.maxLLMModels),
    maxVisionModels: tier.maxVisionModels === null ? "" : String(tier.maxVisionModels),
    maxNLPModels: tier.maxNLPModels === null ? "" : String(tier.maxNLPModels),
    maxTabularModels: tier.maxTabularModels === null ? "" : String(tier.maxTabularModels),
    maxDiffusionModels: tier.maxDiffusionModels === null ? "" : String(tier.maxDiffusionModels),
    maxAudioModels: tier.maxAudioModels === null ? "" : String(tier.maxAudioModels),
    maxEmbeddingModels: tier.maxEmbeddingModels === null ? "" : String(tier.maxEmbeddingModels),
    allowPrivateModels: tier.allowPrivateModels,
    allowCustomPricing: tier.allowCustomPricing,
    allowPriorityReview: tier.allowPriorityReview,
    allowOrgPublishing: tier.allowOrgPublishing,
    allowDedicatedSupport: tier.allowDedicatedSupport,
    allowFeaturedPlacement: tier.allowFeaturedPlacement,
    allowAdvancedAnalytics: tier.allowAdvancedAnalytics,
    isActive: tier.isActive,
    sortOrder: String(tier.sortOrder),
  };
}

function formToPayload(form: TierFormState): AdminProviderTierPayload {
  return {
    code: String(form.code).trim().toUpperCase(),
    displayName: String(form.displayName).trim(),
    description: String(form.description).trim() || null,
    monthlyPriceEgp: toNumber(form.monthlyPriceEgp),
    annualPriceEgp: nullableNumber(form.annualPriceEgp),
    platformCommissionPercent: toNumber(form.platformCommissionPercent),
    providerSharePercent: toNumber(form.providerSharePercent),
    maxModels: nullableNumber(form.maxModels),
    maxPublicModels: nullableNumber(form.maxPublicModels),
    maxVersionsPerModel: nullableNumber(form.maxVersionsPerModel),
    maxLLMModels: nullableNumber(form.maxLLMModels),
    maxVisionModels: nullableNumber(form.maxVisionModels),
    maxNLPModels: nullableNumber(form.maxNLPModels),
    maxTabularModels: nullableNumber(form.maxTabularModels),
    maxDiffusionModels: nullableNumber(form.maxDiffusionModels),
    maxAudioModels: nullableNumber(form.maxAudioModels),
    maxEmbeddingModels: nullableNumber(form.maxEmbeddingModels),
    allowPrivateModels: Boolean(form.allowPrivateModels),
    allowCustomPricing: Boolean(form.allowCustomPricing),
    allowPriorityReview: Boolean(form.allowPriorityReview),
    allowOrgPublishing: Boolean(form.allowOrgPublishing),
    allowDedicatedSupport: Boolean(form.allowDedicatedSupport),
    allowFeaturedPlacement: Boolean(form.allowFeaturedPlacement),
    allowAdvancedAnalytics: Boolean(form.allowAdvancedAnalytics),
    isActive: Boolean(form.isActive),
    sortOrder: toNumber(form.sortOrder),
  };
}

export default function AdminProviderPlansPage() {
  const [tiers, setTiers] = useState<AdminProviderTier[]>([]);
  const [form, setForm] = useState<TierFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal dialog view states
  const [showFormModal, setShowFormModal] = useState(false);
  const [formTab, setFormTab] = useState<"general" | "limits" | "features">("general");

  // Confirm delete dialog states
  const [deleteTarget, setDeleteTarget] = useState<AdminProviderTier | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const loadTiers = useCallback(async () => {
    try {
      const nextTiers = await listAdminProviderPlans();
      setTiers(nextTiers.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load provider plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTiers();
  }, [loadTiers]);

  const handleCreateNewClick = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormTab("general");
    setShowFormModal(true);
  };

  const handleEditClick = (tier: AdminProviderTier) => {
    setForm(tierToForm(tier));
    setEditingId(tier.id);
    setFormTab("general");
    setShowFormModal(true);
  };

  const updateField = (name: keyof AdminProviderTierPayload, value: string | boolean) => {
    setForm((current) => {
      const next = { ...current, [name]: value };
      // Keep split adding up to 100% automatically if provider share is updated
      if (name === "providerSharePercent") {
        const valNum = Number(value) || 0;
        next.platformCommissionPercent = String(Math.max(0, 100 - valNum));
      } else if (name === "platformCommissionPercent") {
        const valNum = Number(value) || 0;
        next.providerSharePercent = String(Math.max(0, 100 - valNum));
      }
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = formToPayload(form);
    if (payload.platformCommissionPercent + payload.providerSharePercent !== 100) {
      toast.error("Platform commission and provider share must add up to 100%.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateAdminProviderPlan(editingId, payload);
        toast.success("Provider plan updated.");
      } else {
        await createAdminProviderPlan(payload);
        toast.success("Provider plan created.");
      }
      await loadTiers();
      setShowFormModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save provider plan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tier: AdminProviderTier) => {
    try {
      const result = await deleteAdminProviderPlan(tier.id);
      toast.success(result.deleted ? "Provider plan deleted." : "Provider plan deactivated.");
      await loadTiers();
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete provider plan");
    }
  };

  const activeCount = tiers.filter((t) => t.isActive).length;
  const paidCount = tiers.filter((t) => Number(t.monthlyPriceEgp) > 0).length;

  return (
    <div className="space-y-6  animate-fade-in pb-12 font-sans text-left">
      {/* Decorative background glows */}
      <div className="glow-spot" />
      <div className="glow-spot-secondary" />

      {/* Header and Sync controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-5 gap-4 relative z-10">
        <div className="text-left space-y-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary animate-pulse" />
            Provider Subscription Studio
          </h1>
          <p className="text-xs text-muted-foreground">
            Configure developer pricing tiers, platform revenue cuts, model publishing caps, and feature unlocks.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setLoading(true);
              loadTiers().then(() => toast.success("Synced tiers."));
            }}
            disabled={loading}
            className="btn-outline h-9 px-4 font-bold text-[10px] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Registry</span>
          </button>
          <Button
            onClick={handleCreateNewClick}
            className="btn-primary h-9 px-4 font-bold text-[10px] flex items-center gap-1.5 cursor-pointer hover-lift shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Custom Plan</span>
          </Button>
        </div>
      </div>

      {/* Statistics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
        <div className="border border-border/80 bg-card/65 rounded-2xl p-4 shadow-xs backdrop-blur-md hover-lift transition-all duration-300">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Registered Plans</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-foreground">{tiers.length}</span>
            <span className="text-[9px] text-muted-foreground">Available tiers</span>
          </div>
        </div>
        <div className="border border-border/80 bg-card/65 rounded-2xl p-4 shadow-xs backdrop-blur-md hover-lift transition-all duration-300">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Active Tiers</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-emerald-500">{activeCount}</span>
            <span className="text-[9px] text-muted-foreground">Accepting signups</span>
          </div>
        </div>
        <div className="border border-border/80 bg-card/65 rounded-2xl p-4 shadow-xs backdrop-blur-md hover-lift transition-all duration-300">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Commercial Paid</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-indigo-500">{paidCount}</span>
            <span className="text-[9px] text-muted-foreground">Premium price tiers</span>
          </div>
        </div>
        <div className="border border-border/80 bg-card/65 rounded-2xl p-4 shadow-xs backdrop-blur-md hover-lift transition-all duration-300">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Revenue Commission</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-primary">Avg 15%</span>
            <span className="text-[9px] text-muted-foreground">Default platform split</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Grid of Plans */}
      <div className="relative z-10">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center bg-card/60 border border-border rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <span className="text-xs text-muted-foreground">Retrieving platform tier matrix...</span>
          </div>
        ) : tiers.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-card/30">
            <Crown className="w-10 h-10 mx-auto text-muted-foreground/35 mb-2.5" />
            <p className="text-sm font-bold text-foreground">No Pricing Tiers Defined</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-normal">
              No developer tiers are setup yet. Click &quot;Create Custom Plan&quot; to build the first listing.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tiers.map((tier) => {
              const isPaid = Number(tier.monthlyPriceEgp) > 0;
              return (
                <div
                  key={tier.id}
                  className={`border rounded-2xl bg-card/65 backdrop-blur-md overflow-hidden flex flex-col hover-lift transition-all duration-300 relative shadow-sm text-left ${
                    tier.isActive ? "border-border/80" : "border-red-500/20 opacity-75"
                  }`}
                >
                  {/* Decorative indicator lines */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-[3px] ${
                      !tier.isActive
                        ? "bg-red-500/40"
                        : isPaid
                        ? "bg-gradient-to-r from-primary to-indigo-500"
                        : "bg-emerald-500"
                    }`}
                  />

                  {/* Plan core body */}
                  <div className="p-5 flex-1 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="text-left space-y-0.5">
                        <span className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase">
                          PLAN: {tier.code}
                        </span>
                        <h3 className="text-base font-bold text-foreground">{tier.displayName}</h3>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {!tier.isActive && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                            INACTIVE
                          </span>
                        )}
                        {tier.isActive && isPaid && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary/10 text-primary border border-primary/20">
                            PREMIUM
                          </span>
                        )}
                        {tier.isActive && !isPaid && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            FREE TIER
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground line-clamp-2 h-7 font-sans leading-relaxed text-left">
                      {tier.description || "No description provided for this tier listing."}
                    </p>

                    {/* Price banner */}
                    <div className="p-3 bg-secondary/25 border border-border/60 rounded-xl flex items-baseline justify-between">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Price Rate</span>
                      <div className="text-right">
                        <span className="text-lg font-extrabold text-foreground">{formatMoney(tier.monthlyPriceEgp)}</span>
                        <span className="text-[8px] text-muted-foreground block">monthly subscription</span>
                      </div>
                    </div>

                    {/* Revenue share */}
                    <div className="flex items-center justify-between text-[10px] font-semibold border-b border-border/40 pb-2.5">
                      <span className="text-muted-foreground">Revenue Split</span>
                      <span className="text-foreground">
                        {tier.providerSharePercent}% Dev / {tier.platformCommissionPercent}% Platform
                      </span>
                    </div>

                    {/* Key limits preview */}
                    <div className="space-y-1.5 pt-1 text-[10px]">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Max Total Models:</span>
                        <span className="font-bold text-foreground">{formatLimit(tier.maxModels)}</span>
                      </div>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Max Public Models:</span>
                        <span className="font-bold text-foreground">{formatLimit(tier.maxPublicModels)}</span>
                      </div>
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>LLM/NLP Limits:</span>
                        <span className="font-bold text-foreground">
                          {formatLimit(tier.maxLLMModels)} LLM / {formatLimit(tier.maxNLPModels)} NLP
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="p-3 bg-muted/15 border-t border-border/80 flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground font-mono">Sort Order: {tier.sortOrder}</span>
                    <div className="flex gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(tier)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground border border-border/80 bg-card rounded-lg hover-lift cursor-pointer"
                        title="Configure plan specifications"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(tier)}
                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10 border border-red-500/20 bg-red-500/5 rounded-lg hover-lift cursor-pointer"
                        title="Purge subscription plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Plan Studio Overlay Modal Dialog */}
      {showFormModal && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in text-left">
          <div className="bg-card border border-border/80 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
              <div className="space-y-0.5 text-left">
                <span className="text-[9px] font-mono tracking-widest text-primary uppercase font-bold">
                  {editingId ? "Update Plan Parameters" : "Draft New Subscription"}
                </span>
                <h2 className="text-base font-bold text-foreground">
                  {editingId ? `Editing: ${form.displayName}` : "Create Custom Developer Tier"}
                </h2>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg border border-border bg-card cursor-pointer hover-lift"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content area: Sidebar visualizer preview + form tabs */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
              {/* Tab Selector Left/Top controls */}
              <div className="w-full md:w-48 bg-muted/10 border-r border-border/60 p-4 flex md:flex-col gap-1.5 shrink-0 overflow-x-auto md:overflow-x-visible">
                {[
                  { id: "general" as const, label: "Identity & Splits", icon: <Sliders className="w-3.5 h-3.5" /> },
                  { id: "limits" as const, label: "Resource Limits", icon: <Layers3 className="w-3.5 h-3.5" /> },
                  { id: "features" as const, label: "Feature Flags", icon: <Settings className="w-3.5 h-3.5" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFormTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold transition-all w-full shrink-0 cursor-pointer ${
                      formTab === tab.id
                        ? "bg-primary text-primary-foreground shadow-xs border border-primary/20"
                        : "text-muted-foreground hover:bg-secondary/40"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Form columns */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <form onSubmit={handleSubmit} id="tier-studio-form" className="space-y-6">
                  {/* Tab 1: Identity & Splits */}
                  {formTab === "general" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <label className="space-y-1.5 text-xs font-semibold block text-left">
                          Unique Code (eg. FREE, ENTERPRISE)
                          <input
                            value={String(form.code)}
                            onChange={(e) => updateField("code", e.target.value)}
                            required
                            disabled={!!editingId}
                            placeholder="PRO_X"
                            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs uppercase shadow-xs outline-hidden focus:border-primary transition-all disabled:opacity-50"
                          />
                        </label>
                        <label className="space-y-1.5 text-xs font-semibold block text-left">
                          Display Name
                          <input
                            value={String(form.displayName)}
                            onChange={(e) => updateField("displayName", e.target.value)}
                            required
                            placeholder="Professional Tier"
                            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs shadow-xs outline-hidden focus:border-primary transition-all"
                          />
                        </label>
                      </div>

                      <label className="space-y-1.5 text-xs font-semibold block text-left">
                        Description / Value Pitch
                        <textarea
                          value={String(form.description)}
                          onChange={(e) => updateField("description", e.target.value)}
                          rows={3}
                          placeholder="What capabilities are unlocked under this pricing tier?"
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs shadow-xs outline-hidden focus:border-primary transition-all resize-none"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <label className="space-y-1.5 text-xs font-semibold block text-left">
                          Monthly Price (EGP)
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-[9px]">EGP</span>
                            <input
                              type="number"
                              min="0"
                              value={String(form.monthlyPriceEgp)}
                              onChange={(e) => updateField("monthlyPriceEgp", e.target.value)}
                              className="h-10 w-full pl-11 rounded-xl border border-border bg-background px-3 text-xs shadow-xs outline-hidden focus:border-primary transition-all"
                            />
                          </div>
                        </label>
                        <label className="space-y-1.5 text-xs font-semibold block text-left">
                          Annual Price (EGP - Optional)
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-[9px]">EGP</span>
                            <input
                              type="number"
                              min="0"
                              value={String(form.annualPriceEgp)}
                              onChange={(e) => updateField("annualPriceEgp", e.target.value)}
                              placeholder="Leave blank if not available"
                              className="h-10 w-full pl-11 rounded-xl border border-border bg-background px-3 text-xs shadow-xs outline-hidden focus:border-primary transition-all"
                            />
                          </div>
                        </label>
                      </div>

                      <div className="border-t border-border/60 pt-4 space-y-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-foreground uppercase tracking-wider">
                          <Coins className="w-3.5 h-3.5 text-primary" />
                          <span>Revenue Share Schedule</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <label className="space-y-1.5 text-xs font-semibold block text-left">
                            Developer Share (%)
                            <div className="relative">
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={String(form.providerSharePercent)}
                                onChange={(e) => updateField("providerSharePercent", e.target.value)}
                                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs shadow-xs outline-hidden focus:border-primary transition-all pr-8"
                              />
                            </div>
                          </label>
                          <label className="space-y-1.5 text-xs font-semibold block text-left">
                            Platform Cut (%)
                            <div className="relative">
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={String(form.platformCommissionPercent)}
                                onChange={(e) => updateField("platformCommissionPercent", e.target.value)}
                                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs shadow-xs outline-hidden focus:border-primary transition-all pr-8"
                              />
                            </div>
                          </label>
                        </div>
                        <p className="text-[9px] text-muted-foreground font-sans text-left leading-normal">
                          Platform cut commission schedule dictates revenue deductions on provider earnings. Commission + share must equal 100%.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Resource Limits */}
                  {formTab === "limits" && (
                    <div className="space-y-4 text-left">
                      <div className="flex gap-2 p-3 bg-secondary/35 rounded-xl border border-border/80 text-muted-foreground leading-normal font-sans text-[10px] mb-2">
                        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p>
                          Define constraints on model artifact registry. Leave any fields completely blank to represent an <span className="font-bold text-foreground">Unlimited</span> threshold limit.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {LIMIT_FIELDS.map((field) => (
                          <label key={field.name} className="space-y-1.5 text-xs font-semibold block text-left">
                            {field.label}
                            <input
                              type="number"
                              min="0"
                              value={String(form[field.name])}
                              onChange={(e) => updateField(field.name, e.target.value)}
                              placeholder={field.placeholder}
                              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs shadow-xs outline-hidden focus:border-primary transition-all"
                            />
                          </label>
                        ))}
                        <label className="space-y-1.5 text-xs font-semibold block text-left">
                          Matrix Sort Order index
                          <input
                            type="number"
                            min="0"
                            value={String(form.sortOrder)}
                            onChange={(e) => updateField("sortOrder", e.target.value)}
                            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs shadow-xs outline-hidden focus:border-primary transition-all"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Feature Flags */}
                  {formTab === "features" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                        {FEATURE_FIELDS.map((field) => (
                          <label
                            key={field.name}
                            className="flex items-start justify-between rounded-2xl border border-border bg-secondary/20 p-4 text-xs font-semibold shadow-xs transition-all hover:border-primary/20 cursor-pointer select-none"
                          >
                            <div className="space-y-0.5 pr-2">
                              <span className="text-xs font-bold text-foreground block">{field.label}</span>
                              <span className="text-[9px] text-muted-foreground block font-medium leading-relaxed">
                                {field.description}
                              </span>
                            </div>
                            <input
                              type="checkbox"
                              checked={Boolean(form[field.name])}
                              onChange={(e) => updateField(field.name, e.target.checked)}
                              className="h-4.5 w-4.5 accent-primary shrink-0 mt-0.5 cursor-pointer"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Right Side: Interactive Mock Plan Preview (Stellar visual addition) */}
              <div className="w-full md:w-72 bg-muted/5 border-t md:border-t-0 md:border-l border-border/60 p-5 shrink-0 overflow-y-auto hidden md:block">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-4">
                  Live Plan Preview
                </span>
                {/* Mini card mimicking final design */}
                <div className="border border-border bg-background rounded-2xl shadow-sm overflow-hidden flex flex-col p-4 text-left space-y-3 scale-95 origin-top">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-mono tracking-widest text-muted-foreground uppercase">
                      PREVIEW: {String(form.code) || "DRAFT"}
                    </span>
                    <h4 className="text-sm font-bold text-foreground truncate">
                      {String(form.displayName) || "Untitled Plan"}
                    </h4>
                  </div>

                  <p className="text-[9px] text-muted-foreground line-clamp-2 h-7 font-sans leading-relaxed">
                    {String(form.description) || "No description drafted yet."}
                  </p>

                  <div className="p-2.5 bg-secondary/20 border border-border/60 rounded-xl flex items-baseline justify-between">
                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">Price</span>
                    <span className="text-sm font-extrabold text-foreground">
                      {formatMoney(form.monthlyPriceEgp as string)}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1 text-[9px]">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Total Models:</span>
                      <span className="font-bold text-foreground">{formatLimit(form.maxModels as string)}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Public Limit:</span>
                      <span className="font-bold text-foreground">{formatLimit(form.maxPublicModels as string)}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>Revenue Split:</span>
                      <span className="font-bold text-foreground">{form.providerSharePercent}% / {form.platformCommissionPercent}%</span>
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-2 flex flex-wrap gap-1">
                    {Boolean(form.allowPrivateModels) && (
                      <span className="px-1 py-0.5 rounded-sm text-[7px] font-bold bg-primary/10 text-primary">Private</span>
                    )}
                    {Boolean(form.allowCustomPricing) && (
                      <span className="px-1 py-0.5 rounded-sm text-[7px] font-bold bg-indigo-500/10 text-indigo-500">Pricing</span>
                    )}
                    {Boolean(form.allowPriorityReview) && (
                      <span className="px-1 py-0.5 rounded-sm text-[7px] font-bold bg-amber-500/10 text-amber-500">Priority</span>
                    )}
                    {Boolean(form.isActive) && (
                      <span className="px-1 py-0.5 rounded-sm text-[7px] font-bold bg-emerald-500/10 text-emerald-500">Active</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-border bg-muted/15 flex items-center justify-between shrink-0 font-sans">
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                <BadgeInfo className="w-3.5 h-3.5 text-primary" />
                <span>Validation splits applied</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFormModal(false)}
                  className="h-9 px-4 rounded-xl text-xs cursor-pointer btn-outline"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="tier-studio-form"
                  disabled={saving}
                  className="btn-primary h-9 px-4 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer hover-lift"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{editingId ? "Save Changes" : "Publish Plan"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation dialog targeting delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete provider plan"
        description={`Are you sure you want to delete or deactivate provider plan "${deleteTarget?.displayName}"? Assigned plans will be deactivated instead of removed.`}
        confirmLabel="Confirm Delete"
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
      />
    </div>
  );
}
