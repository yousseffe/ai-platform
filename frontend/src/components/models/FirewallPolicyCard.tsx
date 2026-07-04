"use client";

import React, { useEffect, useState } from "react";
import { Shield, ShieldAlert, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FirewallMode } from "@/types";
import {
  getModelFirewallPolicy,
  updateModelFirewallPolicy,
  getModelFirewallStatus,
  unblockModelFirewall,
} from "@/lib/actions/firewall.actions";

interface FirewallPolicyCardProps {
  modelId: string;
}

/**
 * Owner-facing settings card for a model's firewall policy: IP allow/deny
 * lists, prompt-injection blocking, and the fraud-engine risk score
 * threshold that trips an automatic temporary block. Also surfaces (and
 * lets the owner manually clear) any block currently in effect.
 */
export function FirewallPolicyCard({ modelId }: FirewallPolicyCardProps) {
  const [mode, setMode] = useState<FirewallMode>("MONITOR");
  const [blockOnInjection, setBlockOnInjection] = useState(false);
  const [riskThreshold, setRiskThreshold] = useState<string>("");
  const [ipAllowlist, setIpAllowlist] = useState("");
  const [ipDenylist, setIpDenylist] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ blocked: boolean; reason: string | null } | null>(null);

  const load = async () => {
    const [policy, blockStatus] = await Promise.all([
      getModelFirewallPolicy(modelId),
      getModelFirewallStatus(modelId),
    ]);
    if (policy) {
      setMode(policy.enforcementMode);
      setBlockOnInjection(policy.blockOnInjection);
      setRiskThreshold(
        policy.blockOnRiskScoreThreshold !== null ? String(policy.blockOnRiskScoreThreshold) : ""
      );
      setIpAllowlist((policy.ipAllowlist || []).join("\n"));
      setIpDenylist((policy.ipDenylist || []).join("\n"));
    }
    if (blockStatus) setStatus(blockStatus);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  const parseIpList = (value: string): string[] | null => {
    const items = value
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return items.length > 0 ? items : null;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateModelFirewallPolicy(modelId, {
        enforcementMode: mode,
        blockOnInjection,
        blockOnRiskScoreThreshold: riskThreshold.trim() ? Number(riskThreshold) : null,
        ipAllowlist: parseIpList(ipAllowlist),
        ipDenylist: parseIpList(ipDenylist),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async () => {
    await unblockModelFirewall(modelId);
    await load();
  };

  return (
    <div className="border border-border bg-card rounded-2xl p-6 space-y-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-primary font-bold text-sm select-none">
          <Shield className="w-5 h-5" />
          <div>
            <h3 className="font-sans font-bold text-sm text-foreground">
              Model Firewall
            </h3>
            <p className="text-muted-foreground text-[11px] font-sans font-normal mt-0.5">
              IP allow/deny lists, prompt-injection blocking, and an
              auto-block threshold tied to the fraud engine&apos;s risk score.
            </p>
          </div>
        </div>
        <button
          onClick={() => setMode(mode === "ENFORCE" ? "MONITOR" : "ENFORCE")}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono border cursor-pointer transition-colors ${
            mode === "ENFORCE"
              ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
              : "bg-secondary border-border text-muted-foreground"
          }`}
        >
          {mode === "ENFORCE" ? "ENFORCE" : "MONITOR"}
        </button>
      </div>

      {status?.blocked && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
            <ShieldAlert className="w-4 h-4" />
            Currently auto-blocked: {status.reason}
          </div>
          <button
            onClick={handleUnblock}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer font-bold"
          >
            <Unlock className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      )}

      <div className="w-full h-px bg-border" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
            Auto-block risk threshold (0-100)
          </label>
          <Input
            type="number"
            min={0}
            max={100}
            placeholder="Disabled"
            value={riskThreshold}
            onChange={(e) => setRiskThreshold(e.target.value)}
          />
        </div>
        <div className="flex items-end pb-1.5">
          <button
            onClick={() => setBlockOnInjection((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono border cursor-pointer transition-colors ${
              blockOnInjection
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-secondary border-border text-muted-foreground"
            }`}
          >
            Block prompt injection: {blockOnInjection ? "ON" : "OFF"}
          </button>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
            IP allowlist (one per line)
          </label>
          <textarea
            className="w-full h-20 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-xs font-mono outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={ipAllowlist}
            onChange={(e) => setIpAllowlist(e.target.value)}
            placeholder="Empty = no restriction"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
            IP denylist (one per line)
          </label>
          <textarea
            className="w-full h-20 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-xs font-mono outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={ipDenylist}
            onChange={(e) => setIpDenylist(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="font-bold text-xs cursor-pointer">
          {saving ? "Saving..." : "Save Firewall Policy"}
        </Button>
      </div>
    </div>
  );
}
