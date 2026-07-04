import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminProviderDetailsResponse } from "@/types";
import { AdminDate } from "@/components/admin/common/AdminDate";
import { AdminMoney } from "@/components/admin/common/AdminMoney";
import { AdminEmptyState } from "@/components/admin/common/AdminEmptyState";

interface ProviderActivityPanelsProps {
  /** Detailed provider payload. */
  provider: AdminProviderDetailsResponse;
}

/**
 * Recent model, transaction, and audit sections for provider details.
 *
 * @param props - Component props.
 * @returns Activity panels.
 */
export function ProviderActivityPanels({
  provider,
}: ProviderActivityPanelsProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="rounded-2xl border-border xl:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Models Panel</CardTitle>
        </CardHeader>
        <CardContent>
          {provider.models.length === 0 ? (
            <AdminEmptyState
              title="No models yet"
              description="This provider has not published any models so far."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Last Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {provider.models.slice(0, 8).map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>{model.type}</TableCell>
                    <TableCell>{model.totalRequests.toLocaleString("en-US")}</TableCell>
                    <TableCell><AdminMoney amount={model.revenueGeneratedEgp} /></TableCell>
                    <TableCell><AdminDate value={model.lastUsedAt} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {provider.recentTransactions.length === 0 ? (
            <AdminEmptyState
              title="No payments recorded"
              description="Subscription and ledger records will appear here."
            />
          ) : (
            provider.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-foreground">
                    {transaction.type}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    <AdminMoney amount={transaction.amount} />
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{transaction.source}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  <AdminDate value={transaction.createdAt} />
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border xl:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Audit Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {provider.auditLog.length === 0 ? (
            <AdminEmptyState
              title="No audit events yet"
              description="Audited provider actions will appear here."
            />
          ) : (
            provider.auditLog.map((event) => (
              <div key={event.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{event.action}</p>
                    <p className="text-xs text-muted-foreground">
                      Actor: {event.actorAdminId}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <AdminDate value={event.createdAt} />
                  </div>
                </div>
                {event.reason ? (
                  <p className="mt-3 text-sm text-foreground">{event.reason}</p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
