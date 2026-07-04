import { Progress } from "@/components/ui/progress";

interface AdminUtilizationBarProps {
  /** Label for the utilization row. */
  label: string;
  /** Used count. */
  used: number;
  /** Effective limit or null for unlimited. */
  limit: number | null;
}

/**
 * Progress representation for provider utilization metrics.
 *
 * @param props - Component props.
 * @returns Utilization row with progress bar.
 */
export function AdminUtilizationBar({
  label,
  used,
  limit,
}: AdminUtilizationBarProps) {
  const percent = limit && limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {used} / {limit ?? "Unlimited"}
        </span>
      </div>
      {limit ? <Progress value={percent} className="h-2" /> : null}
    </div>
  );
}
