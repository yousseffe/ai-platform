import { TrendingDown, Minus, TrendingUp } from "lucide-react";
import { AdminMetricTrend } from "@/types";

interface AdminTrendBadgeProps {
  /** Trend direction. */
  trend: AdminMetricTrend;
  /** Percent change versus previous period. */
  changePercent: number | null;
}

/**
 * Renders a consistent trend indicator for admin KPI cards.
 *
 * @param props - Component props.
 * @returns Trend badge element.
 */
export function AdminTrendBadge({
  trend,
  changePercent,
}: AdminTrendBadgeProps) {
  const icon =
    trend === "up" ? (
      <TrendingUp className="h-3.5 w-3.5" />
    ) : trend === "down" ? (
      <TrendingDown className="h-3.5 w-3.5" />
    ) : (
      <Minus className="h-3.5 w-3.5" />
    );
  const colorClass =
    trend === "up"
      ? "text-emerald-600 bg-emerald-500/10"
      : trend === "down"
        ? "text-rose-600 bg-rose-500/10"
        : "text-muted-foreground bg-muted";
  const label =
    changePercent === null
      ? "New signal"
      : `${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${colorClass}`}
    >
      {icon}
      {label}
    </span>
  );
}
