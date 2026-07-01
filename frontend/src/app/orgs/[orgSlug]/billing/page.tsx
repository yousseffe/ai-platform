"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useOrgContext } from "@/hooks/use-org-context";
import {
  Coins,
  Info,
  Loader2,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Landmark,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  getCreditsPerEgp,
  getOrganizationWallets,
  getTransactions,
  Transaction,
  WorkspaceWallet,
} from "@/lib/services/wallets.service";
import { OrgType, WalletType } from "@/types";
import TransactionsTable from "@/components/dashboard/TransactionsTable";
import OrganizationFinanceActionPanel from "@/components/orgs/OrganizationFinanceActionPanel";

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
  const [wallets, setWallets] = useState<WorkspaceWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creditsPerEgp, setCreditsPerEgp] = useState(10);
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

  const fetchWallets = useCallback(async (showLoader = true) => {
    if (!org) return;

    if (showLoader) {
      setIsLoading(true);
    }
    try {
      const data = await getOrganizationWallets(org.id);
      setWallets(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load wallet data",
      );
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }, [org]);

  const fetchTransactions = useCallback(async () => {
    if (!org) return;

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
      toast.error(
        error instanceof Error ? error.message : "Failed to load transactions",
      );
    } finally {
      setTransactionsLoading(false);
    }
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

  const refreshFinanceData = useCallback(async () => {
    await Promise.all([fetchWallets(false), fetchTransactions()]);
  }, [fetchTransactions, fetchWallets]);

  useEffect(() => {
    Promise.resolve().then(fetchWallets);
  }, [fetchWallets]);

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

    Promise.resolve().then(fetchTransactions);
  }, [org, fetchTransactions]);

  if (!org) return null;

  const consumerWallet = wallets.find((w) => w.walletType === WalletType.CONSUMER);
  const providerWallet = wallets.find((w) => w.walletType === WalletType.PROVIDER);

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
          value: providerWallet ? `${providerWallet.balance.toLocaleString()} EGP` : "No wallet",
          caption: "Revenue earned from approved provider models and available for owner-controlled payout.",
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
      showProviderFinance
        ? {
          label: "Payout Currency",
          value: providerWallet?.currency || "EGP",
          caption: "Provider withdrawals settle from the organization earnings wallet.",
          icon: <Landmark className="h-4 w-4" strokeWidth={1.8} />,
          tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
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

  const notes =
    org.type === OrgType.PROVIDER
      ? [
        "Provider organizations do not use a consumer credit balance.",
        "Revenue is credited in EGP to the provider wallet when approved marketplace models are used.",
        "Organization owners can withdraw provider earnings directly from this finance workspace.",
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
          "Approved provider models earn into the provider wallet in EGP.",
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

          <section className="space-y-4">
            <OrganizationFinanceActionPanel
              orgId={org.id}
              orgSlug={org.slug}
              orgName={org.name}
              showConsumerFinance={showConsumerFinance}
              showProviderFinance={showProviderFinance}
              consumerBalance={consumerWallet?.balance ?? 0}
              providerBalance={providerWallet?.balance ?? 0}
              creditsPerEgp={creditsPerEgp}
              onFinanceUpdated={refreshFinanceData}
            />

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
                    <p>
                      Minimum deposit is 5 EGP. Credits are added to the organization consumer wallet only, while provider earnings stay separately withdrawable in EGP.
                    </p>
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
