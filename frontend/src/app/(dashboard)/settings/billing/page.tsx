"use client";

import React from "react";
import { Coins, Receipt, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import WalletTopUpCard from "@/components/dashboard/WalletTopUpCard";
import TransactionsTable from "@/components/dashboard/TransactionsTable";
import { useTransactions } from "@/hooks/use-transactions";
import { useWorkspace } from "@/hooks/use-workspace";
import { WalletType } from "@/types";

/**
 * Settings Page: Billing & Wallet.
 * Handles depositing credits, cashing out withdrawable balance, and displays paginated transaction histories with advanced filters.
 */
export default function BillingSettingsPage() {
  const {
    transactions,
    total,
    page,
    setPage,
    loading,
    refetch,
    search,
    setSearch,
    txType,
    setTxType,
    status,
    setStatus,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
  } = useTransactions(10);

  const { balance, viewMode } = useWorkspace();

  const isConsumer = viewMode === WalletType.CONSUMER;

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Premium Header */}
      <div className="border-b border-border pb-4 select-none">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2 tracking-tight font-sans">
          <Coins className="w-5 h-5 text-primary animate-pulse" strokeWidth={2.5} />
          Billing & Wallet Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Top up your inference credits, cash out earnings, and audit complete transaction ledger histories.
        </p>
      </div>

      {/* Top Metrics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1: Active Balance */}
        <Card className="border border-border bg-card border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                {isConsumer ? "Credits Balance" : "EGP Revenue Balance"}
              </p>
              <p className="text-2xl font-extrabold text-foreground mt-1.5 font-mono">
                {isConsumer ? `${Math.round(balance)} Credits` : `${balance.toFixed(2)} EGP`}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/15 shadow-xs">
              <Coins className="w-5 h-5" strokeWidth={2} />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Total Transactions */}
        <Card className="border border-border bg-card border-l-4 border-l-violet-500 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Total Ledger Logs</p>
              <p className="text-2xl font-extrabold text-foreground mt-1.5 font-mono">{total} Records</p>
            </div>
            <div className="p-2.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/15 shadow-xs">
              <Receipt className="w-5 h-5" strokeWidth={2} />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Active Currency */}
        <Card className="border border-border bg-card border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Platform Currency</p>
              <p className="text-2xl font-extrabold text-foreground mt-1.5 font-mono">
                {isConsumer ? "Credits" : "EGP"}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 shadow-xs">
              <Globe className="w-5 h-5" strokeWidth={2} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Wallet Controls Card */}
        <div className="lg:col-span-1">
          <WalletTopUpCard onTransactionSuccess={refetch} />
        </div>

        {/* Wallet Transactions Table Card */}
        <div className="lg:col-span-2 h-full">
          <TransactionsTable
            viewMode={viewMode}
            transactions={transactions}
            total={total}
            page={page}
            limit={10}
            onPageChange={setPage}
            loading={loading}
            search={search}
            onSearchChange={setSearch}
            txType={txType}
            onTxTypeChange={setTxType}
            status={status}
            onStatusChange={setStatus}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
          />
        </div>
      </div>
    </div>
  );
}

