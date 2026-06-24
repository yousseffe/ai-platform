"use client";

import React from "react";
import WalletTopUpCard from "@/components/dashboard/WalletTopUpCard";
import TransactionsTable from "@/components/dashboard/TransactionsTable";
import { useTransactions } from "@/hooks/use-transactions";

/**
 * Settings Page: Billing & Wallet.
 * Handles depositing credits, cashing out withdrawable balance, and displays paginated transaction histories.
 */
export default function BillingSettingsPage() {
  const { transactions, total, page, setPage, loading, refetch } = useTransactions(10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in">
      {/* Wallet Controls Card */}
      <div className="lg:col-span-1">
        <WalletTopUpCard onTransactionSuccess={refetch} />
      </div>

      {/* Wallet Transactions Table Card */}
      <div className="lg:col-span-2 h-full">
        <TransactionsTable
          transactions={transactions}
          total={total}
          page={page}
          limit={10}
          onPageChange={setPage}
          loading={loading}
        />
      </div>
    </div>
  );
}

