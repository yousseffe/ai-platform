import React from "react";
import { Boxes, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

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
      <StatCard icon={<Boxes />} label="Total Models" value={totalModels} tone="primary" />
      <StatCard icon={<CheckCircle2 />} label="Production Ready" value={productionReadyCount} tone="success" />
      <StatCard icon={<Loader2 className="animate-spin" />} label="Building" value={buildingCount} tone="warning" />
      <StatCard icon={<XCircle />} label="Failed Runs" value={failedCount} tone="danger" />
    </div>
  );
}
