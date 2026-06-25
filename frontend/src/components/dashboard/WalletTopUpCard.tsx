"use client";

import React, { useState, useEffect } from "react";
import { Coins, ArrowRight, Loader2, Info, ArrowUpRight, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { redirectToCheckout } from "@/lib/services/stripe.service";
import { useWorkspace } from "@/hooks/use-workspace";
import { WalletType } from "@/types";
import { getCreditsPerUsd } from "@/lib/services/wallets.service";

const PRESET_AMOUNTS = [10, 25, 50, 100];

/**
 * Premium payment & withdrawal card enabling users to top up credits or cash out balance.
 * Integrates Stripe Checkout for deposits and mock bank transactions for withdrawals.
 * Re-styled for settings dashboard tab layout integration.
 *
 * @returns The React component rendering the credit ledger management card.
 */
export default function WalletTopUpCard({ onTransactionSuccess }: { onTransactionSuccess?: () => void }) {
  const { balance, withdrawFunds, viewMode } = useWorkspace();
  const isConsumer = viewMode === WalletType.CONSUMER;
  
  // Conversion state
  const [creditsPerUsd, setCreditsPerUsd] = useState<number>(10);

  // Load credits conversion rate on mount
  useEffect(() => {
    if (isConsumer) {
      getCreditsPerUsd()
        .then((rate) => setCreditsPerUsd(rate))
        .catch((err: unknown) => console.error("Failed to load credits rate config:", err));
    }
  }, [isConsumer]);

  // Deposit state
  const [customAmount, setCustomAmount] = useState<string>("25");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(25);
  const [loading, setLoading] = useState<boolean>(false);

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState<string>("25");
  const [withdrawLoading, setWithdrawLoading] = useState<boolean>(false);


  /**
   * Triggers redirection to Stripe Checkout.
   */
  const handleTopUp = async () => {
    const finalAmount = selectedPreset !== null ? selectedPreset : parseFloat(customAmount);

    if (isNaN(finalAmount) || finalAmount < 5.0) {
      toast.error("Minimum deposit is $5.00");
      return;
    }

    setLoading(true);
    try {
      await redirectToCheckout(finalAmount);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Redirect to checkout failed";
      toast.error(message);
      setLoading(false);
    }
  };

  /**
   * Triggers withdrawal transaction.
   */
  const handleWithdraw = async () => {
    const finalAmount = parseFloat(withdrawAmount);

    if (isNaN(finalAmount) || finalAmount <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    if (finalAmount > balance) {
      toast.error(`Insufficient balance. You only have $${balance.toFixed(2)} USD.`);
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await withdrawFunds(finalAmount);
      if (res.success) {
        toast.success(`Successfully withdrew $${finalAmount.toFixed(2)} USD to your bank account!`);
        setWithdrawAmount("");
        onTransactionSuccess?.();
      } else {
        toast.error(res.error || "Withdrawal failed");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred during withdrawal");
    } finally {
      setWithdrawLoading(false);
    }
  };


  /**
   * Handles preset selection updates.
   *
   * @param amt - Selected preset amount.
   */
  const selectPreset = (amt: number) => {
    setSelectedPreset(amt);
    setCustomAmount(amt.toString());
  };

  /**
   * Handles custom input updates.
   *
   * @param val - Input string value.
   */
  const handleCustomChange = (val: string) => {
    setSelectedPreset(null);
    setCustomAmount(val);
  };

  const activeAmount = selectedPreset !== null ? selectedPreset : parseFloat(customAmount) || 0;

  return (
    <Card className="border border-border bg-card shadow-sm overflow-hidden font-sans text-xs text-foreground rounded-xl">
      <CardHeader className="flex flex-row items-center gap-3.5 pb-4 border-b border-border bg-secondary/10">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
          <Coins className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 text-left">
          <CardTitle className="text-xs font-bold text-foreground">Workspace Credits Ledger</CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
            {isConsumer ? (
              <>Current credits balance: <span className="font-mono font-bold text-foreground">{Math.round(balance)} Credits</span></>
            ) : (
              <>Current withdrawable balance: <span className="font-mono font-bold text-foreground">${balance.toFixed(2)} USD</span></>
            )}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5 text-left">
        {/* Tab Contents: DEPOSIT */}
        {isConsumer ? (
          <div className="space-y-5 animate-fade-in">
            {/* Preset Amounts Grid */}
            <div className="space-y-2">
              <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider select-none font-mono">
                Select Package Amount
              </label>
              <div className="grid grid-cols-2 gap-3.5">
                {PRESET_AMOUNTS.map((amt) => {
                  const isSelected = selectedPreset === amt;
                  const creditsCount = amt * creditsPerUsd;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => selectPreset(amt)}
                      className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer focus:outline-none group select-none ${
                        isSelected
                          ? "bg-primary/[0.04] border-primary text-primary shadow-xs"
                          : "bg-secondary/15 hover:bg-secondary/40 border-border text-foreground"
                      }`}
                    >
                      <div className="w-full flex items-center justify-between gap-2">
                        <span className="text-[13px] font-extrabold tracking-tight font-sans">
                          {creditsCount.toLocaleString()}
                        </span>
                        <div className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
                          isSelected
                            ? "bg-primary/10 border-primary/20 text-primary"
                            : "bg-background border-border text-muted-foreground group-hover:text-foreground"
                        }`}>
                          <Coins className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground mt-0.5 font-sans">
                        Credits
                      </span>
                      <div className="mt-4 flex items-baseline gap-1 font-mono">
                        <span className={`text-xs font-extrabold ${isSelected ? "text-primary" : "text-foreground"}`}>
                          ${amt}
                        </span>
                        <span className="text-[9.5px] text-muted-foreground font-medium font-sans">
                          USD
                        </span>
                      </div>
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Amount Form & Calculator */}
            <div className="space-y-3 border-t border-border pt-4 mt-2">
              <div className="flex items-center justify-between">
                <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider select-none font-mono">
                  Custom Deposit
                </label>
                {selectedPreset !== null && (
                  <button
                    type="button"
                    onClick={() => handleCustomChange("10")}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer font-sans"
                  >
                    Use Custom Amount
                  </button>
                )}
              </div>
              
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold select-none font-mono">
                  $
                </span>
                <Input
                  type="number"
                  min="5"
                  step="1"
                  value={customAmount}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  placeholder="Enter custom amount"
                  className="pl-8 pr-12 h-10 bg-background border-border text-foreground font-bold text-xs focus-visible:ring-primary/20 focus-visible:border-primary rounded-xl font-mono"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold select-none uppercase tracking-wider font-mono">
                  USD
                </span>
              </div>
              
              {activeAmount > 0 && (
                <div className="p-3.5 bg-secondary/15 rounded-xl border border-border flex items-center justify-between gap-3 font-sans">
                  <div className="text-left">
                    <span className="text-[8px] font-bold text-muted-foreground/60 uppercase block font-mono">You Pay</span>
                    <span className="text-sm font-extrabold text-foreground font-mono">${activeAmount.toFixed(2)} USD</span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-bold text-muted-foreground/60 uppercase block font-mono">You Receive</span>
                    <span className="text-sm font-extrabold text-primary flex items-center justify-end gap-1 font-mono">
                      <Coins className="w-3.5 h-3.5 text-primary" />
                      {Math.round(activeAmount * creditsPerUsd).toLocaleString()} Credits
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Info Alert */}
            <div className="flex gap-2.5 items-start bg-secondary/30 border border-border p-3.5 rounded-xl text-[11px] text-muted-foreground leading-normal font-sans">
              <Info className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Simulation Mode:</span> Redirects to Stripe Sandbox Checkout. Use test card <span className="font-mono text-primary font-semibold select-all">4242 4242 4242 4242</span> to verify payouts.
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={handleTopUp}
              disabled={loading || activeAmount < 5}
              className="w-full btn-primary font-bold py-2.5 text-xs flex items-center justify-center gap-1.5 shadow-sm rounded-xl h-10 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  Opening Stripe Sandbox...
                </>
              ) : (
                <>
                  Deposit ${activeAmount.toFixed(2)} USD for {Math.round(activeAmount * creditsPerUsd).toLocaleString()} Credits
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Tab Contents: WITHDRAWAL */
          <div className="space-y-5 animate-fade-in">
            {/* Amount Form */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                Withdrawal Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold select-none">
                  $
                </span>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter cash out amount"
                  className="pl-7 h-9 bg-background border-border text-foreground font-semibold text-xs focus-visible:ring-primary/20 focus-visible:border-primary rounded-lg"
                />
              </div>
            </div>

            {/* Bank Info Alert */}
            <div className="flex gap-2 items-start bg-secondary/35 border border-border p-3 rounded-lg text-[11px] text-muted-foreground leading-normal font-sans">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Instant Transfer:</span> Earnings withdraw instantly from ledger balance into your payouts bank account context.
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={handleWithdraw}
              disabled={withdrawLoading || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > balance}
              className="w-full bg-emerald-600 hover:bg-emerald-600/95 text-white font-bold py-2 text-xs flex items-center justify-center gap-1.5 shadow-sm rounded-lg border-none h-9"
            >
              {withdrawLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processing Payout...
                </>
              ) : (
                <>
                  Withdraw ${ (parseFloat(withdrawAmount) || 0).toFixed(2) } USD
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
