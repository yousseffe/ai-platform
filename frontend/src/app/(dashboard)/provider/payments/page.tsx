"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  ReceiptText,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { cn } from "@/lib/utils";

interface SubscriptionPayment {
  id: string;
  type: string;
  amount: number | string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  reference: string | null;
  stripeEventId: string | null;
  createdAt: string;
}

interface SubscriptionPaymentsResponse {
  data: SubscriptionPayment[];
  total: number;
  totalPaidEgp: number;
  subscription: {
    billingCycle: "MONTHLY" | "ANNUAL" | null;
    startedAt: string | null;
    expiresAt: string | null;
    lastPaymentAt: string | null;
    status: "FREE" | "ACTIVE" | "EXPIRED";
    daysRemaining: number | null;
  };
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "string" ? Number(value) || 0 : value;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function statusIcon(status: SubscriptionPayment["status"]) {
  if (status === "COMPLETED") return <CheckCircle2 className="w-3.5 h-3.5" />;
  if (status === "FAILED") return <XCircle className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
}

/**
 * Provider subscription payment history page.
 */
export default function ProviderSubscriptionPaymentsPage() {
  const [payments, setPayments] = React.useState<SubscriptionPayment[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalPaidEgp, setTotalPaidEgp] = React.useState(0);
  const [subscription, setSubscription] =
    React.useState<SubscriptionPaymentsResponse["subscription"] | null>(null);
  const [loading, setLoading] = React.useState(true);

  const loadPayments = React.useCallback(async () => {
    const res = await smartFetch<SubscriptionPaymentsResponse>("/provider-accounts/subscription-payments");
    setPayments(res.data);
    setTotal(res.total);
    setTotalPaidEgp(toNumber(res.totalPaidEgp));
    setSubscription(res.subscription);
  }, []);

  React.useEffect(() => {
    let active = true;

    Promise.resolve()
      .then(() => loadPayments())
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load subscription payments";
        toast.error(message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadPayments]);

  const lastPayment = payments[0];
  const isSubscriptionActive = subscription?.status === "ACTIVE";
  const isSubscriptionExpired = subscription?.status === "EXPIRED";

  return (
    <div className="relative space-y-6 animate-fade-in text-left font-sans">
      {/* Background decoration */}
      <div className="glow-spot" />
      <div className="glow-spot-secondary" />

      <div className="border-b border-border/80 pb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10 select-none">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2 tracking-tight">
            <ReceiptText className="w-5 h-5 text-primary" strokeWidth={2} />
            Subscription Payments
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Review confirmed Stripe payments for provider tier subscriptions and jump back to plan management.
          </p>
        </div>
        <Link
          href="/provider/subscriptions"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-9 px-4 text-xs font-bold gap-1.5 hover-lift active-shrink rounded-lg"
          )}
        >
          <Crown className="w-3.5 h-3.5" />
          Manage Plans
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <Card
        className={cn(
          "border rounded-xl shadow-xs relative z-10 overflow-hidden premium-card p-0",
          isSubscriptionActive
            ? "border-emerald-500/25 bg-emerald-500/[0.02]"
            : isSubscriptionExpired
              ? "border-amber-500/25 bg-amber-500/[0.02]"
              : "border-border bg-card/60 backdrop-blur-md",
        )}
      >
        <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 select-none">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "p-3 rounded-xl border shrink-0 shadow-xs",
                isSubscriptionActive
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                  : isSubscriptionExpired
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
                    : "bg-primary/10 text-primary border-primary/15",
              )}
            >
              {isSubscriptionExpired ? <AlertTriangle className="w-5 h-5" /> : <CalendarDays className="w-5 h-5 animate-pulse" />}
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">
                Current subscription
              </p>
              <h2 className="text-base font-extrabold text-foreground">
                {isSubscriptionActive
                  ? `Active until ${subscription?.expiresAt ? formatDate(subscription.expiresAt) : "next renewal"}`
                  : isSubscriptionExpired
                    ? "Expired and reverted to the default plan"
                    : "No active paid subscription"}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-lg">
                {isSubscriptionActive &&
                subscription?.daysRemaining !== null &&
                subscription?.daysRemaining !== undefined
                  ? `${subscription?.daysRemaining} day${subscription?.daysRemaining === 1 ? "" : "s"} remaining on the current ${subscription?.billingCycle?.toLowerCase()} period.`
                  : isSubscriptionExpired
                    ? "Paid tier access is removed automatically after the stored expiry date."
                    : "Choose a paid provider plan to start a subscription period."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs shrink-0">
            <div className="rounded-xl border border-border/80 bg-background/50 px-3.5 py-2.5 shadow-inner">
              <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground font-mono">Cycle</p>
              <p className="mt-1 font-bold text-foreground font-sans">{subscription?.billingCycle ?? "None"}</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/50 px-3.5 py-2.5 shadow-inner">
              <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground font-mono">Started</p>
              <p className="mt-1 font-bold text-foreground font-sans">
                {subscription?.startedAt ? formatDate(subscription.startedAt).split(",")[0] : "-"}
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/50 px-3.5 py-2.5 shadow-inner col-span-2 sm:col-span-1">
              <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground font-mono">Expires</p>
              <p className="mt-1 font-bold text-foreground font-sans">
                {subscription?.expiresAt ? formatDate(subscription.expiresAt).split(",")[0] : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stripe-style Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10 select-none">
        <Card className="border border-border/80 bg-card/60 backdrop-blur-md rounded-xl shadow-xs premium-card overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-indigo-500" />
          <CardContent className="p-5 pt-6 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Total Paid</p>
              <p className="text-2xl font-black text-foreground mt-2 font-mono">
                {totalPaidEgp.toLocaleString()} EGP
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs shrink-0">
              <CreditCard className="w-5 h-5 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/60 backdrop-blur-md rounded-xl shadow-xs premium-card overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardContent className="p-5 pt-6 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Payments</p>
              <p className="text-2xl font-black text-foreground mt-2 font-mono">{total.toLocaleString()} Records</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs shrink-0">
              <ReceiptText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card/60 backdrop-blur-md rounded-xl shadow-xs premium-card overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardContent className="p-5 pt-6 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-mono">Last Payment</p>
              <p className="text-xs font-extrabold text-foreground mt-3.5 font-mono truncate max-w-[160px]">
                {lastPayment ? formatDate(lastPayment.createdAt) : "No payments yet"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border border-border/80 bg-card/60 backdrop-blur-md rounded-xl shadow-xs relative z-10 premium-card p-0">
        <CardHeader className="p-5 border-b border-border bg-secondary/20 flex flex-row items-center justify-between space-y-0 select-none">
          <div className="space-y-1">
            <CardTitle className="font-bold text-foreground text-xs flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-primary animate-pulse" />
              Provider Subscription Ledger
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Confirmed provider tier checkout sessions recorded by the platform ledger.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              loadPayments()
                .catch((err) => {
                  const message = err instanceof Error ? err.message : "Failed to refresh payments";
                  toast.error(message);
                })
                .finally(() => setLoading(false));
            }}
            className="h-8 text-[10px] font-bold gap-1.5 hover-lift active-shrink rounded-lg"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="w-full text-left border-collapse text-xs">
              <TableHeader>
                <TableRow className="bg-secondary/10 border-b border-border/60 hover:bg-secondary/10 select-none">
                  <TableHead className="px-5 py-3.5 font-bold text-[9px] uppercase tracking-widest text-muted-foreground h-auto">Status</TableHead>
                  <TableHead className="px-5 py-3.5 font-bold text-[9px] uppercase tracking-widest text-muted-foreground h-auto">Amount</TableHead>
                  <TableHead className="px-5 py-3.5 font-bold text-[9px] uppercase tracking-widest text-muted-foreground h-auto">Stripe Session</TableHead>
                  <TableHead className="px-5 py-3.5 font-bold text-[9px] uppercase tracking-widest text-muted-foreground h-auto">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [0, 1, 2].map((item) => (
                    <TableRow key={item} className="border-b border-border/20">
                      <TableCell className="px-5 py-4"><div className="h-4 w-20 rounded bg-muted animate-pulse" /></TableCell>
                      <TableCell className="px-5 py-4"><div className="h-4 w-24 rounded bg-muted/80 animate-pulse" /></TableCell>
                      <TableCell className="px-5 py-4"><div className="h-4 w-52 rounded bg-muted/60 animate-pulse" /></TableCell>
                      <TableCell className="px-5 py-4"><div className="h-4 w-32 rounded bg-muted/40 animate-pulse" /></TableCell>
                    </TableRow>
                  ))
                ) : payments.length > 0 ? (
                  payments.map((payment) => (
                    <TableRow key={payment.id} className="border-b border-border/30 hover:bg-secondary/15 transition-colors">
                      <TableCell className="px-5 py-3.5 select-none">
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1.5 text-[9px] font-bold uppercase tracking-wider rounded-md",
                            payment.status === "COMPLETED" && "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            payment.status === "FAILED" && "border-red-500/25 bg-red-500/10 text-red-650 dark:text-red-400",
                          )}
                        >
                          {statusIcon(payment.status)}
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-3.5 font-mono font-bold text-foreground">
                        {toNumber(payment.amount).toLocaleString()} EGP
                      </TableCell>
                      <TableCell className="px-5 py-3.5 font-mono text-[10.5px] text-muted-foreground">
                        {payment.stripeEventId || "Manual/legacy payment"}
                      </TableCell>
                      <TableCell className="px-5 py-3.5 font-mono text-[10.5px] text-muted-foreground">
                        {formatDate(payment.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="px-5 py-12 text-center select-none">
                      <div className="mx-auto max-w-md space-y-2">
                        <p className="text-sm font-bold text-foreground">No subscription payments yet.</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Once a provider plan checkout is confirmed, the payment will appear here.
                        </p>
                        <Link href="/provider/subscriptions" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                          Choose a plan <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
