import Link from "next/link";
import {
  Users,
  BriefcaseBusiness,
  SlidersHorizontal,
  ChevronRight,
  Activity,
  DollarSign,
  Wallet,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building,
  User
} from "lucide-react";
import { AdminDate } from "@/components/admin/common/AdminDate";
import { AdminMoney } from "@/components/admin/common/AdminMoney";
import { AdminPageHeader } from "@/components/admin/common/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/common/AdminStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminProviders } from "@/lib/services/admin-providers.service";

interface AdminProvidersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

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

  // Calculate high-level stats for widgets based on data
  const totalBalance = response.data.reduce((sum, p) => sum + (p.walletBalanceEgp || 0), 0);
  const totalEarnings = response.data.reduce((sum, p) => sum + (p.totalEarningsEgp || 0), 0);
  const activeCount = response.data.filter(p => p.providerStatus === "ACTIVE").length;

  return (
    <div className="space-y-6 relative animate-fade-in pb-12 font-sans text-left">
      {/* Decorative background glows */}
      <div className="glow-spot" />
      <div className="glow-spot-secondary" />

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-5 gap-4 relative z-10">
        <div className="text-left space-y-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            Providers Directory
          </h1>
          <p className="text-xs text-muted-foreground">
            Track provider subscriptions, credit balances, total platform earnings, and active model registries.
          </p>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
        <div className="border border-border/80 bg-card/65 rounded-2xl p-4 shadow-xs backdrop-blur-md hover-lift transition-all duration-300">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Providers</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-foreground">{response.meta.total}</span>
            <span className="text-[9px] text-muted-foreground">Registered tenants</span>
          </div>
        </div>
        <div className="border border-border/80 bg-card/65 rounded-2xl p-4 shadow-xs backdrop-blur-md hover-lift transition-all duration-300">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Active Status</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-emerald-500">{activeCount}</span>
            <span className="text-[9px] text-muted-foreground">Operating normally</span>
          </div>
        </div>
        <div className="border border-border/80 bg-card/65 rounded-2xl p-4 shadow-xs backdrop-blur-md hover-lift transition-all duration-300">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Escrow Balances</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-indigo-500">
              <AdminMoney amount={totalBalance} />
            </span>
            <span className="text-[9px] text-muted-foreground">Wallet totals</span>
          </div>
        </div>
        <div className="border border-border/80 bg-card/65 rounded-2xl p-4 shadow-xs backdrop-blur-md hover-lift transition-all duration-300">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Accrued Volume</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-primary">
              <AdminMoney amount={totalEarnings} />
            </span>
            <span className="text-[9px] text-muted-foreground">Gross earnings</span>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl relative z-10 hover-lift transition-all duration-300">
        <CardContent className="space-y-4 p-5">
          <form method="GET" action="/admin/providers" className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                name="search"
                defaultValue={search ?? ""}
                placeholder="Search provider or email..."
                className="h-10 pl-10 pr-3 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-hidden focus:border-primary transition-all font-sans"
              />
            </div>
            <select
              name="providerStatus"
              defaultValue={providerStatus ?? ""}
              className="h-10 rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:border-primary transition-all cursor-pointer font-sans"
            >
              <option value="">All operating statuses</option>
              <option value="ACTIVE">Active Status</option>
              <option value="SUSPENDED">Suspended Status</option>
              <option value="PENDING">Pending Status</option>
            </select>
            <select
              name="ownerType"
              defaultValue={ownerType ?? ""}
              className="h-10 rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-hidden focus:border-primary transition-all cursor-pointer font-sans"
            >
              <option value="">All entity owners</option>
              <option value="USER">Individual Users</option>
              <option value="ORG">Organizations</option>
            </select>
            <Button type="submit" className="h-10 rounded-xl cursor-pointer btn-primary text-xs font-bold font-sans flex items-center justify-center gap-1.5 hover-lift shadow-xs">
              <Filter className="w-3.5 h-3.5" />
              <span>Apply Filters</span>
            </Button>
          </form>

          {/* Providers Ledger Grid */}
          <div className="overflow-hidden border border-border/80 rounded-2xl">
            <Table className="w-full border-collapse">
              <TableHeader>
                <TableRow className="bg-muted/20 border-b border-border/80">
                  <TableHead className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto py-3">Provider Name</TableHead>
                  <TableHead className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto py-3">Owner Entity</TableHead>
                  <TableHead className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto py-3">Plan Tier</TableHead>
                  <TableHead className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto py-3">Subscription</TableHead>
                  <TableHead className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto py-3">Escrow Balance</TableHead>
                  <TableHead className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto py-3">Accrued Earns</TableHead>
                  <TableHead className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto py-3">Models Registry</TableHead>
                  <TableHead className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto py-3">Joined Date</TableHead>
                  <TableHead className="w-[50px] py-3"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60 text-xs font-sans">
                {response.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                      No workspace provider accounts match current filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  response.data.map((provider) => {
                    const initials = provider.providerName
                      ? provider.providerName.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
                      : "P";
                    return (
                      <TableRow key={provider.id} className="hover:bg-muted/25 transition-all">
                        <TableCell className="py-3.5 text-left">
                          <Link
                            href={`/admin/providers/${provider.id}`}
                            className="flex items-center gap-3 group"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                              {initials}
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="font-bold text-foreground group-hover:text-primary transition-colors text-xs">
                                {provider.providerName}
                              </span>
                              <span className="text-[9px] text-muted-foreground mt-0.5 font-mono select-all">
                                ID: {provider.id}
                              </span>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="space-y-1 py-3.5 text-left">
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-secondary/80 border border-border/80 text-foreground">
                            {provider.owner.ownerType === "ORG" ? <Building className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                            <span>{provider.owner.ownerType}</span>
                          </div>
                          <div className="text-[9px] text-muted-foreground select-all">
                            {provider.owner.ownerEmail ?? "—"}
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 text-left font-semibold">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                            {provider.currentTier}
                          </span>
                        </TableCell>
                        <TableCell className="space-y-1 py-3.5 text-left">
                          <div className="flex flex-wrap gap-1">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                              provider.subscription.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                                : "bg-red-500/10 text-red-500 border-red-500/25"
                            }`}>
                              <span className={`h-1 w-1 rounded-full ${provider.subscription.status === "ACTIVE" ? "bg-emerald-500" : "bg-red-500"}`} />
                              {provider.subscription.status}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                              provider.providerStatus === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/25"
                            }`}>
                              {provider.providerStatus}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 text-left font-bold text-foreground">
                          <AdminMoney amount={provider.walletBalanceEgp} />
                        </TableCell>
                        <TableCell className="py-3.5 text-left font-bold text-emerald-500">
                          <AdminMoney amount={provider.totalEarningsEgp} />
                        </TableCell>
                        <TableCell className="py-3.5 text-left font-extrabold text-foreground">
                          {provider.totalModels} models
                        </TableCell>
                        <TableCell className="py-3.5 text-left text-muted-foreground">
                          <AdminDate value={provider.createdAt} />
                        </TableCell>
                        <TableCell className="py-3.5 text-right pr-4">
                          <Link href={`/admin/providers/${provider.id}`}>
                            <div className="p-1 hover:bg-secondary rounded-lg border border-border/80 bg-card cursor-pointer transition-colors inline-block hover-lift">
                              <ChevronRight className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                            </div>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between pt-4 text-xs text-muted-foreground border-t border-border/60 font-medium">
            <span>
              Page {response.meta.page} of {response.meta.totalPages} · {response.meta.total} providers
            </span>
            <div className="flex gap-2">
              <Link
                href={`/admin/providers?page=${Math.max(response.meta.page - 1, 1)}`}
                className={`h-8 rounded-lg border border-border px-3 py-1.5 inline-flex items-center text-[10px] font-bold bg-card hover:bg-secondary transition-colors cursor-pointer hover-lift ${
                  response.meta.page === 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Previous
              </Link>
              <Link
                href={`/admin/providers?page=${Math.min(response.meta.page + 1, response.meta.totalPages)}`}
                className={`h-8 rounded-lg border border-border px-3 py-1.5 inline-flex items-center text-[10px] font-bold bg-card hover:bg-secondary transition-colors cursor-pointer hover-lift ${
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
