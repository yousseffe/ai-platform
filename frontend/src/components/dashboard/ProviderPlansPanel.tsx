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

/**
 * Provider-facing tier management panel for viewing and upgrading account plans.
 */
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
        // toast.promise already renders the error state for the provider.
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
      <Card className="border border-border bg-card rounded-xl overflow-hidden">
        <CardContent className="p-5">
          <div className="h-4 w-40 bg-muted animate-pulse rounded" />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-40 bg-muted/60 animate-pulse rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const currentTier = data.account.tier;

  return (
    <Card className="border border-emerald-500/20 bg-card rounded-xl overflow-hidden shadow-sm text-left">
      <CardContent className="p-0">
        <div className="p-5 border-b border-border/60 bg-linear-to-r from-emerald-500/10 via-primary/5 to-transparent flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
              <Crown className="w-3.5 h-3.5" />
              Provider Plans
            </div>
            <h2 className="mt-1 text-base font-extrabold text-foreground tracking-tight">
              Current plan: {currentTier.displayName}
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
              {isConfirmingCheckout
                ? "Confirming your payment and refreshing your current plan..."
                : "Upgrade your provider account to unlock higher publishing limits, better revenue share, and priority marketplace tools."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="inline-flex rounded-lg border border-border bg-background p-1 shadow-sm">
              {(["MONTHLY", "ANNUAL"] as BillingCycle[]).map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setBillingCycle(cycle)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
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
              placeholder="Offer code"
              className="h-9 w-full sm:w-36 rounded-lg border border-border bg-background px-3 text-xs font-mono outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 p-4">
          {data.tiers.map((tier) => {
            const isCurrent = currentTier.id === tier.id;
            const monthly = toNumber(tier.monthlyPriceEgp);
            const annual = toNumber(tier.annualPriceEgp) || monthly * 12;
            const price = billingCycle === "MONTHLY" ? monthly : annual;
            const isCheckoutLoading = checkoutTierId === tier.id;
            const cannotCheckout = price <= 0 && !isCurrent;

            return (
              <div
                key={tier.id}
                className={cn(
                  "rounded-xl border bg-background p-4 flex flex-col min-h-[330px] transition-all",
                  isCurrent
                    ? "border-emerald-500/45 shadow-sm ring-2 ring-emerald-500/10"
                    : "border-border hover:border-primary/35 hover:-translate-y-0.5 hover:shadow-md"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {tier.code}
                    </p>
                    <h3 className="mt-1 text-sm font-extrabold text-foreground">
                      {tier.displayName}
                    </h3>
                  </div>
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <Sparkles className="w-4 h-4 text-primary" />
                  )}
                </div>

                <div className="mt-4">
                  <div className="text-2xl font-extrabold text-foreground tracking-tight">
                    {price > 0 ? `${price.toLocaleString()} EGP` : "Custom"}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {price > 0 ? `per ${billingCycle.toLowerCase()} cycle` : "contact admin for activation"}
                  </p>
                </div>

                <div className="mt-4 space-y-2 flex-1">
                  {tierFeatures(tier).map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-[10.5px] text-muted-foreground leading-relaxed">
                      <ShieldCheck className="mt-0.5 w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  disabled={isCurrent || cannotCheckout || checkoutTierId !== null}
                  onClick={() => handleCheckout(tier)}
                  className={cn(
                    "mt-4 h-9 rounded-lg text-xs font-bold",
                    isCurrent
                      ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {isCheckoutLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Redirecting
                    </>
                  ) : isCurrent ? (
                    "Current plan"
                  ) : cannotCheckout ? (
                    "Contact admin"
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 mr-1.5" />
                      {monthly > toNumber(currentTier.monthlyPriceEgp) ? "Upgrade" : "Change plan"}
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-border/60 bg-secondary/15 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Account status</p>
            <p className="mt-1 font-bold text-foreground">{data.account.status}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Model usage</p>
            <p className="mt-1 font-bold text-foreground">
              {data.utilization.totalModels.used} / {formatLimit(data.utilization.totalModels.limit)}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Public listings</p>
            <p className="mt-1 font-bold text-foreground">
              {data.utilization.publicModels.used} / {formatLimit(data.utilization.publicModels.limit)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
