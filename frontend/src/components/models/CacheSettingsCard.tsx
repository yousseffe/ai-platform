"use client";

import React, { useEffect, useState } from "react";
import { Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
 * Owner-facing settings card for a model's response cache policy. Lets the
 * provider enable exact-match prediction caching, tune the TTL and cache-hit
 * discount, and see live hit/miss counters for the deployed model.
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-primary font-bold text-sm select-none">
          <Zap className="w-5 h-5" />
          <div>
            <h3 className="font-sans font-bold text-sm text-foreground">
              Response Cache
            </h3>
            <p className="text-muted-foreground text-[11px] font-sans font-normal mt-0.5">
              Serve identical prediction requests from cache instead of
              re-invoking the container.
            </p>
          </div>
        </div>
        <button
          onClick={() => setCacheEnabled((prev) => !prev)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono border cursor-pointer transition-colors ${
            cacheEnabled
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-secondary border-border text-muted-foreground"
          }`}
        >
          {cacheEnabled ? "ENABLED" : "DISABLED"}
        </button>
      </div>

      <div className="w-full h-px bg-border" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
            Cache TTL (seconds)
          </label>
          <Input
            type="number"
            min={1}
            max={86400}
            value={cacheTtlSeconds}
            onChange={(e) => setCacheTtlSeconds(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
            Cache-hit discount (%)
          </label>
          <Input
            type="number"
            min={0}
            max={100}
            value={cacheHitDiscountPercent}
            onChange={(e) =>
              setCacheHitDiscountPercent(Number(e.target.value))
            }
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-muted-foreground">
            Hits:{" "}
            <span className="text-foreground font-bold">
              {stats?.hits ?? "—"}
            </span>
          </span>
          <span className="text-muted-foreground">
            Misses:{" "}
            <span className="text-foreground font-bold">
              {stats?.misses ?? "—"}
            </span>
          </span>
          <span className="text-muted-foreground">
            Hit rate:{" "}
            <span className="text-foreground font-bold">
              {stats ? `${stats.hitRatePercent}%` : "—"}
            </span>
          </span>
          <button
            onClick={loadStats}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
            title="Refresh stats"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="font-bold text-xs cursor-pointer"
        >
          {saving ? "Saving..." : "Save Cache Settings"}
        </Button>
      </div>
    </div>
  );
}
