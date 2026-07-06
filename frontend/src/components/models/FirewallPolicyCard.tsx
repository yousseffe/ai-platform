"use client";

import React, { useEffect, useState } from "react";
import {
  Shield,
  ShieldAlert,
  Unlock,
  AlertTriangle,
  HelpCircle,
  Eye,
  RefreshCw,
  Terminal,
  AlertCircle,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { FirewallMode } from "@/types";
import {
  getModelFirewallPolicy,
  updateModelFirewallPolicy,
  getModelFirewallStatus,
  unblockModelFirewall,
  getModelFirewallLogs,
} from "@/lib/actions/firewall.actions";
import type { FirewallAuditLog } from "@/lib/services/firewall.service";
import toast from "react-hot-toast";

interface FirewallPolicyCardProps {
  modelId: string;
}

/**
 * Owner-facing settings card for a model's firewall policy: IP allow/deny
 * lists, prompt-injection blocking, and risk score thresholds.
 * Redesigned into a premium security control panel.
 */
export function FirewallPolicyCard({ modelId }: FirewallPolicyCardProps) {
  const [mode, setMode] = useState<FirewallMode>("MONITOR");
  const [blockOnInjection, setBlockOnInjection] = useState(false);
  const [riskThreshold, setRiskThreshold] = useState<string>("");
  const [ipAllowlist, setIpAllowlist] = useState("");
  const [ipDenylist, setIpDenylist] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ blocked: boolean; reason: string | null } | null>(null);

  // Advanced Security Logs and Validation
  const [logs, setLogs] = useState<FirewallAuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [allowlistErrors, setAllowlistErrors] = useState<string[]>([]);
  const [denylistErrors, setDenylistErrors] = useState<string[]>([]);

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

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await getModelFirewallLogs(modelId);
      setLogs(data);
    } catch (err) {
      console.error("Failed to load firewall audit logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
      fetchLogs();
    }, 0);
    
    // Poll logs every 10 seconds for real-time security updates
    const interval = setInterval(fetchLogs, 10000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  // Real-time IP list validator supporting subnets, wildcards, and IPs
  const validateIpList = (value: string): string[] => {
    const lines = value.split("\n").map((s) => s.trim()).filter(Boolean);
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    const wildcardRegex = /^(\d{1,3}|\*)\.(\d{1,3}|\*)\.(\d{1,3}|\*)\.(\d{1,3}|\*)$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|::1$/i;

    const errors: string[] = [];
    lines.forEach((line, idx) => {
      if (
        !ipRegex.test(line) &&
        !cidrRegex.test(line) &&
        !wildcardRegex.test(line) &&
        !ipv6Regex.test(line)
      ) {
        errors.push(`Line ${idx + 1}: "${line}" is not a valid IP, CIDR (e.g. /24) or Wildcard (e.g. *)`);
      }
    });
    return errors;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setAllowlistErrors(validateIpList(ipAllowlist));
    }, 0);
    return () => clearTimeout(timer);
  }, [ipAllowlist]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDenylistErrors(validateIpList(ipDenylist));
    }, 0);
    return () => clearTimeout(timer);
  }, [ipDenylist]);

  const parseIpList = (value: string): string[] | null => {
    const items = value
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    return items.length > 0 ? items : null;
  };

  const handleSave = async () => {
    if (allowlistErrors.length > 0 || denylistErrors.length > 0) {
      toast.error("Please fix validation errors in IP configuration first.");
      return;
    }

    setSaving(true);
    try {
      const res = await updateModelFirewallPolicy(modelId, {
        enforcementMode: mode,
        blockOnInjection,
        blockOnRiskScoreThreshold: riskThreshold.trim() ? Number(riskThreshold) : null,
        ipAllowlist: parseIpList(ipAllowlist),
        ipDenylist: parseIpList(ipDenylist),
      });
      if (res.success) {
        toast.success("Firewall policy updated successfully.");
        fetchLogs();
      } else {
        toast.error(res.error || "Failed to save policy.");
      }
    } catch {
      toast.error("An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async () => {
    const res = await unblockModelFirewall(modelId);
    if (res.success) {
      toast.success("Model temporary cooldown block lifted successfully.");
      await load();
      fetchLogs();
    } else {
      toast.error(res.error || "Failed to clear lock.");
    }
  };

  // Presets
  const applyLocalhostPreset = () => {
    const current = ipAllowlist.split("\n").map(s => s.trim()).filter(Boolean);
    if (!current.includes("127.0.0.1")) current.push("127.0.0.1");
    if (!current.includes("::1")) current.push("::1");
    setIpAllowlist(current.join("\n"));
    toast.success("Applied Localhost loopback preset to Allowlist.");
  };

  const applyThreatBlockPreset = () => {
    const current = ipDenylist.split("\n").map(s => s.trim()).filter(Boolean);
    if (!current.includes("198.51.100.42")) current.push("198.51.100.42");
    if (!current.includes("203.0.113.195")) current.push("203.0.113.195");
    setIpDenylist(current.join("\n"));
    toast.success("Added VPN/Tor Exit Node test vectors to Denylist.");
  };

  const clearLists = () => {
    setIpAllowlist("");
    setIpDenylist("");
    toast.success("Cleared firewall IP access control textareas.");
  };

  const hasErrors = allowlistErrors.length > 0 || denylistErrors.length > 0;

  return (
    <div className="border border-border bg-card rounded-2xl p-6 space-y-6 shadow-sm">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3 text-primary font-bold text-sm">
          <Shield className="w-5 h-5" />
          <div>
            <h3 className="font-sans font-bold text-sm text-foreground">
              Advanced Model Firewall
            </h3>
            <p className="text-muted-foreground text-[11px] font-sans font-normal mt-0.5">
              Live edge security filtering, prompt-injection shielding, and custom IP access tables.
            </p>
          </div>
        </div>

        {/* Mode Segmented Controller */}
        <div className="flex bg-secondary/60 p-1 rounded-xl border border-border/80 w-fit shrink-0 items-center">
          <button
            onClick={() => setMode("MONITOR")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-sans transition-all cursor-pointer ${
              mode === "MONITOR"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>MONITOR</span>
          </button>
          <button
            onClick={() => setMode("ENFORCE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-sans transition-all cursor-pointer ${
              mode === "ENFORCE"
                ? "bg-red-500 text-white font-extrabold shadow-2xs"
                : "text-muted-foreground hover:text-red-500"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>ENFORCE</span>
          </button>
        </div>
      </div>

      {/* Active Lock Alert Banner */}
      {status?.blocked && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs animate-pulse">
          <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 font-bold">
            <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
            <div>
              <p className="text-foreground text-[11px]">ACTIVE SECURITY COOL-DOWN LOCK</p>
              <p className="text-muted-foreground text-[10px] font-normal mt-0.5">Reason: {status.reason}</p>
            </div>
          </div>
          <button
            onClick={handleUnblock}
            className="flex items-center gap-1.5 bg-red-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg hover:bg-red-600 shadow-sm cursor-pointer transition-colors"
          >
            <Unlock className="w-3.5 h-3.5" /> Clear Lock
          </button>
        </div>
      )}

      <div className="w-full h-px bg-border/60" />

      {/* Quick Security Presets */}
      <div className="p-3 bg-secondary/35 border border-border/80 rounded-xl space-y-2 select-none">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-foreground">
          <Sliders className="w-3.5 h-3.5 text-primary" />
          <span>Quick Security Presets</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={applyLocalhostPreset}
            className="text-[9px] font-semibold bg-background hover:bg-secondary border border-border hover:border-border/100 text-foreground px-2 py-1 rounded-md cursor-pointer transition-all"
          >
            Restrict to Localhost
          </button>
          <button
            onClick={applyThreatBlockPreset}
            className="text-[9px] font-semibold bg-background hover:bg-secondary border border-border hover:border-border/100 text-foreground px-2 py-1 rounded-md cursor-pointer transition-all"
          >
            Add Threat vectors
          </button>
          <button
            onClick={clearLists}
            className="text-[9px] font-semibold bg-background hover:bg-red-500/10 border border-border text-red-500 px-2 py-1 rounded-md cursor-pointer transition-all"
          >
            Clear Fields
          </button>
        </div>
      </div>

      {/* Defense Configurations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Layer 1: Prompt Injection Guard */}
        <div className="flex flex-col justify-between p-4 rounded-xl border border-border bg-background/30 gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between select-none">
              <span className="text-xs font-bold text-foreground">Prompt Injection Protection</span>
              <Switch checked={blockOnInjection} onCheckedChange={setBlockOnInjection} />
            </div>
            <p className="text-[10px] text-muted-foreground leading-normal mt-1.5">
              Filters input prompts to identify overrides, system role leaks, jailbreaks, and instructions hijacking before running container inference.
            </p>
          </div>
          <div className="text-[10px] font-semibold font-mono text-muted-foreground">
            Defense Status: <span className={blockOnInjection ? "text-emerald-500" : "text-amber-500"}>{blockOnInjection ? "SHIELD ACTIVE" : "BYPASSED"}</span>
          </div>
        </div>

        {/* Layer 2: Auto-Block Risk Score */}
        <div className="flex flex-col justify-between p-4 rounded-xl border border-border bg-background/30 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1">
              <span>Risk Score Threshold (0-100)</span>
              <span title="Model temporary blocks if request evaluation is above threshold.">
                <HelpCircle className="w-3 h-3 text-muted-foreground" />
              </span>
            </Label>
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="Disable threshold blocking"
              value={riskThreshold}
              onChange={(e) => setRiskThreshold(e.target.value)}
              className="w-full font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground leading-normal">
              Trips automatic cooldown blocks on client IPs exceeding evaluation threat level. Set lower for sensitive serving models.
            </p>
          </div>
        </div>
      </div>

      {/* IP Access Control Lists */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Allowlist */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-foreground">IP Allowlist (One subnet/IP per line)</Label>
          <textarea
            className={`w-full h-24 rounded-lg border bg-transparent px-2.5 py-1.5 text-xs font-mono outline-none focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground/60 ${
              allowlistErrors.length > 0 ? "border-red-500/70 focus-visible:border-red-500 focus-visible:ring-red-500/20" : "border-input focus-visible:border-ring"
            }`}
            value={ipAllowlist}
            onChange={(e) => setIpAllowlist(e.target.value)}
            placeholder="e.g. 192.168.1.1&#10;10.0.0.0/24&#10;(Empty = All Allowed)"
          />
          {allowlistErrors.length > 0 && (
            <div className="space-y-1">
              {allowlistErrors.map((err, idx) => (
                <div key={idx} className="flex items-center gap-1 text-[9px] text-red-500 font-semibold font-sans">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground leading-relaxed select-none">
            Requests outside these explicit CIDR ranges/IPs will be rejected.
          </p>
        </div>

        {/* Denylist */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-foreground">IP Denylist (One subnet/IP per line)</Label>
          <textarea
            className={`w-full h-24 rounded-lg border bg-transparent px-2.5 py-1.5 text-xs font-mono outline-none focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground/60 ${
              denylistErrors.length > 0 ? "border-red-500/70 focus-visible:border-red-500 focus-visible:ring-red-500/20" : "border-input focus-visible:border-ring"
            }`}
            value={ipDenylist}
            onChange={(e) => setIpDenylist(e.target.value)}
            placeholder="e.g. 198.51.100.42&#10;203.0.113.0/24"
          />
          {denylistErrors.length > 0 && (
            <div className="space-y-1">
              {denylistErrors.map((err, idx) => (
                <div key={idx} className="flex items-center gap-1 text-[9px] text-red-500 font-semibold font-sans">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground leading-relaxed select-none">
            All requests originating from these IP endpoints will be dropped.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-1">
        <Button
          onClick={handleSave}
          disabled={saving || hasErrors}
          className="font-bold text-xs cursor-pointer px-5"
        >
          {saving ? "Saving..." : "Save Firewall Policy"}
        </Button>
      </div>

      {/* Live Security Audit Feed */}
      <div className="w-full h-px bg-border/60" />
      
      <div className="space-y-4 font-sans select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold text-foreground">
              Live Firewall Activity & Security Logs
            </h4>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loadingLogs}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors bg-transparent border-none outline-none"
          >
            <RefreshCw className={`w-3 h-3 ${loadingLogs ? "animate-spin" : ""}`} />
            <span>Refresh Logs</span>
          </button>
        </div>

        <div className="bg-secondary/20 border border-border/80 rounded-xl overflow-hidden font-mono text-[10px]">
          {logs.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground font-sans text-[11px]">
              No recent firewall blocks recorded. Serving path is secure.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {logs.map((log) => {
                const isBlock = log.action === "firewall.blocked_request";
                
                return (
                  <div key={log.id} className="p-3 hover:bg-secondary/40 transition-all flex items-start gap-3">
                    {isBlock ? (
                      <div className="bg-red-500/10 p-1.5 rounded-lg border border-red-500/20 shrink-0">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                      </div>
                    ) : (
                      <div className="bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20 shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-extrabold ${isBlock ? "text-red-500" : "text-amber-500"}`}>
                          {isBlock ? "BLOCKED" : "VIOLATION DETECTED"}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-foreground leading-normal font-sans font-normal text-[11px] mt-0.5">
                        {log.metadata?.reason || "Request dropped by firewall policy rules"}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-muted-foreground mt-1 select-all">
                        <span>IP Address: <strong className="text-foreground font-mono">{log.ipAddress || "Unknown"}</strong></span>
                        {log.metadata?.scopeType && (
                          <span>Scope: <strong className="text-foreground font-mono">{log.metadata.scopeType.toUpperCase()}</strong></span>
                        )}
                        {log.metadata?.enforcementMode && (
                          <span>Action Mode: <strong className="text-foreground font-mono">{log.metadata.enforcementMode}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
