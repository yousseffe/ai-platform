import React from "react";
import { Model } from "@/types";
import { Activity, Coins, Layers } from "lucide-react";

interface UsageMetricsCardProps {
  model: Model;
}

/**
 * Renders dynamic stats for a model, including cost, versions, and deployment status.
 *
 * @param props - The component properties.
 * @param props.model - The Model object details.
 * @returns The React component displaying model stats.
 */
export function UsageMetricsCard({ model }: UsageMetricsCardProps) {
  const versions = model.versions || [];
  const liveVersion = versions.find(v => v.deployments?.some(d => d.status === "running"));

  return (
    <div className="w-full font-sans text-xs">
      <div className="card h-full space-y-4">
        <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5 border-b border-border pb-3">
          <Activity className="w-4 h-4 text-primary" /> Model Stats
        </h3>
        
        <div className="space-y-3.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-muted-foreground" /> Cost / Request
            </span>
            <span className="text-foreground font-semibold font-mono bg-secondary px-2 py-0.5 rounded border border-border">
              ${(() => {
                const costVal = typeof model.costPerRequest === "string" ? parseFloat(model.costPerRequest) : model.costPerRequest;
                return typeof costVal === "number" && !isNaN(costVal) ? costVal.toFixed(4) : "0.0000";
              })()}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-muted-foreground" /> Version Releases
            </span>
            <span className="text-foreground font-semibold font-mono bg-secondary px-2 py-0.5 rounded border border-border">
              {versions.length} {versions.length === 1 ? "release" : "releases"}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Status</span>
            {liveVersion ? (
              <span className="badge badge-success font-mono text-[10px]">
                <span className="badge-dot animate-pulse" />
                Live sandbox
              </span>
            ) : (
              <span className="badge badge-neutral font-mono text-[10px]">
                inactive
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
