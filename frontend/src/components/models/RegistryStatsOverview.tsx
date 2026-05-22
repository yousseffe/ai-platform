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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Models */}
      <div className="card">
        <div className="flex justify-between items-start mb-2">
          <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
            <span className="font-bold text-lg">⌬</span>
          </div>
          <span className="badge badge-success bg-emerald-50 text-emerald-600 border-none">+12%</span>
        </div>
        <p className="text-sm font-semibold text-slate-500 mb-1">Total Models</p>
        <h2 className="text-2xl font-bold text-slate-900">{totalModels}</h2>
      </div>

      {/* Production Ready */}
      <div className="card">
        <div className="w-8 h-8 rounded bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2">
          <span className="font-bold">✓</span>
        </div>
        <p className="text-sm font-semibold text-slate-500 mb-1">Production Ready</p>
        <h2 className="text-2xl font-bold text-slate-900">{productionReadyCount}</h2>
      </div>

      {/* Building */}
      <div className="card">
        <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center text-amber-600 mb-2">
          <span className="font-bold">...</span>
        </div>
        <p className="text-sm font-semibold text-slate-500 mb-1">Building</p>
        <h2 className="text-2xl font-bold text-slate-900">{buildingCount}</h2>
      </div>

      {/* Failed Runs */}
      <div className="card">
        <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center text-red-600 mb-2">
          <span className="font-bold">!</span>
        </div>
        <p className="text-sm font-semibold text-slate-500 mb-1">Failed Runs</p>
        <h2 className="text-2xl font-bold text-slate-900">{failedCount}</h2>
      </div>
    </div>
  );
}
