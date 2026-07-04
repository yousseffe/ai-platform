"use client";

import React, { useState } from "react";
import { ShieldCheck, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Model } from "@/types";
import { updateNetworkSettings } from "@/lib/actions/models.actions";

interface NetworkSecurityCardProps {
  model: Model;
  modelId: string;
}

/**
 * Owner-facing settings card for a model's container network policy. Lets
 * the provider opt a model's deployed containers into outbound internet
 * access — by default, containers run on an isolated, internal-only Docker
 * network with no route out, alongside restricted capabilities and a
 * read-only root filesystem.
 */
export function NetworkSecurityCard({ model, modelId }: NetworkSecurityCardProps) {
  const [allowEgress, setAllowEgress] = useState(model.allowEgress ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNetworkSettings(modelId, allowEgress);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-border bg-card rounded-2xl p-6 space-y-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-primary font-bold text-sm select-none">
          <ShieldCheck className="w-5 h-5" />
          <div>
            <h3 className="font-sans font-bold text-sm text-foreground">
              Network Sandbox
            </h3>
            <p className="text-muted-foreground text-[11px] font-sans font-normal mt-0.5">
              Deployed containers run with dropped capabilities, a read-only
              filesystem, and no outbound internet access unless enabled
              here. Takes effect on the next deployment.
            </p>
          </div>
        </div>
        <button
          onClick={() => setAllowEgress((prev) => !prev)}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono border cursor-pointer transition-colors ${
            allowEgress
              ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          {allowEgress ? "INTERNET ALLOWED" : "ISOLATED"}
        </button>
      </div>

      <div className="w-full h-px bg-border" />

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="font-bold text-xs cursor-pointer"
        >
          {saving ? "Saving..." : "Save Network Policy"}
        </Button>
      </div>
    </div>
  );
}
