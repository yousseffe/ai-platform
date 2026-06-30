"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BanknoteArrowUp,
  Coins,
  Landmark,
  Loader2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { redirectToCheckout } from "@/lib/services/stripe.service";
import { withdrawWorkspaceFunds } from "@/lib/services/wallets.service";

interface OrganizationFinanceActionPanelProps {
  orgId: string;
  orgSlug: string;
  orgName: string;
  showConsumerFinance: boolean;
  showProviderFinance: boolean;
  consumerBalance: number;
  providerBalance: number;
  creditsPerEgp: number;
  onFinanceUpdated: () => Promise<void>;
}

const DEPOSIT_PRESETS = [10, 25, 50, 100];
const WITHDRAW_PRESETS = [25, 50, 100, 250];

/**
 * Professional organization finance action surface for top-ups and provider payouts.
 * Keeps wallet operations visually grouped and refreshes parent finance views after updates.
 *
 * @param props - Organization wallet availability, balances, and refresh callbacks.
 * @returns A finance action panel tailored to the organization's enabled wallet types.
 */
export default function OrganizationFinanceActionPanel({
  orgId,
  orgSlug,
  orgName,
  showConsumerFinance,
  showProviderFinance,
  consumerBalance,
  providerBalance,
  creditsPerEgp,
  onFinanceUpdated,
}: OrganizationFinanceActionPanelProps) {
  const [depositAmount, setDepositAmount] = useState("25");
  const [withdrawAmount, setWithdrawAmount] = useState("50");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const consumerWalletBalance = Number(consumerBalance) || 0;
  const providerWalletBalance = Number(providerBalance) || 0;
  const parsedDeposit = parseFloat(depositAmount) || 0;
  const parsedWithdraw = parseFloat(withdrawAmount) || 0;
  const projectedCredits = Math.round(parsedDeposit * creditsPerEgp);
  const projectedRemainingBalance = Math.max(
    providerWalletBalance - parsedWithdraw,
    0,
  );

  const providerHighlights = useMemo(
    () => [
      "Owner-controlled payouts from the shared provider earnings wallet.",
      "Every withdrawal is appended to the organization provider ledger.",
      "Approved marketplace traffic accumulates here before payout.",
    ],
    [],
  );

  /**
   * Opens a Stripe checkout session for consumer wallet credit deposits.
   */
  const handleTopUp = async (): Promise<void> => {
    if (parsedDeposit < 5) {
      toast.error("Minimum deposit is 5.00 EGP");
      return;
    }

    setIsDepositing(true);
    try {
      await redirectToCheckout(parsedDeposit, {
        workspaceId: orgId,
        returnPath: `/orgs/${orgSlug}/billing`,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to open Stripe Checkout",
      );
      setIsDepositing(false);
    }
  };

  /**
   * Withdraws funds from the organization provider wallet.
   */
  const handleWithdraw = async (): Promise<void> => {
    if (parsedWithdraw <= 0) {
      toast.error("Please enter a valid withdrawal amount");
      return;
    }

    if (parsedWithdraw > providerWalletBalance) {
      toast.error("Withdrawal amount exceeds the available provider balance");
      return;
    }

    setIsWithdrawing(true);
    try {
      await withdrawWorkspaceFunds(orgId, parsedWithdraw);
      toast.success(
        `${parsedWithdraw.toFixed(2)} EGP withdrawn from ${orgName}'s provider wallet.`,
      );
      setWithdrawAmount("");
      await onFinanceUpdated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to withdraw funds",
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <section
      className={`grid gap-4 ${
        showConsumerFinance && showProviderFinance
          ? "xl:grid-cols-[1.05fr_0.95fr]"
          : "xl:grid-cols-1"
      }`}
    >
      {showConsumerFinance && (
        <Card className="overflow-hidden border-border/80 bg-card shadow-sm">
          <CardHeader className="border-b border-border/70 bg-linear-to-r from-blue-500/10 via-card to-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Consumer Wallet
                </p>
                <CardTitle className="mt-1 text-lg font-bold">
                  Add shared credits professionally
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fund projects, API keys, and team integrations from one central wallet.
                </p>
              </div>
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-700 dark:text-blue-300">
                <Coins className="h-5 w-5" strokeWidth={1.8} />
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {DEPOSIT_PRESETS.map((amount) => {
                const isActive = depositAmount === amount.toString();
                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setDepositAmount(amount.toString())}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                      isActive
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-background hover:bg-secondary/50"
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Deposit
                    </p>
                    <p className="mt-2 text-lg font-black text-foreground">
                      {amount} EGP
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Math.round(amount * creditsPerEgp).toLocaleString()} credits
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-3 rounded-2xl border border-border bg-background/70 p-4">
                <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Custom Deposit
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
                    EGP
                  </span>
                  <Input
                    type="number"
                    min="5"
                    step="1"
                    value={depositAmount}
                    onChange={(event) => setDepositAmount(event.target.value)}
                    placeholder="Enter amount"
                    className="h-11 rounded-xl pl-11 text-sm font-semibold"
                  />
                </div>
                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        Current Balance
                      </p>
                      <p className="mt-1 text-lg font-black text-foreground">
                {consumerWalletBalance.toLocaleString()} credits
                      </p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                      <Wallet className="h-4 w-4" strokeWidth={1.8} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em]">
                    Funding Summary
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-muted-foreground">
                    You pay
                  </p>
                  <p className="mt-1 text-2xl font-black text-foreground">
                    {parsedDeposit.toFixed(2)} EGP
                  </p>
                </div>
                <div className="flex items-center justify-center text-primary">
                  <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Organization receives
                  </p>
                  <p className="mt-1 text-2xl font-black text-primary">
                    {projectedCredits.toLocaleString()} credits
                  </p>
                </div>
                <p className="text-xs leading-6 text-muted-foreground">
                  Minimum deposit is 5 EGP. Funds are routed into the shared consumer wallet for all active projects under this workspace.
                </p>
              </div>
            </div>

            <Button
              className="h-11 w-full text-sm font-semibold"
              onClick={handleTopUp}
              disabled={isDepositing || parsedDeposit < 5}
            >
              {isDepositing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
              )}
              Continue to Checkout
            </Button>
          </CardContent>
        </Card>
      )}

      {showProviderFinance && (
        <Card className="overflow-hidden border-border/80 bg-card shadow-sm">
          <CardHeader className="border-b border-border/70 bg-linear-to-r from-emerald-500/10 via-card to-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Provider Wallet
                </p>
                <CardTitle className="mt-1 text-lg font-bold">
                  Withdraw organization earnings
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cash out accumulated marketplace revenue from the shared provider wallet.
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300">
                <BanknoteArrowUp className="h-5 w-5" strokeWidth={1.8} />
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-5">
            <div className="rounded-2xl border border-emerald-500/20 bg-linear-to-br from-emerald-500/10 via-card to-card p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Available for payout
                  </p>
                  <p className="mt-2 text-3xl font-black text-foreground">
                    {providerWalletBalance.toFixed(2)} EGP
                  </p>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    Shared provider earnings from approved, organization-owned models.
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300">
                  <TrendingUp className="h-5 w-5" strokeWidth={1.8} />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {WITHDRAW_PRESETS.map((amount) => {
                const disabled = amount > providerWalletBalance;
                const isActive = withdrawAmount === amount.toString();
                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setWithdrawAmount(amount.toString())}
                    disabled={disabled}
                    className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                      isActive
                        ? "border-emerald-500/30 bg-emerald-500/10 shadow-sm"
                        : "border-border bg-background hover:bg-secondary/50"
                    } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Quick Payout
                    </p>
                    <p className="mt-2 text-lg font-black text-foreground">
                      {amount} EGP
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {disabled ? "Insufficient balance" : "Ready to withdraw"}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_0.92fr]">
              <div className="space-y-3 rounded-2xl border border-border bg-background/70 p-4">
                <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Withdrawal Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
                    EGP
                  </span>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={withdrawAmount}
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    placeholder="Enter payout amount"
                    className="h-11 rounded-xl pl-11 text-sm font-semibold"
                  />
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <Landmark className="mt-0.5 h-4 w-4 text-primary" strokeWidth={1.8} />
                    <p className="text-xs leading-6 text-muted-foreground">
                      Owner-controlled payout action. The debit is recorded instantly in the provider ledger for audit visibility across the organization.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em]">
                    Payout Snapshot
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Request
                  </p>
                  <p className="mt-1 text-2xl font-black text-foreground">
                    {parsedWithdraw.toFixed(2)} EGP
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Remaining wallet balance
                  </p>
                  <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-300">
                    {projectedRemainingBalance.toFixed(2)} EGP
                  </p>
                </div>
                <div className="space-y-2">
                  {providerHighlights.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-border bg-card px-4 py-3 text-xs leading-6 text-muted-foreground"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button
              className="h-11 w-full bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
              onClick={handleWithdraw}
              disabled={
                isWithdrawing ||
                parsedWithdraw <= 0 ||
                parsedWithdraw > providerWalletBalance
              }
            >
              {isWithdrawing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} />
              )}
              Withdraw Provider Earnings
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
