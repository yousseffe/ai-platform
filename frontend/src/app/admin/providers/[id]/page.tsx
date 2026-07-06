import { AdminDate } from "@/components/admin/common/AdminDate";
import { AdminPageHeader } from "@/components/admin/common/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/common/AdminStatusBadge";
import { ProviderActivityPanels } from "@/components/admin/providers/ProviderActivityPanels";
import { ProviderSubscriptionPanel } from "@/components/admin/providers/ProviderSubscriptionPanel";
import { ProviderSummaryCards } from "@/components/admin/providers/ProviderSummaryCards";
import { ProviderUtilizationPanel } from "@/components/admin/providers/ProviderUtilizationPanel";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminProviderDetails } from "@/lib/services/admin-providers.service";

interface AdminProviderDetailsPageProps {
  /** Dynamic route params promise. */
  params: Promise<{ id: string }>;
}

/**
 * Provider details page for the new admin provider control center.
 *
 * @param props - Page props.
 * @returns The provider details page.
 */
export default async function AdminProviderDetailsPage({
  params,
}: AdminProviderDetailsPageProps) {
  const { id } = await params;
  const provider = await getAdminProviderDetails(id);

  return (
    <div className="space-y-6 relative animate-fade-in pb-12 font-sans text-left">
      {/* Decorative background glows */}
      <div className="glow-spot" />
      <div className="glow-spot-secondary" />

      <div className="relative z-10">
        <AdminPageHeader
          title={provider.providerName}
          description="Provider lifecycle, subscription posture, utilization, revenue, models, and audit activity."
          backHref="/admin/providers"
          backLabel="Back to Providers"
        />
      </div>

      <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl relative z-10 hover-lift transition-all duration-300">
        <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Owner
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {provider.owner.ownerName}
            </p>
            <p className="text-sm text-muted-foreground">
              {provider.owner.ownerEmail ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Status
            </p>
            <div className="mt-1 flex gap-2">
              <AdminStatusBadge value={provider.providerStatus} />
              <AdminStatusBadge value={provider.subscription.status} />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Last Active
            </p>
            <div className="mt-1 text-sm font-medium text-foreground">
              <AdminDate value={provider.lastActiveAt} />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Created At
            </p>
            <div className="mt-1 text-sm font-medium text-foreground">
              <AdminDate value={provider.createdAt} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="relative z-10 space-y-6">
        <ProviderSummaryCards provider={provider} />
        <ProviderSubscriptionPanel provider={provider} />
        <ProviderUtilizationPanel provider={provider} />
        <ProviderActivityPanels provider={provider} />
      </div>
    </div>
  );
}
