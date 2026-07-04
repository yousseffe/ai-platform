import { AdminEmptyState } from "@/components/admin/common/AdminEmptyState";
import { AdminMoney } from "@/components/admin/common/AdminMoney";
import { AdminPageHeader } from "@/components/admin/common/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/common/AdminStatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminDashboardOverview } from "@/lib/services/admin-dashboard.service";

/**
 * Professional overview page for the new admin control center.
 *
 * @returns The admin dashboard overview page.
 */
export default async function AdminDashboardOverviewPage() {
  const overview = await getAdminDashboardOverview();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Business Operations Dashboard"
        description="High-level KPIs for platform growth, provider health, models, revenue, and transaction activity."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overview.cards.map((card) => (
          <AdminStatCard key={card.key} card={card} />
        ))}
      </div>

      <Card className="rounded-2xl border-border">
        <CardHeader>
          <CardTitle className="text-base">Top Providers By Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.topProviders.length === 0 ? (
            <AdminEmptyState
              title="No provider revenue yet"
              description="Top-performing providers will appear here as the marketplace generates earnings."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Public Models</TableHead>
                  <TableHead>Total Earnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.topProviders.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium text-foreground">
                      {provider.name}
                    </TableCell>
                    <TableCell>{provider.tierName}</TableCell>
                    <TableCell>{provider.publicModels}</TableCell>
                    <TableCell>
                      <AdminMoney amount={provider.totalEarnings} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
