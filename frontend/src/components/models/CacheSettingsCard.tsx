"use client";

import React, { useEffect, useState } from "react";
import { Zap, RefreshCw, Layers, Timer, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Model } from "@/types";
import {
  updateCacheSettings,
  getCacheStats,
} from "@/lib/actions/models.actions";

interface CacheSettingsCardProps {
  model: Model;
  modelId: string;
}

/**
 * Owner-facing settings card for a model's response cache policy.
 * Redesigned to show visual status, unified switch, and a high-fidelity metrics dashboard.
 */
export function CacheSettingsCard({ model, modelId }: CacheSettingsCardProps) {
  const [cacheEnabled, setCacheEnabled] = useState(model.cacheEnabled ?? false);
  const [cacheTtlSeconds, setCacheTtlSeconds] = useState(
    model.cacheTtlSeconds ?? 60
  );
  const [cacheHitDiscountPercent, setCacheHitDiscountPercent] = useState(
    model.cacheHitDiscountPercent ?? 100
  );
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{
    hits: number;
    misses: number;
    hitRatePercent: number;
  } | null>(null);

  const loadStats = async () => {
    const res = await getCacheStats(modelId);
    if (res) setStats(res);
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCacheSettings(modelId, {
        cacheEnabled,
        cacheTtlSeconds,
        cacheHitDiscountPercent,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-border bg-card rounded-2xl p-6 space-y-6 shadow-sm">
      {/* Header and Switch */}
      <div className="flex items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3 text-primary font-bold text-sm">
          <Zap className="w-5 h-5" />
          <div>
            <h3 className="font-sans font-bold text-sm text-foreground">
              Response Caching
            </h3>
            <p className="text-muted-foreground text-[11px] font-sans font-normal mt-0.5">
              Instantly serve identical inputs from edge cache without container latency or compute cost.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold font-mono tracking-wider px-2 py-0.5 rounded border uppercase transition-colors ${
            cacheEnabled 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
              : "bg-muted border-border text-muted-foreground"
          }`}>
            {cacheEnabled ? "Active" : "Inactive"}
          </span>
          <Switch checked={cacheEnabled} onCheckedChange={setCacheEnabled} />
        </div>
      </div>

      <div className="w-full h-px bg-border/60" />

      {/* Form Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-muted-foreground" />
            <Label className="text-xs font-bold text-foreground">Cache TTL (Seconds)</Label>
          </div>
          <Input
            type="number"
            min={1}
            max={86400}
            disabled={!cacheEnabled}
            value={cacheTtlSeconds}
            onChange={(e) => setCacheTtlSeconds(Number(e.target.value))}
            className="w-full font-mono text-xs"
          />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Time period before cached inputs expire. Minimum 1s, maximum 24h.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
            <Label className="text-xs font-bold text-foreground">Cache-Hit Discount (%)</Label>
          </div>
          <Input
            type="number"
            min={0}
            max={100}
            disabled={!cacheEnabled}
            value={cacheHitDiscountPercent}
            onChange={(e) => setCacheHitDiscountPercent(Number(e.target.value))}
            className="w-full font-mono text-xs"
          />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Discount percentage applied to prediction requests served from cache.
          </p>
        </div>
      </div>

      {/* Live Metrics Grid */}
      <div className="bg-secondary/20 border border-border/60 rounded-xl p-4.5 space-y-3">
        <div className="flex items-center justify-between select-none">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground font-mono">Live Edge Stats</span>
          </div>
          <button
            onClick={loadStats}
            className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground font-mono transition-colors cursor-pointer"
            title="Refresh stats"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          {/* Card 1: Hits */}
          <div className="bg-background/40 border border-border/50 rounded-lg p-2.5 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-muted-foreground font-mono uppercase">Hits</span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {stats?.hits ?? 0}
            </span>
          </div>

          {/* Card 2: Misses */}
          <div className="bg-background/40 border border-border/50 rounded-lg p-2.5 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-muted-foreground font-mono uppercase">Misses</span>
            <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-1 font-mono">
              {stats?.misses ?? 0}
            </span>
          </div>

          {/* Card 3: Hit Rate */}
          <div className="bg-background/40 border border-border/50 rounded-lg p-2.5 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-muted-foreground font-mono uppercase">Hit Rate</span>
            <span className="text-base font-extrabold text-primary mt-1 font-mono">
              {stats ? `${stats.hitRatePercent}%` : "0%"}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="flex justify-end pt-1">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="font-bold text-xs cursor-pointer px-5"
        >
          {saving ? "Saving..." : "Save Cache Settings"}
        </Button>
      </div>
    </div>
  );
}
