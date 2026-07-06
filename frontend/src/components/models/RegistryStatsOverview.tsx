import React from "react";
import { Boxes, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Model, VersionStatus, DeploymentStatus } from "@/types";

interface RegistryStatsOverviewProps {
  models: Model[];
}

export function RegistryStatsOverview({ models }: RegistryStatsOverviewProps) {
  
  // Calculate real statuses from the backend data
  const getLatestStatus = (m: Model) => {
    const versions = m.versions || [];
    if (!versions.length) return "Draft";
    const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
    const latest = sorted[0];
    if (latest.status === VersionStatus.READY) {
      const activeDeployment = latest.deployments?.find(d => d.status === DeploymentStatus.RUNNING);
      if (activeDeployment) return "Deployed";
      return "Ready";
    }
    return latest.status;
  };

  const total = models.length;
  const productionReady = models.filter((m) => {
    const s = getLatestStatus(m);
    return s === "Ready" || s === "Deployed";
  }).length;
  const building = models.filter((m) => getLatestStatus(m) === VersionStatus.BUILDING).length;
  const failed = models.filter((m) => getLatestStatus(m) === VersionStatus.FAILED).length;

  // Percentage calculation
  const productionPercentage = total > 0 ? Math.round((productionReady / total) * 100) : 0;

  // Create timeline for the last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Calculate cumulative trend of total models
  const totalTrend = last7Days.map(day => {
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);
    return models.filter(m => new Date(m.createdAt) <= endOfDay).length;
  });

  // Calculate cumulative trend of production ready models
  const readyModelsList = models.filter((m) => {
    const s = getLatestStatus(m);
    return s === "Ready" || s === "Deployed";
  });
  const readyTrend = last7Days.map(day => {
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);
    return readyModelsList.filter(m => new Date(m.updatedAt || m.createdAt) <= endOfDay).length;
  });

  // Calculate active building trend (daily activity)
  const buildingModelsList = models.filter((m) => getLatestStatus(m) === VersionStatus.BUILDING);
  const buildingTrend = last7Days.map(day => {
    const startOfDay = new Date(day);
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);
    return buildingModelsList.filter(m => {
      const date = new Date(m.updatedAt || m.createdAt);
      return date >= startOfDay && date <= endOfDay;
    }).length;
  });

  // Calculate daily failures trend in the last 7 days
  const failedTrend = last7Days.map(day => {
    const startOfDay = new Date(day);
    const endOfDay = new Date(day);
    endOfDay.setHours(23, 59, 59, 999);
    let count = 0;
    models.forEach(m => {
      (m.versions || []).forEach(v => {
        if (v.status === VersionStatus.FAILED) {
          const date = new Date(v.updatedAt || v.createdAt);
          if (date >= startOfDay && date <= endOfDay) {
            count++;
          }
        }
      });
    });
    return count;
  });

  // Dynamic SVG path generator
  const generateSparklinePath = (trend: number[]) => {
    const min = Math.min(...trend);
    const max = Math.max(...trend);
    const range = max - min;
    
    const points = trend.map((val, idx) => {
      const x = (idx / (trend.length - 1)) * 100;
      // Map Y from 5 (top) to 25 (bottom) to fit inside 30px height box
      const y = range === 0 ? 15 : 25 - ((val - min) / range) * 20;
      return { x, y };
    });
    
    return `M${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L")}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 select-none font-sans">
      
      {/* 1. Total Models */}
      <div className="bg-card/45 border border-border/80 p-4.5 rounded-2xl flex items-center justify-between shadow-2xs text-left">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <Boxes className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono">Total Models</span>
          </div>
          <div className="text-3xl font-black text-foreground tracking-tight leading-none pt-0.5">{total}</div>
          <div className="text-[9.5px] text-muted-foreground/80 font-medium font-mono">All time</div>
        </div>
        <div className="shrink-0 pl-4">
          <svg className="w-16 h-8 text-primary/80" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d={generateSparklinePath(totalTrend)} />
          </svg>
        </div>
      </div>

      {/* 2. Production Ready */}
      <div className="bg-card/45 border border-border/80 p-4.5 rounded-2xl flex items-center justify-between shadow-2xs text-left">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono">Production Ready</span>
          </div>
          <div className="text-3xl font-black text-foreground tracking-tight leading-none pt-0.5">{productionReady}</div>
          <div className="text-[9.5px] text-muted-foreground/80 font-medium font-mono">{productionPercentage}% of total</div>
        </div>
        <div className="shrink-0 pl-4">
          <svg className="w-16 h-8 text-emerald-500/80" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d={generateSparklinePath(readyTrend)} />
          </svg>
        </div>
      </div>

      {/* 3. Building */}
      <div className="bg-card/45 border border-border/80 p-4.5 rounded-2xl flex items-center justify-between shadow-2xs text-left">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono">Building</span>
          </div>
          <div className="text-3xl font-black text-foreground tracking-tight leading-none pt-0.5">{building}</div>
          <div className="text-[9.5px] text-muted-foreground/80 font-medium font-mono">In progress</div>
        </div>
        <div className="shrink-0 pl-4">
          <svg className="w-16 h-8 text-amber-500/80" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d={generateSparklinePath(buildingTrend)} />
          </svg>
        </div>
      </div>

      {/* 4. Failed Runs */}
      <div className="bg-card/45 border border-border/80 p-4.5 rounded-2xl flex items-center justify-between shadow-2xs text-left">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 shrink-0">
              <XCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono">Failed Runs</span>
          </div>
          <div className="text-3xl font-black text-foreground tracking-tight leading-none pt-0.5">{failed}</div>
          <div className="text-[9.5px] text-muted-foreground/80 font-medium font-mono">Last 7 days</div>
        </div>
        <div className="shrink-0 pl-4">
          <svg className="w-16 h-8 text-red-500/80" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d={generateSparklinePath(failedTrend)} />
          </svg>
        </div>
      </div>

    </div>
  );
}
