import React from "react";
import { Activity, ArrowUpRight, Layers } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

interface StatsOverviewProps {
  totalModels: number;
  activeDeploymentsCount: number;
}

/**
 * Renders the dashboard metrics summary using Shadcn UI components.
 * Consists of total models count, active deployments count, and latency average telemetry.
 *
 * @param props - Component properties containing statistics counts.
 * @returns The React component rendering the statistics grid.
 */
export function StatsOverview({ totalModels, activeDeploymentsCount }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Total Models */}
      <Card className="border border-border bg-card p-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <span className="badge badge-success flex items-center gap-0.5 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3" /> +{totalModels}
            </span>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 font-mono">Total Models</p>
          <CardTitle className="text-3xl font-extrabold text-foreground border-none p-0 h-auto font-mono">{totalModels}</CardTitle>
        </CardContent>
      </Card>

      {/* Active Deployments */}
      <Card className="border border-border bg-card p-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-650 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/10 dark:border-emerald-500/25">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 font-mono select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live Monitor
            </span>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 font-mono">Active Deployments</p>
          <CardTitle className="text-3xl font-extrabold text-foreground border-none p-0 h-auto font-mono">{activeDeploymentsCount}</CardTitle>
        </CardContent>
      </Card>

      {/* Latency Average */}
      <Card className="bg-card border border-border p-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 font-mono">Latency Average</p>
              <CardTitle className="text-3xl font-extrabold text-foreground border-none p-0 h-auto font-mono">42ms</CardTitle>
            </div>
            <span className="text-[9px] text-muted-foreground font-mono bg-muted border border-border px-2 py-0.5 rounded uppercase tracking-wider select-none mt-0.5">
              p95 latency
            </span>
          </div>
          <div className="mt-4 flex items-end gap-1.5 h-10 select-none">
            {[40, 30, 45, 25, 50, 35, 60, 40, 30, 45, 50, 35, 42].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/20 hover:bg-primary rounded-t-sm transition-all duration-200 cursor-pointer"
                style={{ height: `${h}%` }}
                title={`p95 latency: ${h + 10}ms`}
              ></div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
