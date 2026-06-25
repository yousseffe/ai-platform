"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Sparkles, Save, ShieldAlert, Coins, Percent, Building2, Sliders, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";

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
 * Redesigned Premium System Configuration Panel.
 * Organizes global workspace setup constraints, token economics coefficients,
 * model inference defaults, and playground sandbox policies into a modern grid.
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
  // Local state for default pricing
  const [pricingDefaults, setPricingDefaults] = useState({
    price_tabular: 0.1,
    price_nlp: 0.2,
    price_vision: 0.3,
    price_llm_gguf: 0.5,
    price_diffusion: 1.0,
    default_provider_share_percent: 80,
    playground_trial_limit: 50,
    credits_per_usd: 10,
  });
  const [loadingDefaults, setLoadingDefaults] = useState(true);
  const [savingDefaults, setSavingDefaults] = useState(false);

  useEffect(() => {
    const fetchDefaults = async () => {
      try {
        const res = await smartFetch<typeof pricingDefaults>("/admin/config/pricing-defaults");
        if (res) {
          setPricingDefaults(res);
        }
      } catch (err: unknown) {
        console.error("Failed to load global pricing defaults:", err);
      } finally {
        setLoadingDefaults(false);
      }
    };
    fetchDefaults();
  }, []);

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

  const handleInputChange = (field: keyof typeof pricingDefaults, value: string) => {
    const parsed = value.includes(".") ? parseFloat(value) : parseInt(value, 10);
    setPricingDefaults((prev) => ({
      ...prev,
      [field]: isNaN(parsed) ? 0 : parsed,
    }));
  };

  return (
    <div className="animate-fade-in text-left max-w-5xl font-mono text-xs text-foreground">
      {/* Loading overlay for entire panel if essential fetch is happening */}
      {(loadingFee || loadingDefaults) ? (
        <div className="py-24 flex flex-col items-center justify-center bg-card border border-border rounded-2xl shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <span className="text-muted-foreground text-xs">Synchronizing platform parameters...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT SIDEBAR: Organization Fees & Global Policies (5 Columns) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Organization Setup & Dues Card */}
            <Card className="border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden rounded-2xl">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
              <CardHeader className="p-5 border-b border-border bg-muted/10">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                  Workspace Creation Fees
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                  Configure the default credit dues charged when creating organization workspaces.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Fee Rate (USD Equivalents)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs select-none">
                        $
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={feeInput}
                        onChange={(e) => onFeeInputChange(e.target.value)}
                        className="pl-7 bg-background border-border text-foreground font-bold rounded-lg h-9 text-xs focus-visible:ring-primary/20"
                      />
                    </div>
                    <Button
                      onClick={onUpdateFee}
                      disabled={updatingFee}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 text-xs px-4 rounded-lg border-none cursor-pointer flex items-center gap-1.5 transition-colors font-sans"
                    >
                      {updatingFee ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Update Fee"
                      )}
                    </Button>
                  </div>
                  <div className="flex gap-2 p-3 bg-secondary/35 rounded-xl border border-border mt-3 text-muted-foreground leading-relaxed font-sans text-[10px]">
                    <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <p>
                      Charged directly to the user&apos;s personal Consumer wallet upon initializing organization hubs. Current rate: <span className="font-bold text-foreground font-mono">${orgFee.toFixed(2)} Credits</span>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Platform Token Economics Card */}
            <Card className="border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden rounded-2xl">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <CardHeader className="p-5 border-b border-border bg-muted/10">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-500" />
                  Credits Conversion Rate
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                  Token exchange coefficients representing credit balances per 1 USD deposit.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Credits / USD Coefficient
                  </label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-[9px] select-none uppercase">
                      Credits per $1
                    </span>
                    <Input
                      type="number"
                      min="1"
                      value={pricingDefaults.credits_per_usd}
                      onChange={(e) => handleInputChange("credits_per_usd", e.target.value)}
                      className="bg-background border-border text-foreground font-bold rounded-lg h-9 text-xs pr-24"
                      required
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-normal font-sans pt-1">
                    Defines the amount of Consumer credit points generated for each dollar paid. **10.0 credits/$1.00** represents standard pricing.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Trial Threshold Card */}
            <Card className="border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden rounded-2xl">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <CardHeader className="p-5 border-b border-border bg-muted/10">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Sandbox Execution Limits
                </CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                  Free sandbox execution trial policies enforced for playground testers.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
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
                      className="bg-background border-border text-foreground font-bold rounded-lg h-9 text-xs pr-24"
                      required
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-normal font-sans pt-1">
                    The number of sandbox requests user accounts can trigger free of charge before live production API key subscription models are required.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDEBAR: Global Pricing defaults & splits (7 Columns) */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSaveDefaults} className="h-full flex flex-col">
              <Card className="border border-border bg-card shadow-sm flex-1 flex flex-col rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                <CardHeader className="p-5 border-b border-border bg-muted/10">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    Global Inference Rates Defaults
                  </CardTitle>
                  <CardDescription className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                    Configure default prediction rates per model tier type and default split commissions.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="p-6 flex-1 space-y-5">
                  {/* Grid of pricing inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Tabular */}
                    <div className="space-y-1.5 p-3.5 rounded-xl border border-border bg-secondary/25 hover:border-primary/20 transition-colors">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Tabular Tier Price (Credits)
                      </label>
                      <div className="relative mt-1">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-3.5 h-3.5" />
                        <Input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={pricingDefaults.price_tabular}
                          onChange={(e) => handleInputChange("price_tabular", e.target.value)}
                          className="pl-9 bg-background border-border text-foreground font-bold h-9 text-xs"
                          required
                        />
                      </div>
                      <p className="text-[8px] text-muted-foreground mt-1 font-sans">For dataframes/structured datasets.</p>
                    </div>

                    {/* NLP */}
                    <div className="space-y-1.5 p-3.5 rounded-xl border border-border bg-secondary/25 hover:border-primary/20 transition-colors">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                        NLP Tier Price (Credits)
                      </label>
                      <div className="relative mt-1">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-3.5 h-3.5" />
                        <Input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={pricingDefaults.price_nlp}
                          onChange={(e) => handleInputChange("price_nlp", e.target.value)}
                          className="pl-9 bg-background border-border text-foreground font-bold h-9 text-xs"
                          required
                        />
                      </div>
                      <p className="text-[8px] text-muted-foreground mt-1 font-sans">For text, parsing, translation models.</p>
                    </div>

                    {/* Vision */}
                    <div className="space-y-1.5 p-3.5 rounded-xl border border-border bg-secondary/25 hover:border-primary/20 transition-colors">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Vision Tier Price (Credits)
                      </label>
                      <div className="relative mt-1">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-3.5 h-3.5" />
                        <Input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={pricingDefaults.price_vision}
                          onChange={(e) => handleInputChange("price_vision", e.target.value)}
                          className="pl-9 bg-background border-border text-foreground font-bold h-9 text-xs"
                          required
                        />
                      </div>
                      <p className="text-[8px] text-muted-foreground mt-1 font-sans">For CNNs, classification, segmentations.</p>
                    </div>

                    {/* LLM GGUF */}
                    <div className="space-y-1.5 p-3.5 rounded-xl border border-border bg-secondary/25 hover:border-primary/20 transition-colors">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                        LLM GGUF Price (Credits)
                      </label>
                      <div className="relative mt-1">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-3.5 h-3.5" />
                        <Input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={pricingDefaults.price_llm_gguf}
                          onChange={(e) => handleInputChange("price_llm_gguf", e.target.value)}
                          className="pl-9 bg-background border-border text-foreground font-bold h-9 text-xs"
                          required
                        />
                      </div>
                      <p className="text-[8px] text-muted-foreground mt-1 font-sans">For serverless GGUF token pipelines.</p>
                    </div>

                    {/* Diffusion */}
                    <div className="space-y-1.5 p-3.5 rounded-xl border border-border bg-secondary/25 hover:border-primary/20 transition-colors">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Diffusion Price (Credits)
                      </label>
                      <div className="relative mt-1">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-3.5 h-3.5" />
                        <Input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={pricingDefaults.price_diffusion}
                          onChange={(e) => handleInputChange("price_diffusion", e.target.value)}
                          className="pl-9 bg-background border-border text-foreground font-bold h-9 text-xs"
                          required
                        />
                      </div>
                      <p className="text-[8px] text-muted-foreground mt-1 font-sans">For text-to-image pipeline renderers.</p>
                    </div>

                    {/* Payout Splits */}
                    <div className="space-y-1.5 p-3.5 rounded-xl border border-border bg-secondary/25 hover:border-primary/20 transition-colors">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block flex items-center gap-1">
                        <Percent className="w-3 h-3 text-muted-foreground" />
                        Default Provider Share
                      </label>
                      <div className="relative mt-1">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                          %
                        </span>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={pricingDefaults.default_provider_share_percent}
                          onChange={(e) => handleInputChange("default_provider_share_percent", e.target.value)}
                          className="bg-background border-border text-foreground font-bold h-9 text-xs pr-8"
                          required
                        />
                      </div>
                      <p className="text-[8px] text-muted-foreground mt-1 font-sans">Owner split. Remainder goes to platform.</p>
                    </div>

                  </div>
                </CardContent>

                {/* Card footer save actions */}
                <div className="p-4 border-t border-border bg-muted/15 flex items-center justify-between font-sans">
                  <div className="text-[9px] text-muted-foreground flex items-center gap-1 select-none font-mono">
                    <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Config parameters synced</span>
                  </div>
                  <Button
                    type="submit"
                    disabled={savingDefaults}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold h-9 text-xs px-4 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
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
      )}
    </div>
  );
}
