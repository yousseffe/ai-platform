"use client";

import React from "react";
import { Wallet, CreditCard, ShieldCheck, Lock } from "lucide-react";
import { OrgType } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Props type structure mapping for StepWalletReview component.
 */
interface StepWalletReviewProps {
  /**
   * The organization creation fee amount.
   */
  orgFee: number | null;
  /**
   * Whether the fee is currently loading from backend config.
   */
  isFeeLoading: boolean;
  /**
   * Optional error shown when fee loading fails.
   */
  feeLoadError?: string;
  /**
   * The currently selected workspace type.
   */
  orgType: OrgType;
  /**
   * The entered organization name.
   */
  orgName: string;
  /**
   * The derived URL slug.
   */
  orgSlug: string;
  /**
   * Optional organization description.
   */
  orgDescription?: string;
}

/**
 * Step 4 Wizard Component: Review & Stripe secure checkout summary.
 * Explains organization fee, lists ledger accounts generated on activation, and details card payment processing.
 *
 * @param props - Component parameters.
 * @returns The React element.
 */
export default function StepWalletReview({
  orgFee,
  isFeeLoading,
  feeLoadError = "",
  orgType,
  orgName,
  orgSlug,
  orgDescription = "",
}: StepWalletReviewProps) {
  const isDualWallet = orgType === OrgType.PROVIDER || orgType === OrgType.HYBRID;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="text-left font-mono">
        <h3 className="text-sm font-bold text-foreground mb-1">Review & Checkout</h3>
        <p className="text-[10px] text-muted-foreground">Verify workspace profile settings and proceed to secure Stripe payment checkout.</p>
      </div>

      <div className="space-y-4 font-mono text-xs text-left">
        {/* Workspace Summary */}
        <div className="border border-border/80 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/10 space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground font-semibold">Workspace Name:</span>
            <span className="font-bold text-foreground truncate max-w-[200px]">{orgName || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-semibold">URL Endpoint:</span>
            <span className="font-semibold text-primary">qantara.com/{orgSlug || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-semibold">Workspace Profile:</span>
            <span className="font-extrabold uppercase text-[10px]">
              {orgType === OrgType.PROVIDER
                ? "AI Provider"
                : orgType === OrgType.CONSUMER
                ? "AI Consumer"
                : "Hybrid"}
            </span>
          </div>
          {orgDescription && (
            <div className="border-t border-border/50 pt-2 text-[10px]">
              <span className="text-muted-foreground block mb-0.5">Description:</span>
              <p className="text-slate-600 dark:text-slate-300 italic line-clamp-2 leading-relaxed font-sans">{orgDescription}</p>
            </div>
          )}
        </div>

        {/* Wallets Initialized */}
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-[10px] mb-2 uppercase tracking-wide">
            Ledger wallets to initialize:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Consumer Wallet */}
            <Card className="border border-slate-200 dark:border-border bg-slate-50/40 dark:bg-slate-900/10 p-0 hover:scale-[1.01] transition-transform duration-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Consumer Account</span>
                </div>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">0.00 EGP</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-sans leading-tight mt-1">Used to purchase and run marketplace inferences.</p>
              </CardContent>
            </Card>

            {/* Provider Wallet */}
            <Card className={`border border-slate-200 dark:border-border p-0 hover:scale-[1.01] transition-transform duration-200 ${
              isDualWallet ? "bg-slate-50/40 dark:bg-slate-900/10 opacity-100" : "bg-slate-100/50 dark:bg-slate-950/20 opacity-40 select-none"
            }`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                  <Wallet className={`w-3.5 h-3.5 ${isDualWallet ? "text-indigo-500" : "text-slate-400"}`} />
                  <span className="text-[9px] font-bold uppercase tracking-wider">Provider Account</span>
                </div>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">0.00 EGP</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-sans leading-tight mt-1">
                  {isDualWallet ? "Used to receive prediction revenue & withdraw funds." : "Inactive under consumer profile."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Secure stripe payment info */}
        <div className="border border-border/80 rounded-xl p-4 bg-background text-left space-y-3 font-mono">
          <div className="flex justify-between text-xs pb-1">
            <span className="text-muted-foreground font-semibold flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Workspace Creation Fee:
            </span>
            <span className="font-bold text-foreground text-sm">
              {isFeeLoading ? "Loading..." : orgFee !== null ? `${Math.round(orgFee)} EGP` : "Unavailable"}
            </span>
          </div>

          {feeLoadError ? (
            <p className="text-[10px] text-red-500 font-sans">{feeLoadError}</p>
          ) : null}

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-border/60 text-[10px] leading-relaxed flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-foreground">Secure Stripe Checkout Payment</strong>
              <p className="text-slate-500 dark:text-slate-400 leading-normal font-sans">
                You will be redirected to secure Stripe checkout gateway to pay the creation fee. Cards (Visa/Mastercard) are accepted. Money is credited directly to the platform wallet ledger.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
