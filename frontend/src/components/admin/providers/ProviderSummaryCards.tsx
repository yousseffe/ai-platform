import { Card, CardContent } from "@/components/ui/card";
import { AdminProviderDetailsResponse } from "@/types";
import { AdminMoney } from "@/components/admin/common/AdminMoney";

interface ProviderSummaryCardsProps {
  /** Detailed provider payload. */
  provider: AdminProviderDetailsResponse;
}

/**
 * Compact summary cards for the provider details page.
 *
 * @param props - Component props.
 * @returns Provider summary cards.
 */
export function ProviderSummaryCards({
  provider,
}: ProviderSummaryCardsProps) {
  const items = [
    { label: "Wallet Balance", value: <AdminMoney amount={provider.walletBalanceEgp} /> },
    { label: "Provider Earnings", value: <AdminMoney amount={provider.totalEarningsEgp} /> },
    { label: "Platform Commission", value: <AdminMoney amount={provider.platformCommissionEgp} /> },
    { label: "Inference Requests", value: provider.totalInferenceRequests.toLocaleString("en-US") },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="rounded-2xl border-border">
          <CardContent className="space-y-1 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {item.label}
            </p>
            <div className="text-xl font-bold text-foreground">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
