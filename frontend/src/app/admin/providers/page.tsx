import Link from "next/link";
import { AdminDate } from "@/components/admin/common/AdminDate";
import { AdminMoney } from "@/components/admin/common/AdminMoney";
import { AdminPageHeader } from "@/components/admin/common/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/common/AdminStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminProviders } from "@/lib/services/admin-providers.service";

interface AdminProvidersPageProps {
  /** Next.js search params promise. */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Provider management list page for the new admin dashboard.
 *
 * @param props - Page props.
 * @returns The providers list page.
 */
export default async function AdminProvidersPage({
  searchParams,
}: AdminProvidersPageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const search = typeof params.search === "string" ? params.search : undefined;
  const providerStatus =
    typeof params.providerStatus === "string" ? params.providerStatus : undefined;
  const ownerType =
    typeof params.ownerType === "string" ? params.ownerType : undefined;
  const hasActiveSubscription = params.hasActiveSubscription === "true";
  const response = await getAdminProviders({
    page,
    search,
    providerStatus,
    ownerType,
    hasActiveSubscription,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Provider Management"
        description="Track provider subscriptions, balances, earnings, tier allocation, and marketplace production."
      />

      <Card className="rounded-2xl border-border">
        <CardContent className="space-y-4 p-5">
          <form className="grid gap-3 md:grid-cols-4">
            <input
              name="search"
              defaultValue={search ?? ""}
              placeholder="Search provider or email"
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            />
            <select
              name="providerStatus"
              defaultValue={providerStatus ?? ""}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="PENDING">Pending</option>
            </select>
            <select
              name="ownerType"
              defaultValue={ownerType ?? ""}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="">All owners</option>
              <option value="USER">User</option>
              <option value="ORG">Organization</option>
            </select>
            <Button type="submit" className="h-10 rounded-xl">
              Apply Filters
            </Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>Models</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {response.data.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell>
                    <Link
                      href={`/admin/providers/${provider.id}`}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {provider.providerName}
                    </Link>
                  </TableCell>
                  <TableCell className="space-y-1">
                    <div><AdminStatusBadge value={provider.owner.ownerType} /></div>
                    <div className="text-xs text-muted-foreground">
                      {provider.owner.ownerEmail ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell>{provider.currentTier}</TableCell>
                  <TableCell className="space-y-1">
                    <div><AdminStatusBadge value={provider.subscription.status} /></div>
                    <div><AdminStatusBadge value={provider.providerStatus} /></div>
                  </TableCell>
                  <TableCell><AdminMoney amount={provider.walletBalanceEgp} /></TableCell>
                  <TableCell><AdminMoney amount={provider.totalEarningsEgp} /></TableCell>
                  <TableCell>{provider.totalModels}</TableCell>
                  <TableCell><AdminDate value={provider.createdAt} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
            <span>
              Page {response.meta.page} of {response.meta.totalPages} · {response.meta.total} providers
            </span>
            <div className="flex gap-2">
              <Link
                href={`/admin/providers?page=${Math.max(response.meta.page - 1, 1)}`}
                className={`rounded-lg border px-3 py-1.5 ${
                  response.meta.page === 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Previous
              </Link>
              <Link
                href={`/admin/providers?page=${Math.min(response.meta.page + 1, response.meta.totalPages)}`}
                className={`rounded-lg border px-3 py-1.5 ${
                  response.meta.page >= response.meta.totalPages
                    ? "pointer-events-none opacity-40"
                    : ""
                }`}
              >
                Next
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
