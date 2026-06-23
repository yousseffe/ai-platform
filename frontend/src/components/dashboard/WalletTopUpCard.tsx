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
 *
 * @returns The React component rendering the credit ledger management card.
 */
export default function WalletTopUpCard() {
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
    <Card className="border border-border bg-card shadow-sm overflow-hidden font-mono text-xs text-foreground">
      <CardHeader className="flex flex-row items-start gap-4 pb-5 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
          <Coins className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-sm font-bold text-foreground">Workspace Credits Ledger</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Current withdrawable balance: <span className="font-bold text-foreground text-xs">${balance.toFixed(2)}</span>
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Tab Selection */}
        <div className="flex border-b border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab("deposit")}
            className={`flex-1 pb-2.5 font-bold border-b-2 text-center transition-all cursor-pointer ${
              activeTab === "deposit"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Deposit Credits
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 pb-2.5 font-bold border-b-2 text-center transition-all cursor-pointer ${
              activeTab === "withdraw"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Withdraw Balance
          </button>
        </div>

        {/* Tab Contents: DEPOSIT */}
        {activeTab === "deposit" ? (
          <div className="space-y-6 animate-fade-in">
            {/* Preset Amounts Grid */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Select Package Amount
              </label>
              <div className="grid grid-cols-4 gap-3">
                {PRESET_AMOUNTS.map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant={selectedPreset === amt ? "default" : "outline"}
                    onClick={() => selectPreset(amt)}
                    className={`py-2 text-xs font-bold transition-all cursor-pointer rounded-lg border ${
                      selectedPreset === amt
                        ? "bg-primary hover:bg-primary/95 text-primary-foreground border-primary"
                        : "border-border hover:bg-accent text-foreground hover:text-foreground"
                    }`}
                  >
                    ${amt}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Amount Form */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Custom Deposit (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold select-none">
                  $
                </span>
                <Input
                  type="number"
                  min="5"
                  step="1"
                  value={customAmount}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  placeholder="Enter custom amount"
                  className="pl-7 bg-input border-border text-foreground font-medium text-sm focus-visible:ring-primary/20 focus-visible:border-primary rounded-lg"
                />
              </div>
            </div>

            {/* Info Alert */}
            <div className="flex gap-2.5 items-start bg-background border border-border p-3 rounded-xl text-xs text-muted-foreground leading-relaxed">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Simulation Mode:</span> You will be redirected to a Stripe-hosted payment interface. Use any test card (e.g. <span className="font-mono text-primary font-semibold">4242 4242 4242 4242</span>) to complete.
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={handleTopUp}
              disabled={loading || activeAmount < 5}
              className="w-full btn-primary font-bold py-3 text-xs flex items-center justify-center gap-2 shadow-sm rounded-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Opening Checkout...
                </>
              ) : (
                <>
                  Purchase ${activeAmount.toFixed(2)} Credits
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Tab Contents: WITHDRAWAL */
          <div className="space-y-6 animate-fade-in">
            {/* Amount Form */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Withdrawal Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold select-none">
                  $
                </span>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter cash out amount"
                  className="pl-7 bg-input border-border text-foreground font-medium text-sm focus-visible:ring-primary/20 focus-visible:border-primary rounded-lg"
                />
              </div>
            </div>

            {/* Bank Info Alert */}
            <div className="flex gap-2.5 items-start bg-background border border-border p-3 rounded-xl text-xs text-muted-foreground leading-relaxed">
              <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Instant Cash Out:</span> Withdrawals deduct credits instantly from your ledger wallet and transfer to your registered bank account payout route.
              </div>
            </div>

            {/* Action Button */}
            <Button
              onClick={handleWithdraw}
              disabled={withdrawLoading || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > balance}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-xs flex items-center justify-center gap-2 shadow-sm rounded-lg border-none"
            >
              {withdrawLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing Payout...
                </>
              ) : (
                <>
                  Withdraw ${(parseFloat(withdrawAmount) || 0).toFixed(2)} Credits
                  <ArrowUpRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
