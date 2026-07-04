"use client";

import React from "react";
import { ArrowRight, BadgeInfo, Crown, Layers3, Pencil, Plus, RefreshCw, Save, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { AdminPageHeader } from "@/components/admin/common/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/common/AdminStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

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

const LIMIT_FIELDS: Array<{ name: keyof AdminProviderTierPayload; label: string }> = [
  { name: "maxModels", label: "Total models" },
  { name: "maxPublicModels", label: "Public models" },
  { name: "maxVersionsPerModel", label: "Versions / model" },
  { name: "maxLLMModels", label: "LLM models" },
  { name: "maxVisionModels", label: "Vision models" },
  { name: "maxNLPModels", label: "NLP models" },
  { name: "maxTabularModels", label: "Tabular models" },
  { name: "maxDiffusionModels", label: "Diffusion models" },
  { name: "maxAudioModels", label: "Audio models" },
  { name: "maxEmbeddingModels", label: "Embedding models" },
];

const FEATURE_FIELDS: Array<{ name: keyof AdminProviderTierPayload; label: string }> = [
  { name: "allowPrivateModels", label: "Private models" },
  { name: "allowCustomPricing", label: "Custom pricing" },
  { name: "allowPriorityReview", label: "Priority review" },
  { name: "allowOrgPublishing", label: "Org publishing" },
  { name: "allowDedicatedSupport", label: "Dedicated support" },
  { name: "allowFeaturedPlacement", label: "Featured placement" },
  { name: "allowAdvancedAnalytics", label: "Advanced analytics" },
  { name: "isActive", label: "Plan is active" },
];

function toNumber(value: string | boolean): number {
  return typeof value === "string" ? Number(value) || 0 : 0;
}

function nullableNumber(value: string | boolean): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return Number(value);
}

function formatLimit(value: number | null): string {
  return value === null ? "Unlimited" : value.toLocaleString();
}

function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0 EGP";
  const numeric = typeof value === "string" ? Number(value) || 0 : value;
  return `${numeric.toLocaleString()} EGP`;
}

function formatSplitLabel(tier: AdminProviderTier): string {
  return `${tier.providerSharePercent}% provider / ${tier.platformCommissionPercent}% platform`;
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

/**
 * Admin page for managing provider subscription plan definitions.
 */
export default function AdminProviderPlansPage() {
  const [tiers, setTiers] = React.useState<AdminProviderTier[]>([]);
  const [form, setForm] = React.useState<TierFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const loadTiers = React.useCallback(async () => {
    const nextTiers = await listAdminProviderPlans();
    setTiers(nextTiers);
  }, []);

  React.useEffect(() => {
    let active = true;

    Promise.resolve()
      .then(() => loadTiers())
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load provider plans";
        toast.error(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadTiers]);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const updateField = (name: keyof AdminProviderTierPayload, value: string | boolean) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save provider plan";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = React.useState<AdminProviderTier | null>(null);

  const handleDelete = async (tier: AdminProviderTier) => {
    try {
      const result = await deleteAdminProviderPlan(tier.id);
      toast.success(result.deleted ? "Provider plan deleted." : "Provider plan deactivated.");
      await loadTiers();
      if (editingId === tier.id) resetForm();
      setDeleteTarget(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete provider plan";
      toast.error(message);
    }
  };

  const activeCount = tiers.filter((tier) => tier.isActive).length;
  const paidCount = tiers.filter((tier) => toNumber(String(tier.monthlyPriceEgp)) > 0).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Provider Plans"
        description="Create, price, activate, and limit provider subscription tiers used by marketplace billing and provider publishing rules."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="bg-linear-to-r from-primary/10 via-transparent to-emerald-500/10 px-6 py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Provider Plan Studio
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    Design tiers, pricing, and publishing rules from one place.
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    This console controls what providers can sell, how much they keep, and which limits apply to each subscription tier.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-sm">
                    <Layers3 className="h-3.5 w-3.5 text-primary" />
                    {tiers.length} plans
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-sm">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    {activeCount} active
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-sm">
                    <BadgeInfo className="h-3.5 w-3.5 text-amber-500" />
                    Revenue split must equal 100%
                  </div>
                </div>
              </div>

              <div className="grid min-w-[280px] gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm backdrop-blur-xs">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Plans</p>
                  <p className="mt-2 text-3xl font-black text-foreground">{tiers.length}</p>
                </div>
                <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm backdrop-blur-xs">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Active</p>
                  <p className="mt-2 text-3xl font-black text-foreground">{activeCount}</p>
                </div>
                <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm backdrop-blur-xs">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Paid</p>
                  <p className="mt-2 text-3xl font-black text-foreground">{paidCount}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-border bg-card shadow-sm">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <div className="rounded-2xl border border-primary/15 bg-primary/10 p-2 text-primary">
                <Crown className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Plan governance</p>
                <p className="text-xs text-muted-foreground">Keep the catalog clean and predictable.</p>
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-border bg-secondary/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Revenue split rule</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">Platform commission and provider share should always add to 100%.</p>
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
              </div>
              <div className="h-px bg-border/60" />
              <p className="text-xs leading-6 text-muted-foreground">
                Use the editor to keep pricing, limits, and feature entitlements aligned before promoting a plan to providers.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-border bg-background p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Best practice</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Edit a plan by selecting it from the table.</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Pricing</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Use monthly and annual pricing to guide upgrades.</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Limits</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Unlimited means blank, not zero.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_390px]">
        <Card className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <CardHeader className="flex flex-col gap-4 border-b border-border/70 bg-secondary/20 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Crown className="h-4 w-4 text-primary" />
                Provider Plan Catalog
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Select any row to edit its pricing, access rules, or publishing limits.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                loadTiers()
                  .catch((err) => {
                    const message = err instanceof Error ? err.message : "Failed to refresh provider plans";
                    toast.error(message);
                  })
                  .finally(() => setLoading(false));
              }}
              className="h-9 gap-1.5 rounded-xl border-border/80 text-xs shadow-sm"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/70 bg-muted/30">
                  <TableHead className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Plan</TableHead>
                  <TableHead className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Price</TableHead>
                  <TableHead className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Revenue Split</TableHead>
                  <TableHead className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Limits</TableHead>
                  <TableHead className="px-5 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Status</TableHead>
                  <TableHead className="px-5 py-4 text-right text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [0, 1, 2].map((item) => (
                    <TableRow key={item} className="border-border/40">
                      <TableCell className="px-5 py-5"><div className="h-4 w-32 animate-pulse rounded bg-muted" /></TableCell>
                      <TableCell className="px-5 py-5"><div className="h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                      <TableCell className="px-5 py-5"><div className="h-4 w-28 animate-pulse rounded bg-muted" /></TableCell>
                      <TableCell className="px-5 py-5"><div className="h-4 w-24 animate-pulse rounded bg-muted" /></TableCell>
                      <TableCell className="px-5 py-5"><div className="h-4 w-16 animate-pulse rounded bg-muted" /></TableCell>
                      <TableCell className="px-5 py-5"><div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                    </TableRow>
                  ))
                ) : tiers.length > 0 ? (
                  tiers.map((tier) => (
                    <TableRow key={tier.id} className="border-border/40 transition-colors hover:bg-secondary/30">
                      <TableCell className="px-5 py-5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(tier.id);
                            setForm(tierToForm(tier));
                          }}
                          className="group text-left"
                        >
                          <span className="block font-semibold text-foreground transition-colors group-hover:text-primary">
                            {tier.displayName}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground">{tier.code}</span>
                        </button>
                      </TableCell>
                      <TableCell className="px-5 py-5">
                        <div className="space-y-1">
                          <p className="font-mono text-sm font-semibold text-foreground">{formatMoney(tier.monthlyPriceEgp)} / month</p>
                          <p className="text-xs text-muted-foreground">
                            Annual: {tier.annualPriceEgp !== null ? formatMoney(tier.annualPriceEgp) : "Custom"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-5 text-xs">
                        <div className="space-y-1.5">
                          <p className="font-semibold text-foreground">{formatSplitLabel(tier)}</p>
                          <p className="text-muted-foreground">
                            Sort order {tier.sortOrder.toLocaleString("en-US")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-5 text-xs text-muted-foreground">
                        <div className="space-y-1.5">
                          <p>
                            {formatLimit(tier.maxPublicModels)} public / {formatLimit(tier.maxModels)} total
                          </p>
                          <p>
                            {formatLimit(tier.maxVersionsPerModel)} versions per model
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-5">
                        <AdminStatusBadge value={tier.isActive ? "ACTIVE" : "SUSPENDED"} />
                      </TableCell>
                      <TableCell className="px-5 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingId(tier.id);
                              setForm(tierToForm(tier));
                            }}
                            className="h-9 gap-1.5 rounded-xl border-border/80 text-xs shadow-sm"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteTarget(tier)}
                            className="h-9 gap-1.5 rounded-xl border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="px-5 py-14 text-center">
                      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                        <div className="rounded-full border border-primary/15 bg-primary/10 p-3 text-primary">
                          <Crown className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">No provider plans configured yet.</p>
                          <p className="text-sm text-muted-foreground">
                            Create the first plan to define provider pricing, revenue split, and publishing limits.
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="sticky top-6 h-fit overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border/70 bg-secondary/20 p-5">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              {editingId ? <Pencil className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
              {editingId ? "Edit Provider Plan" : "Create Provider Plan"}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {editingId ? "Update the selected plan and keep the split consistent." : "Add a new plan with pricing, limits, and capability flags."}
            </p>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-180px)] overflow-y-auto p-5">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 text-xs font-semibold">
                  Code
                  <input
                    value={String(form.code)}
                    onChange={(event) => updateField("code", event.target.value)}
                    required
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs uppercase shadow-sm outline-none transition-colors focus:border-primary"
                  />
                </label>
                <label className="space-y-1.5 text-xs font-semibold">
                  Sort order
                  <input
                    type="number"
                    value={String(form.sortOrder)}
                    onChange={(event) => updateField("sortOrder", event.target.value)}
                    required
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs shadow-sm outline-none transition-colors focus:border-primary"
                  />
                </label>
              </div>

              <label className="space-y-1.5 text-xs font-semibold">
                Display name
                <input
                  value={String(form.displayName)}
                  onChange={(event) => updateField("displayName", event.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs shadow-sm outline-none transition-colors focus:border-primary"
                />
              </label>

              <label className="space-y-1.5 text-xs font-semibold">
                Description
                <textarea
                  value={String(form.description)}
                  onChange={(event) => updateField("description", event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs shadow-sm outline-none transition-colors focus:border-primary"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 text-xs font-semibold">
                  Monthly EGP
                  <input
                    type="number"
                    min={0}
                    value={String(form.monthlyPriceEgp)}
                    onChange={(event) => updateField("monthlyPriceEgp", event.target.value)}
                    required
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs shadow-sm outline-none transition-colors focus:border-primary"
                  />
                </label>
                <label className="space-y-1.5 text-xs font-semibold">
                  Annual EGP
                  <input
                    type="number"
                    min={0}
                    value={String(form.annualPriceEgp)}
                    onChange={(event) => updateField("annualPriceEgp", event.target.value)}
                    placeholder="Optional"
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs shadow-sm outline-none transition-colors focus:border-primary"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 text-xs font-semibold">
                  Platform %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={String(form.platformCommissionPercent)}
                    onChange={(event) => updateField("platformCommissionPercent", event.target.value)}
                    required
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs shadow-sm outline-none transition-colors focus:border-primary"
                  />
                </label>
                <label className="space-y-1.5 text-xs font-semibold">
                  Provider %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={String(form.providerSharePercent)}
                    onChange={(event) => updateField("providerSharePercent", event.target.value)}
                    required
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs shadow-sm outline-none transition-colors focus:border-primary"
                  />
                </label>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Limits</p>
                <div className="grid grid-cols-2 gap-3">
                  {LIMIT_FIELDS.map((field) => (
                    <label key={field.name} className="space-y-1.5 text-xs font-semibold">
                      {field.label}
                      <input
                        type="number"
                        min={0}
                        value={String(form[field.name])}
                        onChange={(event) => updateField(field.name, event.target.value)}
                        placeholder="Unlimited"
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs shadow-sm outline-none transition-colors focus:border-primary"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Capabilities</p>
                <div className="grid grid-cols-1 gap-2">
                  {FEATURE_FIELDS.map((field) => (
                    <label
                      key={field.name}
                      className="flex items-center justify-between rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-xs font-semibold shadow-sm transition-colors hover:border-primary/20"
                    >
                      {field.label}
                      <input
                        type="checkbox"
                        checked={Boolean(form[field.name])}
                        onChange={(event) => updateField(field.name, event.target.checked)}
                        className="h-4 w-4 accent-primary"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/20 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Current draft</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {String(form.displayName).trim() || "Untitled plan"} · {formatMoney(form.monthlyPriceEgp)} / month
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {String(form.providerSharePercent)}% provider share / {String(form.platformCommissionPercent)}% platform cut
                </p>
              </div>

              <div className="flex gap-2 border-t border-border pt-4">
                <Button type="submit" disabled={saving} className="h-10 flex-1 gap-1.5 rounded-xl text-xs shadow-sm">
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Plan"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="h-10 rounded-xl text-xs shadow-sm">
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete provider plan"
        description={`Delete or deactivate provider plan "${deleteTarget?.displayName}"? Assigned plans will be deactivated instead of removed.`}
        confirmLabel="Delete plan"
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
      />
    </div>
  );
}
