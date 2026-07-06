"use client";

import React from "react";
import { CheckCircle2, Crown, Loader2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { cn } from "@/lib/utils";

type BillingCycle = "MONTHLY" | "ANNUAL";

interface ProviderTierDefinition {
  id: string;
  code: string;
  displayName: string;
  description: string | null;
  monthlyPriceEgp: number | string;
  annualPriceEgp: number | string | null;
  platformCommissionPercent: number;
  providerSharePercent: number;
  maxModels: number | null;
  maxPublicModels: number | null;
  maxVersionsPerModel: number | null;
  allowCustomPricing: boolean;
  allowPriorityReview: boolean;
  allowOrgPublishing: boolean;
  allowDedicatedSupport: boolean;
  allowFeaturedPlacement: boolean;
  allowAdvancedAnalytics: boolean;
}

interface ProviderAccount {
  id: string;
  status: string;
  tier: ProviderTierDefinition;
}

interface LimitUtilization {
  used: number;
  limit: number | null;
  remaining: number | null;
}

interface ProviderPlansResponse {
  account: ProviderAccount;
  tiers: ProviderTierDefinition[];
  utilization: {
    totalModels: LimitUtilization;
    publicModels: LimitUtilization;
  };
}

interface CheckoutResponse {
  session: {
    url?: string;
  };
  originalAmountEgp: number;
  discountAmountEgp: number;
  finalAmountEgp: number;
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "string" ? Number(value) || 0 : value;
}

function formatLimit(value: number | null): string {
  return value === null ? "Unlimited" : value.toString();
}

function tierFeatures(tier: ProviderTierDefinition): string[] {
  return [
    `${tier.providerSharePercent}% provider revenue share`,
    `${formatLimit(tier.maxModels)} total models`,
    `${formatLimit(tier.maxPublicModels)} public models`,
    tier.allowCustomPricing ? "Custom pricing enabled" : "Standard pricing controls",
    tier.allowPriorityReview ? "Priority review queue" : "Standard review queue",
    tier.allowAdvancedAnalytics ? "Advanced analytics" : "Core analytics",
  ];
}

export function ProviderPlansPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = React.useState<ProviderPlansResponse | null>(null);
  const [billingCycle, setBillingCycle] = React.useState<BillingCycle>("MONTHLY");
  const [offerCode, setOfferCode] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [checkoutTierId, setCheckoutTierId] = React.useState<string | null>(null);
  const checkoutStatus = searchParams.get("status");
  const checkoutSessionId = searchParams.get("session_id");
  const isConfirmingCheckout =
    checkoutStatus === "provider_subscription_success" && Boolean(checkoutSessionId);

  const loadProviderPlans = React.useCallback(async () => {
    const res = await smartFetch<ProviderPlansResponse>("/provider-accounts/me");
    setData(res);
    return res;
  }, []);

  React.useEffect(() => {
    let active = true;

    smartFetch<ProviderPlansResponse>("/provider-accounts/me")
      .then((res) => {
        if (active) setData(res);
      })
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
  }, []);

  React.useEffect(() => {
    const status = checkoutStatus;
    const sessionId = checkoutSessionId;
    if (!status?.startsWith("provider_subscription_")) return;

    const clearCheckoutParams = () => {
      router.replace("/provider/subscriptions", { scroll: false });
    };

    const dedupeKey = `provider-plan-checkout:${status}:${sessionId ?? "none"}`;
    let alreadyHandled = false;
    try {
      alreadyHandled = window.sessionStorage.getItem(dedupeKey) === "1";
      if (!alreadyHandled) {
        window.sessionStorage.setItem(dedupeKey, "1");
      }
    } catch {
      alreadyHandled = false;
    }

    if (alreadyHandled) {
      clearCheckoutParams();
      return;
    }

    if (status === "provider_subscription_cancelled") {
      toast.error("Provider plan checkout was cancelled.");
      clearCheckoutParams();
      return;
    }

    if (status !== "provider_subscription_success") return;

    if (!sessionId) {
      toast.success("Provider plan checkout completed. Your tier will update after payment confirmation.");
      clearCheckoutParams();
      return;
    }

    const confirmation = smartFetch<{ success: boolean }>("/provider-accounts/confirm-checkout", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    }).then(() => loadProviderPlans());

    toast.promise(confirmation, {
      loading: "Confirming provider plan payment...",
      success: "Provider plan updated.",
      error: (err) =>
        err instanceof Error
          ? err.message
          : "Could not confirm provider plan payment yet.",
    });

    confirmation
      .finally(() => {
        clearCheckoutParams();
      })
      .catch(() => {
        // Handled by toast promise
      });
  }, [checkoutSessionId, checkoutStatus, loadProviderPlans, router]);

  const handleCheckout = async (tier: ProviderTierDefinition) => {
    if (data?.account.tier.id === tier.id) return;

    setCheckoutTierId(tier.id);
    try {
      const res = await smartFetch<CheckoutResponse>("/provider-accounts/subscription-checkout", {
        method: "POST",
        body: JSON.stringify({
          tierId: tier.id,
          billingCycle,
          offerCode: offerCode.trim() || undefined,
        }),
      });

      if (!res.session?.url) {
        throw new Error("Checkout session did not include a redirect URL");
      }
      window.location.assign(res.session.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start provider plan checkout";
      toast.error(message);
      setCheckoutTierId(null);
    }
  };

  if (loading) {
    return (
      <Card className="border border-border bg-card rounded-xl overflow-hidden shadow-xs">
        <CardContent className="p-5">
          <div className="h-4 w-40 bg-muted animate-pulse rounded" />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-48 bg-muted/60 animate-pulse rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const currentTier = data.account.tier;

  return (
    <Card className="border border-border/80 bg-card/60 backdrop-blur-md rounded-xl overflow-hidden shadow-xs text-left font-sans relative premium-card p-0">
      <div className="glow-spot" />
      <div className="glow-spot-secondary" />

      <CardContent className="p-0 relative z-10">
        
        {/* Panel Header Banner */}
        <div className="p-5 border-b border-border/60 bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 select-none">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
              <Crown className="w-3.5 h-3.5" />
              Provider Subscription Management
            </div>
            <h2 className="text-base font-extrabold text-foreground tracking-tight">
              Current Workspace Tier: <span className="text-primary font-black">{currentTier.displayName}</span>
            </h2>
            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xl">
              {isConfirmingCheckout
                ? "Checking payment session and updating credentials..."
                : "Upgrade your publisher capabilities to upload custom container weights, unlock higher request volume limits, and configure customized price lists."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
            {/* Billing Cycle Selector */}
            <div className="inline-flex rounded-lg border border-border bg-background p-0.5 shadow-sm select-none">
              {(["MONTHLY", "ANNUAL"] as BillingCycle[]).map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setBillingCycle(cycle)}
                  className={cn(
                    "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer hover-lift active-shrink",
                    billingCycle === cycle
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cycle === "MONTHLY" ? "Monthly" : "Annual"}
                </button>
              ))}
            </div>
            <input
              value={offerCode}
              onChange={(event) => setOfferCode(event.target.value)}
              placeholder="Promo offer code"
              className="h-8.5 w-full sm:w-36 rounded-lg border border-border bg-background px-3 text-[11px] font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all form-input"
            />
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="flex flex-wrap gap-5 p-5 justify-center">
          {data.tiers.map((tier) => {
            const isCurrent = currentTier.id === tier.id;
            const monthly = toNumber(tier.monthlyPriceEgp);
            const annual = toNumber(tier.annualPriceEgp) || monthly * 12;
            const price = billingCycle === "MONTHLY" ? monthly : annual;
            const isCheckoutLoading = checkoutTierId === tier.id;
            const cannotCheckout = price <= 0 && !isCurrent;

            // Gradient colors based on current status vs regular options
            const cardAccentGlow = isCurrent
              ? "from-emerald-400 to-teal-500"
              : "from-primary/60 to-indigo-500/60";

            return (
              <div
                key={tier.id}
                className={cn(
                  "relative rounded-xl border bg-card/75 backdrop-blur-md overflow-hidden flex flex-col min-h-[360px] w-full sm:w-[280px] md:w-[300px] flex-grow sm:flex-grow-0 transition-all duration-300 select-none shadow-xs hover-lift",
                  isCurrent
                    ? "border-emerald-500/40 ring-2 ring-emerald-500/10 shadow-sm"
                    : "border-border hover:border-primary/30 hover:shadow-sm"
                )}
              >
                {/* Visual top line */}
                <div className={cn("h-1 w-full bg-gradient-to-r", cardAccentGlow)} />

                <div className="p-5 flex flex-col flex-1">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="text-left">
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/80 font-mono">
                        {tier.code}
                      </p>
                      <h3 className="mt-0.5 text-xs font-bold text-foreground">
                        {tier.displayName}
                      </h3>
                    </div>
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                    )}
                  </div>

                  {/* Pricing Row */}
                  <div className="mb-4 text-left border-b border-border/40 pb-4">
                    <div className="text-xl font-black text-foreground tracking-tight font-mono">
                      {price > 0 ? `${price.toLocaleString()} EGP` : "Custom"}
                    </div>
                    <p className="text-[9.5px] text-muted-foreground mt-0.5 font-medium">
                      {price > 0 ? `per ${billingCycle.toLowerCase()} cycle` : "Request contract activation"}
                    </p>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2 flex-1 text-left">
                    {tierFeatures(tier).map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5 text-[10.5px] text-muted-foreground leading-relaxed">
                        <ShieldCheck className="mt-0.5 w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="font-medium text-[11px]">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <Button
                    type="button"
                    disabled={isCurrent || cannotCheckout || checkoutTierId !== null}
                    onClick={() => handleCheckout(tier)}
                    variant={isCurrent ? "outline" : "default"}
                    className={cn(
                      "mt-5 h-9 w-full text-xs font-bold transition-all duration-150 select-none cursor-pointer hover-lift active-shrink rounded-lg",
                      isCurrent && "border-emerald-500/20 bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-not-allowed hover:text-emerald-650"
                    )}
                  >
                    {isCheckoutLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Redirecting...
                      </>
                    ) : isCurrent ? (
                      "Active Tier Plan"
                    ) : cannotCheckout ? (
                      "Contact Admin"
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 shrink-0" />
                        {monthly > toNumber(currentTier.monthlyPriceEgp) ? "Upgrade Plan" : "Downgrade Plan"}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Usage Limits footer */}
        <div className="px-5 py-4.5 border-t border-border/60 bg-secondary/15 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs select-none">
          <div className="text-left">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground font-mono">Account status</p>
            <p className="mt-1 font-bold text-foreground capitalize">{data.account.status.toLowerCase()}</p>
          </div>
          <div className="text-left">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground font-mono">Model usage</p>
            <p className="mt-1 font-bold text-foreground">
              {data.utilization.totalModels.used} / {formatLimit(data.utilization.totalModels.limit)}
            </p>
          </div>
          <div className="text-left">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground font-mono">Public listings</p>
            <p className="mt-1 font-bold text-foreground">
              {data.utilization.publicModels.used} / {formatLimit(data.utilization.publicModels.limit)}
            </p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
