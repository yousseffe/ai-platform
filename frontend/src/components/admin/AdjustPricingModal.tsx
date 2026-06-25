"use client";

import React from "react";
import { Loader2, Check, Coins } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminModel } from "@/types";

interface AdjustPricingModalProps {
  /** The model currently being edited, or null if modal is closed */
  editingModel: AdminModel | null;
  /** Form state input value for cost per request */
  costInput: string;
  /** Form state input value for provider share percent */
  shareInput: string;
  /** Callback to set cost input value */
  onCostInputChange: (val: string) => void;
  /** Callback to set share input value */
  onShareInputChange: (val: string) => void;
  /** Callback triggered when the modal is closed */
  onClose: () => void;
  /** Flag representing if pricing submission is currently in progress */
  updatingPricing: boolean;
  /** Callback triggered to submit updated pricing configuration */
  onUpdatePricing: () => Promise<void>;
}

/**
 * Dialog Modal enabling administrators to adjust pricing parameters,
 * cost per request credits, and provider split rates for a model.
 *
 * @param props - Component parameters including editingModel and callbacks.
 * @returns The React component for Adjust Pricing Modal.
 */
export default function AdjustPricingModal({
  editingModel,
  costInput,
  shareInput,
  onCostInputChange,
  onShareInputChange,
  onClose,
  updatingPricing,
  onUpdatePricing,
}: AdjustPricingModalProps) {
  return (
    <Dialog open={editingModel !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] bg-card border border-border text-foreground font-mono text-xs">
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-sm font-bold text-foreground">Adjust Model Pricing Parameters</DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground">
            Configure cost charged per prediction inference, and the provider earnings distribution split for model <strong className="text-foreground">{editingModel?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3 text-left">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Cost Per Request (Credits)
            </label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 w-3.5 h-3.5" />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={costInput}
                onChange={(e) => onCostInputChange(e.target.value)}
                className="pl-9 bg-input border-border text-foreground font-medium rounded-lg h-9 text-xs"
              />
            </div>
            <p className="text-[9px] text-muted-foreground leading-normal mt-1">
              The fee subtracted from a consumer&apos;s wallet balance upon executing a prediction request on this model.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Provider Share Rate (%)
            </label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={shareInput}
                onChange={(e) => onShareInputChange(e.target.value)}
                className="pr-7 bg-input border-border text-foreground font-medium rounded-lg h-9 text-xs"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                %
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground leading-normal mt-1">
              Percentage of cost per request allocated to the provider&apos;s earnings. Remaining share goes to the platform commission balance ({editingModel ? 100 - (parseFloat(shareInput) || 0) : 0}%).
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="py-1.5 h-9 text-[10px] flex-1 cursor-pointer"
            disabled={updatingPricing}
          >
            Cancel
          </Button>
          <Button
            onClick={onUpdatePricing}
            className="bg-primary hover:bg-primary/90 text-primary-foreground py-1.5 h-9 text-[10px] flex-1 cursor-pointer font-bold"
            disabled={updatingPricing}
          >
            {updatingPricing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                Save Configuration <Check className="w-3.5 h-3.5 ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
