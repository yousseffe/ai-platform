"use client";

import React, { useState, useEffect } from "react";
import {
  Loader2, Sparkles, Save, ShieldAlert, Coins, Percent,
  Building2, Sliders, Info, Zap, BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";

/** Shape returned by GET /admin/config/pricing-defaults */
interface PricingDefaults {
  price_tabular: number;
  price_nlp: number;
  price_vision: number;
  price_diffusion: number;
  /** Credits charged per 1 million input (prompt) tokens for LLM_GGUF models */
  price_llm_gguf_input: number;
  /** Credits charged per 1 million output (completion) tokens for LLM_GGUF models */
  price_llm_gguf_output: number;
  default_provider_share_percent: number;
  playground_trial_limit: number;
  credits_per_egp: number;
  /** Platform commission % for free-tier providers */
  commission_tier_free: number;
  /** Platform commission % for professional-tier providers */
  commission_tier_professional: number;
  /** Platform commission % for enterprise-tier providers */
  commission_tier_enterprise: number;
}

const DEFAULT_PRICING: PricingDefaults = {
  price_tabular: 0.00005,
  price_nlp: 0.2,
  price_vision: 0.01,
  price_diffusion: 0.04,
  price_llm_gguf_input: 2.0,
  price_llm_gguf_output: 8.0,
  default_provider_share_percent: 80,
  playground_trial_limit: 50,
  credits_per_egp: 10,
  commission_tier_free: 20,
  commission_tier_professional: 15,
  commission_tier_enterprise: 10,
};

interface SystemConfigTabProps {
  /** Current active organization fee */
  orgFee: number;
  /** Form state input value */
  feeInput: string;
  /** Callback to set form state input value */
  onFeeInputChange: (val: string) => void;
  /** Flag representing if organization fee configs are loading */
  loadingFee: boolean;
  /** Flag representing if organization fee update is submitting */
  updatingFee: boolean;
  /** Callback triggered to submit update organization fee configuration */
  onUpdateFee: () => Promise<void>;
}

/**
 * System Configuration Panel.
 * Manages workspace fees, token economics, model inference pricing (including token-based
 * LLM billing), commission tier schedule, and playground trial limits.
 *
 * @param props - Component parameters.
 * @returns The React component.
 */
export default function SystemConfigTab({
  orgFee,
  feeInput,
  onFeeInputChange,
  loadingFee,
  updatingFee,
  onUpdateFee,
}: SystemConfigTabProps) {
  const [pricingDefaults, setPricingDefaults] = useState<PricingDefaults>(DEFAULT_PRICING);
  const [loadingDefaults, setLoadingDefaults] = useState(true);
  const [savingDefaults, setSavingDefaults] = useState(false);

  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        const res = await smartFetch<PricingDefaults>("/admin/config/pricing-defaults");
        if (res) setPricingDefaults(res);
      } catch (err: unknown) {
        console.error("Failed to load global pricing defaults:", err);
      } finally {
        setLoadingDefaults(false);
      }
    };
    fetchDefaults();
  }, []);

  /**
   * Submits the updated pricing defaults to the backend.
   *
   * @param e - Form submit event.
   */
  const handleSaveDefaults = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDefaults(true);
    try {
      await smartFetch("/admin/config/pricing-defaults", {
        method: "PATCH",
        body: JSON.stringify(pricingDefaults),
      });
      toast.success("Pricing defaults updated successfully!");
    } catch (err: unknown) {
      console.error(err);
      toast.error("Failed to save pricing defaults");
    } finally {
      setSavingDefaults(false);
    }
  };

  /**
   * Updates a numeric field in the pricing defaults state.
   *
   * @param field - The key of the pricing defaults to update.
   * @param value - The raw string value from the input element.
   */
  const handleInputChange = (field: keyof PricingDefaults, value: string) => {
    const parsed = value.includes(".") ? parseFloat(value) : parseInt(value, 10);
    setPricingDefaults((prev) => ({ ...prev, [field]: isNaN(parsed) ? 0 : parsed }));
  };

  if (loadingFee || loadingDefaults) {
    return (
      <div className="py-24 flex flex-col items-center justify-center bg-card border border-border rounded-2xl shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <span className="text-muted-foreground text-xs">Synchronizing platform parameters...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in text-left max-w-5xl font-sans text-xs text-foreground">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT SIDEBAR: Workspace fees, token economics, trial limits, commission tiers */}
        <div className="lg:col-span-5 space-y-6">

          {/* Workspace Creation Fees */}
          <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl relative overflow-hidden hover-lift transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 to-purple-600" />
            <CardHeader className="p-5 border-b border-border/60 bg-muted/10">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                Workspace Creation Fees
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                Credit dues charged when creating organization workspaces.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Fee Rate (EGP Equivalents)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-[9px] select-none">
                      EGP
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={feeInput}
                      onChange={(e) => onFeeInputChange(e.target.value)}
                      className="pl-11 bg-background border-border text-foreground font-bold rounded-xl h-9 text-xs focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <Button
                    onClick={onUpdateFee}
                    disabled={updatingFee}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 text-xs px-4 rounded-xl border-none cursor-pointer flex items-center gap-1.5 transition-colors font-sans shadow-xs hover-lift"
                  >
                    {updatingFee ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Update Fee"}
                  </Button>
                </div>
                <div className="flex gap-2 p-3 bg-secondary/35 rounded-xl border border-border/80 mt-3 text-muted-foreground leading-relaxed font-sans text-[10px] text-left">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <p>
                    Charged to the user&apos;s Consumer wallet on workspace creation. Current rate:{" "}
                    <span className="font-bold text-foreground font-mono">{orgFee.toFixed(2)} Credits</span>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credits Conversion Rate */}
          <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl relative overflow-hidden hover-lift transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader className="p-5 border-b border-border/60 bg-muted/10">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-500" />
                Credits Conversion Rate
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                Credit balance generated per 1 EGP deposited.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Credits / EGP Coefficient
                </label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-[9px] select-none uppercase">
                    Credits per EGP 1
                  </span>
                  <Input
                    type="number"
                    min="1"
                    value={pricingDefaults.credits_per_egp}
                    onChange={(e) => handleInputChange("credits_per_egp", e.target.value)}
                    className="bg-background border-border text-foreground font-bold rounded-xl h-9 text-xs pr-24 focus:outline-none focus:border-primary transition-all"
                  />
                </div>
                <p className="text-[9px] text-muted-foreground leading-normal font-sans pt-1">
                  Defines how many credit points are issued per EGP paid. Default is 10 credits / 1 EGP.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sandbox Execution Limits */}
          <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl relative overflow-hidden hover-lift transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-orange-500" />
            <CardHeader className="p-5 border-b border-border/60 bg-muted/10">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Sandbox Execution Limits
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                Free trial call cap before a live API key subscription is required.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Free Sandbox Prediction Calls
                </label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-[9px] select-none uppercase">
                    Max calls limit
                  </span>
                  <Input
                    type="number"
                    min="1"
                    value={pricingDefaults.playground_trial_limit}
                    onChange={(e) => handleInputChange("playground_trial_limit", e.target.value)}
                    className="bg-background border-border text-foreground font-bold rounded-xl h-9 text-xs pr-24 focus:outline-none focus:border-primary transition-all"
                  />
                </div>
                <p className="text-[9px] text-muted-foreground leading-normal font-sans pt-1">
                  Requests allowed before the user must subscribe with a live API key.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Commission Tier Schedule */}
          <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl relative overflow-hidden hover-lift transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500 to-pink-500" />
            <CardHeader className="p-5 border-b border-border/60 bg-muted/10">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-rose-500" />
                Commission Tier Schedule
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                Platform cut (%) per subscription tier. Provider earns the remainder.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {(
                [
                  { field: "commission_tier_free" as const, label: "Free Tier", color: "text-slate-400" },
                  { field: "commission_tier_professional" as const, label: "Professional", color: "text-blue-400" },
                  { field: "commission_tier_enterprise" as const, label: "Enterprise", color: "text-purple-400" },
                ] as const
              ).map(({ field, label, color }) => (
                <div key={field} className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold w-24 shrink-0 ${color}`}>{label}</span>
                  <div className="relative flex-1">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-[10px]">%</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={pricingDefaults[field]}
                      onChange={(e) => handleInputChange(field, e.target.value)}
                      className="bg-background border-border text-foreground font-bold h-8 text-xs pr-8 rounded-lg focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                    provider keeps {100 - pricingDefaults[field]}%
                  </span>
                </div>
              ))}
              <p className="text-[9px] text-muted-foreground font-sans pt-1 text-left">
                Changes apply to newly created models. Existing models retain their negotiated split.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Inference pricing grid */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSaveDefaults} className="h-full flex flex-col">
            <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md flex-1 flex flex-col rounded-2xl relative overflow-hidden hover-lift transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 to-pink-500" />
              <CardHeader className="p-5 border-b border-border/60 bg-muted/10">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2 text-left">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Global Inference Rate Defaults
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                  Default pricing per model type. LLM_GGUF uses token-based billing (credits / 1M tokens).
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 flex-1 space-y-5">
                {/* Per-prediction / per-image pricing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Tabular */}
                  <div className="space-y-1.5 p-3.5 rounded-2xl border border-border/80 bg-secondary/15 hover:border-primary/20 transition-all text-left">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Tabular (Credits / Prediction)
                    </label>
                    <div className="relative mt-1">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-3.5 h-3.5" />
                      <Input
                        type="number"
                        min="0"
                        step="0.00001"
                        value={pricingDefaults.price_tabular}
                        onChange={(e) => handleInputChange("price_tabular", e.target.value)}
                        className="pl-9 bg-background border-border text-foreground font-bold h-9 text-xs rounded-xl focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                    <p className="text-[8px] text-muted-foreground mt-1 font-sans">scikit-learn, XGBoost, time-series models.</p>
                  </div>

                  {/* NLP */}
                  <div className="space-y-1.5 p-3.5 rounded-2xl border border-border/80 bg-secondary/15 hover:border-primary/20 transition-all text-left">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                      NLP (Credits / Prediction)
                    </label>
                    <div className="relative mt-1">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-3.5 h-3.5" />
                      <Input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={pricingDefaults.price_nlp}
                        onChange={(e) => handleInputChange("price_nlp", e.target.value)}
                        className="pl-9 bg-background border-border text-foreground font-bold h-9 text-xs rounded-xl focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                    <p className="text-[8px] text-muted-foreground mt-1 font-sans">Text classifiers, embeddings, parsers.</p>
                  </div>

                  {/* Vision */}
                  <div className="space-y-1.5 p-3.5 rounded-2xl border border-border/80 bg-secondary/15 hover:border-primary/20 transition-all text-left">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Vision (Credits / Image)
                    </label>
                    <div className="relative mt-1">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-3.5 h-3.5" />
                      <Input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={pricingDefaults.price_vision}
                        onChange={(e) => handleInputChange("price_vision", e.target.value)}
                        className="pl-9 bg-background border-border text-foreground font-bold h-9 text-xs rounded-xl focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                    <p className="text-[8px] text-muted-foreground mt-1 font-sans">CNNs, object detection, OCR, classification.</p>
                  </div>

                  {/* Diffusion */}
                  <div className="space-y-1.5 p-3.5 rounded-2xl border border-border/80 bg-secondary/15 hover:border-primary/20 transition-all text-left">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Diffusion (Credits / Image)
                    </label>
                    <div className="relative mt-1">
                      <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-3.5 h-3.5" />
                      <Input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={pricingDefaults.price_diffusion}
                        onChange={(e) => handleInputChange("price_diffusion", e.target.value)}
                        className="pl-9 bg-background border-border text-foreground font-bold h-9 text-xs rounded-xl focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                    <p className="text-[8px] text-muted-foreground mt-1 font-sans">Text-to-image generation pipelines.</p>
                  </div>

                  {/* Provider Share */}
                  <div className="space-y-1.5 p-3.5 rounded-2xl border border-border/80 bg-secondary/15 hover:border-primary/20 transition-all sm:col-span-2 text-left">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Percent className="w-3 h-3 text-muted-foreground" />
                      Default Provider Revenue Share (%)
                    </label>
                    <div className="relative mt-1 max-w-[50%]">
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={pricingDefaults.default_provider_share_percent}
                        onChange={(e) => handleInputChange("default_provider_share_percent", e.target.value)}
                        className="bg-background border-border text-foreground font-bold h-9 text-xs pr-8 rounded-xl focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                    <p className="text-[8px] text-muted-foreground font-sans">Provider&apos;s cut of each inference charge. Remainder is platform revenue.</p>
                  </div>
                </div>

                {/* LLM Token Pricing — separate section */}
                <div className="border-t border-border pt-5 text-left">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                      LLM GGUF — Token-Based Billing
                    </span>
                    <span className="text-[8px] text-muted-foreground font-sans">(credits per 1 million tokens)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Input tokens */}
                    <div className="space-y-1.5 p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] hover:border-amber-500/35 transition-all">
                      <label className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                        Input Tokens (Credits / 1M)
                      </label>
                      <div className="relative mt-1">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/60 w-3.5 h-3.5" />
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={pricingDefaults.price_llm_gguf_input}
                          onChange={(e) => handleInputChange("price_llm_gguf_input", e.target.value)}
                          className="pl-9 bg-background border-border text-foreground font-bold h-9 text-xs rounded-xl focus:outline-none focus:border-primary transition-all"
                        />
                      </div>
                      <p className="text-[8px] text-muted-foreground mt-1 font-sans">
                        Charged on prompt / context tokens sent to the model.
                      </p>
                    </div>

                    {/* Output tokens */}
                    <div className="space-y-1.5 p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] hover:border-amber-500/35 transition-all">
                      <label className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                        Output Tokens (Credits / 1M)
                      </label>
                      <div className="relative mt-1">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/60 w-3.5 h-3.5" />
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={pricingDefaults.price_llm_gguf_output}
                          onChange={(e) => handleInputChange("price_llm_gguf_output", e.target.value)}
                          className="pl-9 bg-background border-border text-foreground font-bold h-9 text-xs rounded-xl focus:outline-none focus:border-primary transition-all"
                        />
                      </div>
                      <p className="text-[8px] text-muted-foreground mt-1 font-sans">
                        Charged on completion tokens generated by the model.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 p-3 bg-amber-500/[0.05] rounded-xl border border-amber-500/15 mt-3 text-muted-foreground leading-relaxed font-sans text-[9px]">
                    <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p>
                      LLM cost is computed <span className="font-bold text-foreground">after</span> inference using the{" "}
                      <code className="font-mono text-[9px]">usage.prompt_tokens</code> and{" "}
                      <code className="font-mono text-[9px]">usage.completion_tokens</code> fields from the model response.
                      A minimum balance pre-flight check (cost of 1K input tokens) is performed before each request.
                    </p>
                  </div>
                </div>
              </CardContent>

              <div className="p-4 border-t border-border bg-muted/15 flex items-center justify-between font-sans">
                <div className="text-[9px] text-muted-foreground flex items-center gap-1 select-none font-sans">
                  <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Config parameters synced</span>
                </div>
                <Button
                  type="submit"
                  disabled={savingDefaults}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold h-9 text-xs px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover-lift"
                >
                  {savingDefaults ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Save Pricing Defaults
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
}
