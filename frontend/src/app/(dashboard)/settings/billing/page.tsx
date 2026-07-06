"use client";

import React from "react";
import { Coins, TrendingUp, Wallet, Receipt, Key } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import WalletTopUpCard from "@/components/dashboard/WalletTopUpCard";
import TransactionsTable from "@/components/dashboard/TransactionsTable";
import WalletAnalyticsPanel from "@/components/dashboard/WalletAnalyticsPanel";
import { useTransactions } from "@/hooks/use-transactions";
import { useWorkspace } from "@/hooks/use-workspace";
import { WalletType } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/**
 * Settings Page: Billing & Wallet.
 * Handles depositing credits, cashing out withdrawable balance, and displays paginated transaction histories with advanced filters.
 */
export default function BillingSettingsPage() {
  const { viewMode, canAccessBilling, activeWorkspace } = useWorkspace();
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
  } = useTransactions(10, canAccessBilling);

  const isConsumer = viewMode === WalletType.CONSUMER;

  if (!canAccessBilling) {
    return (
      <div className="space-y-6 animate-fade-in text-left">
        <PageHeader
          title="Billing & Wallet Settings"
          icon={<Coins className="w-5 h-5 text-primary" />}
          description="Shared organization billing is restricted to workspace owners."
          className="mb-0"
        />

        <Card className="border border-border bg-card rounded-xl shadow-sm">
          <CardContent className="p-6 space-y-2">
            <p className="text-sm font-bold text-foreground">Billing access is restricted in this workspace.</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {activeWorkspace?.name || "This organization"} is currently active, and only organization owners can open balances, transactions, top-ups, and withdrawals for shared wallets.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 animate-fade-in text-left">
      {/* Background Glow */}
      <div className="glow-spot" />
      <div className="glow-spot-secondary" />

      <PageHeader
        title="Billing & Wallet Settings"
        icon={<Coins className="w-5 h-5 text-primary" />}
        description="Top up your inference credits, cash out earnings, and audit complete transaction ledger histories."
        className="mb-0"
      />

      <Tabs defaultValue="overview" className="w-full">
        {/* Navigation Tabs Bar */}
        <div className="border-b border-border/80 mb-6 w-full select-none">
          <TabsList variant="line" className="gap-6 flex items-center w-full sm:w-fit bg-transparent pb-0 h-10 justify-start">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 px-1 pb-3 pt-2 cursor-pointer rounded-none text-xs font-bold font-sans transition-all border-none bg-transparent">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Analytics Overview</span>
            </TabsTrigger>

            <TabsTrigger value="caps" className="flex items-center gap-1.5 px-1 pb-3 pt-2 cursor-pointer rounded-none text-xs font-bold font-sans transition-all border-none bg-transparent">
              <Key className="w-3.5 h-3.5" />
              <span>API Key Limits</span>
            </TabsTrigger>
            
            <TabsTrigger value="payments" className="flex items-center gap-1.5 px-1 pb-3 pt-2 cursor-pointer rounded-none text-xs font-bold font-sans transition-all border-none bg-transparent">
              <Wallet className="w-3.5 h-3.5" />
              <span>Deposit & Withdraw</span>
            </TabsTrigger>
            
            <TabsTrigger value="transactions" className="flex items-center gap-1.5 px-1 pb-3 pt-2 cursor-pointer rounded-none text-xs font-bold font-sans transition-all border-none bg-transparent">
              <Receipt className="w-3.5 h-3.5" />
              <span>Transaction Logs</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Overview & Analytics */}
        <TabsContent value="overview" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            <div className="lg:col-span-3">
              <WalletAnalyticsPanel mode="charts" />
            </div>
            
            <div className="lg:col-span-1 space-y-4">
              <Card className="border border-border/85 bg-card p-5 rounded-2xl shadow-sm space-y-4 font-sans select-none">
                <h3 className="text-sm font-bold text-foreground">Billing Summary</h3>
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Workspace</span>
                    <span className="text-foreground font-semibold truncate max-w-[120px]" title={activeWorkspace?.name || "Personal Workspace"}>
                      {activeWorkspace?.name || "Personal Workspace"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Platform Currency</span>
                    <span className="text-foreground font-semibold">
                      {isConsumer ? "Credits" : "EGP"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Total Ledger Logs</span>
                    <span className="text-foreground font-semibold font-mono">
                      {total.toLocaleString()} Records
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Active Wallet</span>
                    <span className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-[9px] font-bold text-foreground border border-border/30">
                      {viewMode === WalletType.CONSUMER ? "Consumer" : "Provider"}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: API Key limits & Caps */}
        <TabsContent value="caps" className="outline-none">
          <WalletAnalyticsPanel mode="keys" />
        </TabsContent>

        {/* Tab 3: Payments & Funds */}
        <TabsContent value="payments" className="outline-none">
          <div className="max-w-4xl">
            <WalletTopUpCard onTransactionSuccess={refetch} />
          </div>
        </TabsContent>

        {/* Tab 4: Transaction Logs */}
        <TabsContent value="transactions" className="outline-none">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
