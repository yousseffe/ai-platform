import Link from "next/link";
import { ArrowRight, Crown, ReceiptText } from "lucide-react";
import { ProviderPlansPanel } from "@/components/dashboard/ProviderPlansPanel";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Provider subscription management page.
 */
export default function ProviderSubscriptionsPage() {
  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="border-b border-border pb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2 tracking-tight">
            <Crown className="w-5 h-5 text-emerald-500" strokeWidth={2.5} />
            Provider Subscriptions
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Manage your provider account tier, compare publishing limits, and upgrade your marketplace plan.
          </p>
        </div>
        <Link
          href="/provider/payments"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-9 px-4 text-xs font-bold gap-1.5"
          )}
        >
          <ReceiptText className="w-3.5 h-3.5" />
          Subscription Payments
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <Card className="border border-emerald-500/20 bg-emerald-500/[0.03] rounded-xl shadow-sm">
        <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed">
          Plan changes affect new marketplace billing and provider limits going forward. Historical transactions remain unchanged.
        </CardContent>
      </Card>

      <ProviderPlansPanel />
    </div>
  );
}
