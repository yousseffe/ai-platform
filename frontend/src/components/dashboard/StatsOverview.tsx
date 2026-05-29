import React from "react";
import { Activity, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Models */}
      <Card className="border border-slate-200 shadow-sm p-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <LayersIcon />
            </div>
            <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-none flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3" /> +{totalModels}
            </Badge>
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Models</p>
          <CardTitle className="text-3xl font-bold text-slate-900 border-none p-0 h-auto">{totalModels}</CardTitle>
        </CardContent>
      </Card>

      {/* Active Deployments */}
      <Card className="border border-slate-200 shadow-sm p-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> LIVE MONITOR
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Deployments</p>
          <CardTitle className="text-3xl font-bold text-slate-900 border-none p-0 h-auto">{activeDeploymentsCount}</CardTitle>
        </CardContent>
      </Card>

      {/* Latency Average */}
      <Card className="bg-slate-900 text-white border-none relative overflow-hidden p-0 shadow-sm">
        <CardContent className="p-6">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1 relative z-10">Latency Average</p>
          <CardTitle className="text-4xl font-bold text-white mb-1 relative z-10 border-none p-0 h-auto">42ms</CardTitle>
          <p className="text-xs text-slate-400 relative z-10">Global p95 metrics</p>
          <div className="mt-4 flex items-end gap-1.5 h-10 relative z-10">
            {[40, 30, 45, 25, 50, 35, 60].map((h, i) => (
              <div key={i} className="flex-1 bg-indigo-500 rounded-t-sm opacity-80" style={{ height: `${h}%` }}></div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Inner component rendering the SVG Layers icon.
 */
const LayersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 12 12 17 22 12" />
    <polyline points="2 17 12 22 22 17" />
  </svg>
);
