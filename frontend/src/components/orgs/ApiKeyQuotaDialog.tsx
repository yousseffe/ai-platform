"use client";

import React, { useState } from "react";
import { Gauge } from "lucide-react";
import { toast } from "react-hot-toast";
import { OrgApiKey, updateApiKeyQuota } from "@/lib/services/projects.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ApiKeyQuotaDialogProps {
  orgId: string;
  apiKey: OrgApiKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Invoked with the updated key after a successful save. */
  onUpdated: (updated: OrgApiKey) => void;
}

/**
 * Lets an org OWNER/MAINTAINER cap how much a project API key can consume —
 * a per-minute request rate limit and/or a daily credit spend budget. Once a
 * key hits its daily spend cap it is auto-suspended (see `suspendedReason`)
 * until the owner raises the cap or the next calendar day.
 *
 * @param props - ApiKeyQuotaDialog component properties.
 * @returns The React component rendering the quota-editing dialog.
 */
export function ApiKeyQuotaDialog({ orgId, apiKey, open, onOpenChange, onUpdated }: ApiKeyQuotaDialogProps) {
  const [maxRequestsPerMinute, setMaxRequestsPerMinute] = useState(
    apiKey.maxRequestsPerMinute?.toString() ?? "",
  );
  const [maxDailySpendCredits, setMaxDailySpendCredits] = useState(
    apiKey.maxDailySpendCredits?.toString() ?? "",
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateApiKeyQuota(orgId, apiKey.projectId, apiKey.id, {
        maxRequestsPerMinute: maxRequestsPerMinute.trim() === "" ? null : Number(maxRequestsPerMinute),
        maxDailySpendCredits: maxDailySpendCredits.trim() === "" ? null : Number(maxDailySpendCredits),
      });
      onUpdated(updated);
      toast.success(`Consumption limits updated for "${apiKey.label}"`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update limits");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader className="flex-row items-start gap-3 space-y-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Gauge className="w-4.5 h-4.5" strokeWidth={2} />
          </div>
          <div className="space-y-1">
            <DialogTitle>Set consumption limits</DialogTitle>
            <DialogDescription>
              Cap how much &ldquo;{apiKey.label}&rdquo; can consume. Leave a field blank for no limit.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="max-rpm" className="text-xs font-semibold">
              Max requests / minute
            </Label>
            <Input
              id="max-rpm"
              type="number"
              min={0}
              placeholder="Unlimited"
              value={maxRequestsPerMinute}
              onChange={(e) => setMaxRequestsPerMinute(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max-daily-spend" className="text-xs font-semibold">
              Max daily spend (credits)
            </Label>
            <Input
              id="max-daily-spend"
              type="number"
              min={0}
              step="0.01"
              placeholder="Unlimited"
              value={maxDailySpendCredits}
              onChange={(e) => setMaxDailySpendCredits(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Once this key spends its daily cap, it&apos;s automatically suspended until the owner raises it or the next calendar day.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Limits"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
