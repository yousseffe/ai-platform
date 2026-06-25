"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";

interface AdjustBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    fullName: string;
    consumerBalance: number;
    providerBalance: number;
  } | null;
  onSuccess: () => void;
}

/**
 * Modal to let platform administrators manually credit/debit balances
 * from a user's consumer (credits) or provider (USD) wallet.
 *
 * @param props - Component properties containing user target and callbacks.
 * @returns The React component rendering the adjust balance modal.
 */
export default function AdjustBalanceModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: AdjustBalanceModalProps) {
  const [walletType, setWalletType] = useState<"CONSUMER" | "PROVIDER">("CONSUMER");
  const [type, setType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset inputs when user changes
  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setWalletType("CONSUMER");
      setType("CREDIT");
    }
  }, [isOpen, user]);

  if (!user) return null;

  const handleSubmit = async () => {
    const amtFloat = parseFloat(amount);
    if (isNaN(amtFloat) || amtFloat <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    setSubmitting(true);
    try {
      await smartFetch(`/admin/users/${user.id}/adjust-wallet`, {
        method: "POST",
        body: JSON.stringify({
          walletType,
          type,
          amount: amtFloat,
        }),
      });
      toast.success("Wallet balance adjusted successfully!");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to adjust balance");
    } finally {
      setSubmitting(false);
    }
  };

  const currentBalance = walletType === "CONSUMER" ? user.consumerBalance : user.providerBalance;
  const currencySymbol = walletType === "CONSUMER" ? "Credits" : "USD";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md font-mono text-xs text-foreground bg-card border border-border">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-foreground">Adjust Wallet Balance</DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground mt-1 font-sans">
            Manually credit or debit user balances. Target: {user.fullName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Target Wallet Type */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Target Wallet</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWalletType("CONSUMER")}
                className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer font-bold ${
                  walletType === "CONSUMER"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                Consumer (Credits)
              </button>
              <button
                type="button"
                onClick={() => setWalletType("PROVIDER")}
                className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer font-bold ${
                  walletType === "PROVIDER"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                Provider (USD)
              </button>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5 font-sans">
              Current balance: <span className="font-bold text-foreground">${currentBalance.toFixed(2)}</span> {currencySymbol}
            </p>
          </div>

          {/* Adjustment Type */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Adjustment Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("CREDIT")}
                className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer font-bold ${
                  type === "CREDIT"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                Credit (Add Funds)
              </button>
              <button
                type="button"
                onClick={() => setType("DEBIT")}
                className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer font-bold ${
                  type === "DEBIT"
                    ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                Debit (Deduct)
              </button>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Adjustment Amount ({currencySymbol})</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50.00"
              className="font-mono text-xs bg-background border-border text-foreground h-9"
              step="0.01"
              min="0.01"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 font-sans">
          <Button variant="ghost" onClick={onClose} disabled={submitting} className="h-8 text-xs cursor-pointer">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="h-8 text-xs cursor-pointer font-bold bg-primary text-primary-foreground hover:bg-primary/95">
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Adjusting...
              </>
            ) : (
              "Apply Adjustment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
