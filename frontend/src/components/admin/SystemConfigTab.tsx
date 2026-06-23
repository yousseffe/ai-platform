"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SystemConfigTabProps {
  /** Current active organization fee */
  orgFee: number;
  /** Form state input value */
  feeInput: string;
  /** Callback to set form state input value */
  onFeeInputChange: (val: string) => void;
  /** Flag representing if organization fee configs are loading */
  loadingFee: boolean;
  /** Flag representing if organization fee update is submitting */
  updatingFee: boolean;
  /** Callback triggered to submit update organization fee configuration */
  onUpdateFee: () => Promise<void>;
}

/**
 * Renders the System Configuration card to configure global platform parameters,
 * organization workspace fees, and pricing restrictions.
 *
 * @param props - Component parameters including orgFee and callbacks.
 * @returns The React component for System Config tab.
 */
export default function SystemConfigTab({
  orgFee,
  feeInput,
  onFeeInputChange,
  loadingFee,
  updatingFee,
  onUpdateFee,
}: SystemConfigTabProps) {
  return (
    <div className="space-y-6 animate-fade-in text-left max-w-xl">
      <Card className="border border-border bg-card shadow-sm font-mono text-xs text-foreground">
        <CardHeader className="border-b border-border bg-accent/20">
          <CardTitle className="text-sm font-bold text-foreground">Workspace Platform Constraints</CardTitle>
          <CardDescription className="text-[10px] text-muted-foreground mt-0.5">
            Configure global ledger constraints, onboarding organization creation fees, and platform default commissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          {loadingFee ? (
            <div className="py-6 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
              <span>Fetching system configs...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Organization Creation Fee (Credits)
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                      $
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={feeInput}
                      onChange={(e) => onFeeInputChange(e.target.value)}
                      className="pl-7 bg-input border-border text-foreground font-medium rounded-lg h-9 text-xs focus-visible:ring-primary/20"
                    />
                  </div>
                  <Button
                    onClick={onUpdateFee}
                    disabled={updatingFee}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs px-4 rounded-lg border-none cursor-pointer"
                  >
                    {updatingFee ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Apply Fee"
                    )}
                  </Button>
                </div>
                <p className="text-[9px] text-muted-foreground leading-snug mt-1">
                  This fee is charged to a user&apos;s personal Consumer wallet whenever they initialize a new organization workspace. Current setting is **${orgFee.toFixed(2)} Credits**.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
