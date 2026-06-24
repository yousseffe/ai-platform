"use client";

import React, { useState } from "react";
import { Coins, ArrowRight, Loader2, Info, ArrowUpRight, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { redirectToCheckout } from "@/lib/services/stripe.service";
import { useWorkspace } from "@/hooks/use-workspace";

const PRESET_AMOUNTS = [10, 25, 50, 100];

/**
 * Premium payment & withdrawal card enabling users to top up credits or cash out balance.
 * Integrates Stripe Checkout for deposits and mock bank transactions for withdrawals.
 * Re-styled for settings dashboard tab layout integration.
 *
 * @returns The React component rendering the credit ledger management card.
 */
export default function WalletTopUpCard({ onTransactionSuccess }: { onTransactionSuccess?: () => void }) {
  const { balance, withdrawFunds } = useWorkspace();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  
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
      toast.error(`Insufficient balance. You only have $${balance.toFixed(2)} credits.`);
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await withdrawFunds(finalAmount);
      if (res.success) {
        toast.success(`Successfully withdrew $${finalAmount.toFixed(2)} to your bank account!`);
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
            Current withdrawable balance: <span className="font-mono font-bold text-foreground">${balance.toFixed(2)}</span>
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5 text-left">
        {/* Tab Selection */}
        <div className="flex border-b border-border bg-secondary/20 rounded-lg p-0.5 border-border/50 select-none">
          <button
            type="button"
            onClick={() => setActiveTab("deposit")}
            className={`flex-1 py-1 px-3 rounded-md text-[10px] font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "deposit"
                ? "bg-card text-primary shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Deposit Credits
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 py-1 px-3 rounded-md text-[10px] font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "withdraw"
                ? "bg-card text-primary shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Withdraw Balance
          </button>
        </div>

        {/* Tab Contents: DEPOSIT */}
        {activeTab === "deposit" ? (
          <div className="space-y-5 animate-fade-in">
            {/* Preset Amounts Grid */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                Select Package Amount
              </label>
              <div className="grid grid-cols-4 gap-2.5">
                {PRESET_AMOUNTS.map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant={selectedPreset === amt ? "default" : "outline"}
                    onClick={() => selectPreset(amt)}
                    className={`py-1.5 h-8 text-[11px] font-bold transition-all cursor-pointer rounded-lg border ${
                      selectedPreset === amt
                        ? "bg-primary hover:bg-primary/95 text-primary-foreground border-primary"
                        : "border-border hover:bg-secondary text-foreground hover:text-foreground"
                    }`}
                  >
                    ${amt}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount Form */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                Custom Deposit (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold select-none">
                  $
                </span>
                <Input
                  type="number"
                  min="5"
                  step="1"
                  value={customAmount}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  placeholder="Enter custom amount"
                  className="pl-7 h-9 bg-background border-border text-foreground font-semibold text-xs focus-visible:ring-primary/20 focus-visible:border-primary rounded-lg"
                />
              </div>
            </div>

            {/* Info Alert */}
            <div className="flex gap-2 items-start bg-secondary/35 border border-border p-3 rounded-lg text-[11px] text-muted-foreground leading-normal font-sans">
              <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Simulation Mode:</span> Redirects to Stripe Sandbox Checkout. Use test card <span className="font-mono text-primary font-semibold select-all">4242 4242 4242 4242</span> to verify payouts.
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={handleTopUp}
              disabled={loading || activeAmount < 5}
              className="w-full btn-primary font-bold py-2 text-xs flex items-center justify-center gap-1.5 shadow-sm rounded-lg h-9"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Opening Stripe Sandbox...
                </>
              ) : (
                <>
                  Purchase ${activeAmount.toFixed(2)} Credits
                  <ArrowRight className="w-3.5 h-3.5" />
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
                  Withdraw ${(parseFloat(withdrawAmount) || 0).toFixed(2)} Credits
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
