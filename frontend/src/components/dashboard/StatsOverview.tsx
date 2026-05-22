import React from "react";
import { Activity, ArrowUpRight } from "lucide-react";

interface StatsOverviewProps {
  totalModels: number;
  activeDeploymentsCount: number;
}

/**
 * Renders the dashboard metrics summary including total models count,
 * active deployment counts, and latency average telemetry.
 *
 * @param props - Component properties for StatsOverview.
 * @returns The React component rendering the statistics grid.
 */
export function StatsOverview({ totalModels, activeDeploymentsCount }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Models */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <LayersIcon />
          </div>
          <span className="badge badge-success bg-emerald-50 text-emerald-600 border-none flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> +{totalModels}
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Models</p>
        <h2 className="text-3xl font-bold text-slate-900">{totalModels}</h2>
      </div>

      {/* Active Deployments */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> LIVE MONITOR
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Deployments</p>
        <h2 className="text-3xl font-bold text-slate-900">{activeDeploymentsCount}</h2>
      </div>

      {/* Latency Average */}
      <div className="card bg-slate-900 text-white border-none relative overflow-hidden">
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1 relative z-10">Latency Average</p>
        <h2 className="text-4xl font-bold text-white mb-1 relative z-10">42ms</h2>
        <p className="text-xs text-slate-400 relative z-10">Global p95 metrics</p>
        <div className="mt-4 flex items-end gap-1.5 h-10 relative z-10">
          {[40, 30, 45, 25, 50, 35, 60].map((h, i) => (
            <div key={i} className="flex-1 bg-indigo-500 rounded-t-sm opacity-80" style={{ height: `${h}%` }}></div>
          ))}
        </div>
      </div>
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
