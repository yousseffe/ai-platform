import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AdminMetricCard } from "@/types";
import { AdminMoney } from "./AdminMoney";
import { AdminTrendBadge } from "./AdminTrendBadge";

interface AdminStatCardProps {
  /** KPI card payload. */
  card: AdminMetricCard;
}

/**
 * Professional KPI card used on the new admin overview page.
 *
 * @param props - Component props.
 * @returns KPI card element.
 */
export function AdminStatCard({ card }: AdminStatCardProps) {
  return (
    <Link href={card.href} className="block">
      <Card className="h-full rounded-2xl border-border transition-colors hover:border-primary/30">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {card.label}
              </p>
              <div className="text-2xl font-bold text-foreground">
                {card.format === "currency" ? (
                  <AdminMoney amount={card.value} />
                ) : (
                  card.value.toLocaleString("en-US")
                )}
              </div>
            </div>
            <AdminTrendBadge
              trend={card.trend}
              changePercent={card.changePercent}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Previous period:{" "}
            <span className="font-medium text-foreground">
              {card.format === "currency" ? (
                <AdminMoney amount={card.previousValue} />
              ) : (
                card.previousValue.toLocaleString("en-US")
              )}
            </span>
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
