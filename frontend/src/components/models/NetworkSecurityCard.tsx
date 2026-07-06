"use client";

import React, { useState } from "react";
import { ShieldCheck, Globe, Check, EyeOff, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Model } from "@/types";
import { updateNetworkSettings } from "@/lib/actions/models.actions";

interface NetworkSecurityCardProps {
  model: Model;
  modelId: string;
}

/**
 * Owner-facing settings card for a model's container network sandbox policy.
 * Redesigned to show sandbox guarantees and egress switch in a high-fidelity panel.
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
      {/* Header and Switch */}
      <div className="flex items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3 text-primary font-bold text-sm">
          <ShieldCheck className="w-5 h-5" />
          <div>
            <h3 className="font-sans font-bold text-sm text-foreground">
              Network & Container Sandbox
            </h3>
            <p className="text-muted-foreground text-[11px] font-sans font-normal mt-0.5">
              Secure execution isolation properties for your model serving container.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold font-mono tracking-wider px-2 py-0.5 rounded border uppercase transition-colors ${
            allowEgress 
              ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" 
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          }`}>
            {allowEgress ? "Outbound Internet Enabled" : "Fully Isolated Sandbox"}
          </span>
          <Switch checked={allowEgress} onCheckedChange={setAllowEgress} />
        </div>
      </div>

      <div className="w-full h-px bg-border/60" />

      {/* Security Properties Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Isolated Network */}
        <div className="flex gap-3 p-3.5 rounded-xl border border-border bg-background/30">
          <div className={`p-1.5 h-fit rounded-lg ${allowEgress ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>
            {allowEgress ? <Globe className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-foreground">Outbound Internet Network</h4>
            <p className="text-[10px] text-muted-foreground leading-normal">
              {allowEgress 
                ? "Outbound connections are allowed. Required if the model fetches weights/data dynamically at runtime." 
                : "No route to internet. Prevents data exfiltration and external connection exploits."}
            </p>
          </div>
        </div>

        {/* Read-Only Filesystem */}
        <div className="flex gap-3 p-3.5 rounded-xl border border-border bg-background/30">
          <div className="p-1.5 h-fit rounded-lg bg-emerald-500/10 text-emerald-500">
            <Check className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-foreground">Read-Only Root Filesystem</h4>
            <p className="text-[10px] text-muted-foreground leading-normal">
              Container is mounted with a read-only root file system, blocking temporary storage write attacks.
            </p>
          </div>
        </div>

        {/* Dropped Capabilities */}
        <div className="flex gap-3 p-3.5 rounded-xl border border-border bg-background/30">
          <div className="p-1.5 h-fit rounded-lg bg-emerald-500/10 text-emerald-500">
            <Check className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-foreground">Dropped Linux Capabilities</h4>
            <p className="text-[10px] text-muted-foreground leading-normal">
              Executed under unprivileged user namespace with kernel syscall restrictions (Seccomp profiles active).
            </p>
          </div>
        </div>

        {/* Resource Limits */}
        <div className="flex gap-3 p-3.5 rounded-xl border border-border bg-background/30">
          <div className="p-1.5 h-fit rounded-lg bg-emerald-500/10 text-emerald-500">
            <Check className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-foreground">Active cgroups Resource Constraints</h4>
            <p className="text-[10px] text-muted-foreground leading-normal">
              Tight bounds on peak memory and CPU execution threads to avoid system memory exhaustion.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="font-bold text-xs cursor-pointer px-5"
        >
          {saving ? "Saving..." : "Save Network Policy"}
        </Button>
      </div>
    </div>
  );
}
