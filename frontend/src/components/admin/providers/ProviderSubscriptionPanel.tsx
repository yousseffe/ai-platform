import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminProviderDetailsResponse } from "@/types";
import { AdminDate } from "@/components/admin/common/AdminDate";
import { AdminMoney } from "@/components/admin/common/AdminMoney";
import { AdminStatusBadge } from "@/components/admin/common/AdminStatusBadge";

interface ProviderSubscriptionPanelProps {
  /** Detailed provider payload. */
  provider: AdminProviderDetailsResponse;
}

/**
 * Subscription snapshot panel for the provider details page.
 *
 * @param props - Component props.
 * @returns Subscription summary card.
 */
export function ProviderSubscriptionPanel({
  provider,
}: ProviderSubscriptionPanelProps) {
  const rows = [
    {
      label: "Current Tier",
      value: provider.currentTier,
    },
    {
      label: "Subscription Status",
      value: <AdminStatusBadge value={provider.subscription.status} />,
    },
    {
      label: "Billing Cycle",
      value: provider.subscription.billingCycle ?? "—",
    },
    {
      label: "Last Payment",
      value: <AdminDate value={provider.subscription.lastPaymentDate} />,
    },
    {
      label: "Next Renewal",
      value: <AdminDate value={provider.subscription.nextRenewalDate} />,
    },
    {
      label: "Last Payment Amount",
      value:
        provider.subscription.lastPaymentAmountEgp !== null ? (
          <AdminMoney amount={provider.subscription.lastPaymentAmountEgp} />
        ) : (
          "—"
        ),
    },
  ] as const;

  return (
    <Card className="rounded-2xl border-border">
      <CardHeader>
        <CardTitle className="text-base">Subscription Panel</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {label}
            </p>
            <div className="text-sm font-medium text-foreground">{value}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
