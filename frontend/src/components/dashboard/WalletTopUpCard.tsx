"use client";

import React, { useState } from "react";
import { Coins, ArrowRight, Loader2, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { redirectToCheckout } from "@/lib/services/stripe.service";

const PRESET_AMOUNTS = [10, 25, 50, 100];

/**
 * Premium payment card enabling users to deposit funds into their workspace wallets.
 * Integrates Stripe Test Mode Checkout redirects with interactive selection tools.
 *
 * @returns The React component rendering the credit top-up UI card.
 */
export default function WalletTopUpCard() {
  const [customAmount, setCustomAmount] = useState<string>("25");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(25);
  const [loading, setLoading] = useState<boolean>(false);

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
    <Card className="border border-border bg-card shadow-sm overflow-hidden font-mono">
      <CardHeader className="flex flex-row items-start gap-4 pb-5 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
          <Coins className="w-5 h-5" />
        </div>
        <div>
          <CardTitle className="text-sm font-bold text-foreground">Deposit Ledger Credits</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Top up your active workspace consumer balance using Stripe Test Cards.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Preset Amounts Grid */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Select Amount
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
            Custom Amount (USD)
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
      </CardContent>
    </Card>
  );
}
