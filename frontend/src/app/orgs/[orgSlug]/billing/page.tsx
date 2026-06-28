"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useOrgContext } from "@/hooks/use-org-context";
import { smartFetch } from "@/lib/utils/smart-fetch";
import {
  ArrowRight,
  Coins,
  Info,
  Loader2,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redirectToCheckout } from "@/lib/services/stripe.service";
import {
  getCreditsPerEgp,
  getTransactions,
  Transaction,
} from "@/lib/services/wallets.service";
import { OrgType, WalletType } from "@/types";
import TransactionsTable from "@/components/dashboard/TransactionsTable";

interface WalletBalance {
  id: string;
  balance: number;
  currency: string;
  walletType: string;
}

interface FinanceTileProps {
  label: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
  tone: string;
}

function FinanceTile({ label, value, caption, icon, tone }: FinanceTileProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 truncate text-2xl font-black text-foreground">
            {value}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {caption}
          </p>
        </div>
        <div className={`rounded-lg border p-2 ${tone}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/**
 * Organization finance page.
 * Provider-only orgs see earnings and provider ledger.
 * Consumer-capable orgs see credit balance, top-up, and consumer ledger.
 */
export default function OrgBillingPage() {
  const { org } = useOrgContext();
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creditsPerEgp, setCreditsPerEgp] = useState(10);
  const [depositAmount, setDepositAmount] = useState("25");
  const [isDepositing, setIsDepositing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsLimit] = useState(10);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [walletView, setWalletView] = useState<WalletType>(WalletType.CONSUMER);
  const [search, setSearch] = useState("");
  const [txType, setTxType] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const showConsumerFinance =
    org?.type === OrgType.CONSUMER || org?.type === OrgType.HYBRID;
  const showProviderFinance =
    org?.type === OrgType.PROVIDER || org?.type === OrgType.HYBRID;
  const effectiveWalletView =
    org?.type === OrgType.PROVIDER ? WalletType.PROVIDER : walletView;

  useEffect(() => {
    if (!org) return;

    const fetchWallets = async () => {
      setIsLoading(true);
      try {
        const data = await smartFetch<WalletBalance[]>(`/wallets/org/${org.id}`, {
          headers: { "X-Workspace-Id": org.id },
        });
        setWallets(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load wallet data");
      } finally {
        setIsLoading(false);
      }
    };

    Promise.resolve().then(fetchWallets);
  }, [org]);

  useEffect(() => {
    if (!showConsumerFinance) return;
    getCreditsPerEgp()
      .then(setCreditsPerEgp)
      .catch(() => undefined);
  }, [showConsumerFinance]);

  useEffect(() => {
    if (!org) return;
    if (org.type === OrgType.PROVIDER && walletView !== WalletType.PROVIDER) {
      setWalletView(WalletType.PROVIDER);
    }
  }, [org, walletView]);

  useEffect(() => {
    if (!org) return;

    const fetchTransactions = async () => {
      setTransactionsLoading(true);
      try {
        const response = await getTransactions(
          org.id,
          effectiveWalletView,
          transactionsPage,
          transactionsLimit,
          {
            search: search || undefined,
            txType: txType || undefined,
            status: status || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          }
        );
        setTransactions(response.data);
        setTransactionsTotal(response.total);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load transactions");
      } finally {
        setTransactionsLoading(false);
      }
    };

    Promise.resolve().then(fetchTransactions);
  }, [
    org,
    effectiveWalletView,
    transactionsPage,
    transactionsLimit,
    search,
    txType,
    status,
    startDate,
    endDate,
  ]);

  if (!org) return null;

  const consumerWallet = wallets.find((w) => w.walletType === WalletType.CONSUMER);
  const providerWallet = wallets.find((w) => w.walletType === WalletType.PROVIDER);
  const parsedDeposit = parseFloat(depositAmount) || 0;
  const receivedCredits = Math.round(parsedDeposit * creditsPerEgp);
  const presetAmounts = [10, 25, 50, 100];

  const pageTitle =
    org.type === OrgType.PROVIDER ? "Provider Finance" : "Billing";
  const pageDescription =
    org.type === OrgType.PROVIDER
      ? "Track provider earnings and payout ledger for organization-owned marketplace models."
      : org.type === OrgType.CONSUMER
        ? "Manage shared credits, deposits, project spend, and organization ledger activity."
        : "Manage consumer credits and provider earnings separately for this hybrid organization.";

  const visibleTiles = useMemo(
    () => [
      showConsumerFinance
        ? {
          label: "Consumer Credits",
          value: consumerWallet ? `${consumerWallet.balance.toLocaleString()} cr` : "No wallet",
          caption: "Used by organization projects when calling marketplace models.",
          icon: <Coins className="h-4 w-4" strokeWidth={1.8} />,
          tone: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        }
        : null,
      showProviderFinance
        ? {
          label: "Provider Earnings",
          value: providerWallet ? `${providerWallet.balance.toLocaleString()} cr` : "No wallet",
          caption: "Revenue earned from approved provider models and production usage.",
          icon: <TrendingUp className="h-4 w-4" strokeWidth={1.8} />,
          tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        }
        : null,
      showConsumerFinance
        ? {
          label: "Credit Rate",
          value: `${creditsPerEgp}`,
          caption: "Credits added per 1 EGP deposited into the consumer wallet.",
          icon: <Receipt className="h-4 w-4" strokeWidth={1.8} />,
          tone: "border-primary/20 bg-primary/10 text-primary",
        }
        : null,
      {
        label: "Finance Scope",
        value:
          org.type === OrgType.PROVIDER
            ? "Provider-only"
            : org.type === OrgType.CONSUMER
              ? "Consumer-only"
              : "Hybrid",
        caption:
          org.type === OrgType.PROVIDER
            ? "This organization does not manage consumer credit top-ups."
            : org.type === OrgType.CONSUMER
              ? "This organization manages spend, not provider revenue."
              : "Credit spend and provider revenue are separated.",
        icon: <Wallet className="h-4 w-4" strokeWidth={1.8} />,
        tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      },
    ].filter(Boolean) as FinanceTileProps[],
    [
      showConsumerFinance,
      showProviderFinance,
      consumerWallet,
      providerWallet,
      creditsPerEgp,
      org.type,
    ]
  );

  const handleWalletViewChange = (nextView: WalletType) => {
    setWalletView(nextView);
    setTransactionsPage(1);
  };

  const handleOrgTopUp = async () => {
    if (parsedDeposit < 5) {
      toast.error("Minimum deposit is 5.00 EGP");
      return;
    }

    setIsDepositing(true);
    try {
      await redirectToCheckout(parsedDeposit, {
        workspaceId: org.id,
        returnPath: `/orgs/${org.slug}/billing`,
      });
    } catch (error) {
      setIsDepositing(false);
      toast.error(error instanceof Error ? error.message : "Failed to open Stripe Checkout");
    }
  };

  const notes =
    org.type === OrgType.PROVIDER
      ? [
        "Provider organizations do not use a consumer credit balance.",
        "Revenue is credited to the provider wallet when approved marketplace models are used.",
        "Owners and maintainers control which versions reach production and become marketplace verified.",
      ]
      : org.type === OrgType.CONSUMER
        ? [
          "Credits are added to the organization consumer wallet, not to personal wallets.",
          "Projects under this organization spend from the same shared credit balance.",
          "Provider revenue is not part of a consumer-only organization.",
        ]
        : [
          "Consumer credits and provider earnings are intentionally separated.",
          "Projects spend from the consumer wallet.",
          "Approved provider models earn into the provider wallet.",
        ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
            <span className="rounded-md border border-border bg-card px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
              {org.type.replace("_", " ")}
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            {pageDescription}
          </p>
        </div>
        <div className="flex h-9 items-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-muted-foreground">
          {org.type === OrgType.PROVIDER ? "Earnings ledger" : "Workspace finance"}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" strokeWidth={1.5} />
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {visibleTiles.map((tile) => (
              <FinanceTile key={tile.label} {...tile} />
            ))}
          </section>

          <section className={`grid gap-4 ${showConsumerFinance ? "lg:grid-cols-[1.15fr_0.85fr]" : "lg:grid-cols-[0.9fr_1.1fr]"}`}>
            {showConsumerFinance && (
              <div className="rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Consumer Wallet
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-foreground">Add organization credits</h2>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                    <Coins className="h-4 w-4" strokeWidth={1.8} />
                  </div>
                </div>

                <div className="space-y-5 p-5">
                  <div className="grid gap-3 sm:grid-cols-4">
                    {presetAmounts.map((amount) => {
                      const isSelected = depositAmount === amount.toString();
                      const creditsCount = amount * creditsPerEgp;

                      return (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setDepositAmount(amount.toString())}
                          className={`rounded-lg border p-3 text-left transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-foreground hover:bg-secondary/50"
                          }`}
                        >
                          <p className="text-sm font-black">{creditsCount.toLocaleString()}</p>
                          <p className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">Credits</p>
                          <p className="mt-3 text-xs font-bold">{amount} EGP</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid gap-3 border-t border-border pt-4 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        Custom deposit
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
                          EGP
                        </span>
                        <Input
                          type="number"
                          min="5"
                          step="1"
                          value={depositAmount}
                          onChange={(event) => setDepositAmount(event.target.value)}
                          placeholder="Enter amount"
                          className="h-10 rounded-lg pl-11 text-sm font-semibold"
                        />
                      </div>
                    </div>
                    <Button
                      className="h-10 text-sm"
                      onClick={handleOrgTopUp}
                      disabled={isDepositing || parsedDeposit < 5}
                    >
                      {isDepositing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                      )}
                      Checkout
                    </Button>
                  </div>

                  {parsedDeposit > 0 && (
                    <div className="grid gap-3 rounded-lg border border-border bg-secondary/20 p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">You pay</p>
                        <p className="mt-1 text-sm font-black text-foreground">{parsedDeposit.toFixed(2)} EGP</p>
                      </div>
                      <div className="hidden h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary sm:flex">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                      <div className="sm:text-right">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Organization receives</p>
                        <p className="mt-1 text-sm font-black text-primary">{receivedCredits.toLocaleString()} credits</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Finance Rules
                </p>
                <h2 className="mt-1 text-lg font-bold text-foreground">
                  {org.type === OrgType.PROVIDER ? "Provider finance logic" : "Wallet logic"}
                </h2>
              </div>
              <div className="space-y-3 p-5">
                {notes.map((note) => (
                  <div key={note} className="rounded-lg border border-border bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
                    {note}
                  </div>
                ))}
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={1.8} />
                    <p className="text-sm leading-6 text-emerald-700 dark:text-emerald-400">
                      {org.type === OrgType.PROVIDER
                        ? "Use version review, saved test cases, and approval history to keep production releases auditable."
                        : "Use separate projects and scoped keys for production, staging, and client integrations."}
                    </p>
                  </div>
                </div>
                {showConsumerFinance && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/30 px-4 py-3 text-xs leading-5 text-muted-foreground">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p>Minimum deposit is 5 EGP. Credits are added to the organization consumer wallet only.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Ledger
                </p>
                <h2 className="mt-1 text-lg font-bold text-foreground">
                  {effectiveWalletView === WalletType.PROVIDER ? "Provider transactions" : "Consumer transactions"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {showConsumerFinance && (
                  <button
                    type="button"
                    onClick={() => handleWalletViewChange(WalletType.CONSUMER)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      effectiveWalletView === WalletType.CONSUMER
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    Consumer Wallet
                  </button>
                )}
                {showProviderFinance && providerWallet && (
                  <button
                    type="button"
                    onClick={() => handleWalletViewChange(WalletType.PROVIDER)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      effectiveWalletView === WalletType.PROVIDER
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    Provider Wallet
                  </button>
                )}
              </div>
            </div>

            <TransactionsTable
              viewMode={effectiveWalletView}
              transactions={transactions}
              total={transactionsTotal}
              page={transactionsPage}
              limit={transactionsLimit}
              onPageChange={setTransactionsPage}
              loading={transactionsLoading}
              search={search}
              onSearchChange={(value) => {
                setSearch(value);
                setTransactionsPage(1);
              }}
              txType={txType}
              onTxTypeChange={(value) => {
                setTxType(value);
                setTransactionsPage(1);
              }}
              status={status}
              onStatusChange={(value) => {
                setStatus(value);
                setTransactionsPage(1);
              }}
              startDate={startDate}
              onStartDateChange={(value) => {
                setStartDate(value);
                setTransactionsPage(1);
              }}
              endDate={endDate}
              onEndDateChange={(value) => {
                setEndDate(value);
                setTransactionsPage(1);
              }}
            />
          </section>
        </>
      )}
    </div>
  );
}
