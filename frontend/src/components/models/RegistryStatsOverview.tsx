import React from "react";

interface RegistryStatsOverviewProps {
  totalModels: number;
  productionReadyCount: number;
  buildingCount: number;
  failedCount: number;
}

/**
 * Displays status indicator cards for the Model Registry page.
 * Displays counts of total, ready/deployed, building, and failed models.
 *
 * @param props - RegistryStatsOverview component properties.
 * @returns The React component rendering the statistics dashboard grids.
 */
export function RegistryStatsOverview({
  totalModels,
  productionReadyCount,
  buildingCount,
  failedCount,
}: RegistryStatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 font-mono">
      {/* Total Models */}
      <div className="border border-border rounded-xl bg-card p-5 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <span className="font-bold text-lg select-none">⌬</span>
          </div>
          <span className="badge badge-success text-[10px] select-none">
            +12%
          </span>
        </div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Models</p>
        <h2 className="text-2xl font-extrabold text-foreground">{totalModels}</h2>
      </div>

      {/* Production Ready */}
      <div className="border border-border rounded-xl bg-card p-5 shadow-sm">
        <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-600 border border-emerald-500/10 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/20 flex items-center justify-center mb-2">
          <span className="font-bold select-none">✓</span>
        </div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Production Ready</p>
        <h2 className="text-2xl font-extrabold text-foreground">{productionReadyCount}</h2>
      </div>

      {/* Building */}
      <div className="border border-border rounded-xl bg-card p-5 shadow-sm">
        <div className="w-8 h-8 rounded bg-amber-50 text-amber-600 border border-amber-500/10 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-500/20 flex items-center justify-center mb-2">
          <span className="font-bold select-none animate-pulse">...</span>
        </div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Building</p>
        <h2 className="text-2xl font-extrabold text-foreground">{buildingCount}</h2>
      </div>

      {/* Failed Runs */}
      <div className="border border-border rounded-xl bg-card p-5 shadow-sm">
        <div className="w-8 h-8 rounded bg-red-50 text-red-600 border border-red-500/10 dark:bg-red-950/40 dark:text-red-400 dark:border-red-500/20 flex items-center justify-center mb-2">
          <span className="font-bold select-none">!</span>
        </div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Failed Runs</p>
        <h2 className="text-2xl font-extrabold text-foreground">{failedCount}</h2>
      </div>
    </div>
  );
}
