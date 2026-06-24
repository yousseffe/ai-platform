"use client";

import React from "react";
import {
  Coins,
  Database,
  Users as UsersIcon,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlatformStats } from "@/types";

interface PlatformLedgerTabProps {
  /** Platforms stats object from API payload */
  stats: PlatformStats | null;
  /** Flag representing if platform stats loading state is active */
  loading: boolean;
}

/**
 * Renders the Platform stats KPI cards and the recent financial transactions ledger logs.
 *
 * @param props - Component parameters including stats payload.
 * @returns The React component for Platform Ledger tab.
 */
export default function PlatformLedgerTab({ stats, loading }: PlatformLedgerTabProps) {
  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-muted-foreground bg-card border border-border rounded-xl">
        <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
        <span>Fetching financial ledgers...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-xl">
        Failed to load platform data.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Stats KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
        <Card className="border border-border bg-card p-0 shadow-sm relative overflow-hidden">
          <CardContent className="p-4">
            <div className="absolute right-3 top-3 text-muted-foreground/10">
              <UsersIcon className="w-10 h-10" />
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Platform Users</p>
            <CardTitle className="text-2xl font-extrabold text-foreground border-none p-0 h-auto">{stats.totalUsers}</CardTitle>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card p-0 shadow-sm relative overflow-hidden">
          <CardContent className="p-4">
            <div className="absolute right-3 top-3 text-muted-foreground/10">
              <Layers className="w-10 h-10" />
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Total Orgs</p>
            <CardTitle className="text-2xl font-extrabold text-foreground border-none p-0 h-auto">{stats.totalOrgs}</CardTitle>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card p-0 shadow-sm relative overflow-hidden">
          <CardContent className="p-4">
            <div className="absolute right-3 top-3 text-muted-foreground/10">
              <Database className="w-10 h-10" />
            </div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Registered Models</p>
            <CardTitle className="text-2xl font-extrabold text-foreground border-none p-0 h-auto">{stats.totalModels}</CardTitle>
          </CardContent>
        </Card>

        <Card className="border border-emerald-200/60 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-500/20 p-0 shadow-sm relative overflow-hidden">
          <CardContent className="p-4">
            <div className="absolute right-3 top-3 text-emerald-500/20 dark:text-emerald-500/10">
              <Coins className="w-10 h-10" />
            </div>
            <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5 font-mono">System Admin Wallet</p>
            <CardTitle className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 border-none p-0 h-auto font-mono">
              ${stats.platformBalance.toFixed(2)}
            </CardTitle>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Log Grid */}
      <Card className="border border-border bg-card shadow-sm p-0 overflow-hidden mt-6">
        <CardHeader className="p-5 border-b border-border bg-accent/20">
          <CardTitle className="text-sm font-bold text-foreground">Global Platforms Ledger Logs</CardTitle>
          <CardDescription className="text-[10px] text-muted-foreground mt-0.5">
            Real-time transaction history recording credits deposits, organization creations, and prediction commission splits.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recentTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="w-full text-left border-collapse">
                <TableHeader>
                  <TableRow className="bg-background border-b border-border hover:bg-background">
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Reference</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Type</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Amount</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Transaction ID</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border text-xs font-mono">
                  {stats.recentTransactions.map((tx) => {
                    const isCredit = tx.type === "CREDIT";
                    const valFloat = typeof tx.amount === "string" ? parseFloat(tx.amount) : tx.amount;
                    return (
                      <TableRow key={tx.id} className="hover:bg-accent/40 border-b border-border">
                        <TableCell className="px-5 py-3 font-bold text-foreground max-w-xs truncate">
                          {tx.reference}
                        </TableCell>
                        <TableCell className="px-5 py-3">
                          <span
                            className={`badge ${
                              isCredit ? "badge-success" : "badge-danger"
                            }`}
                          >
                            <span className="flex items-center gap-1 font-mono">
                              {isCredit ? (
                                <ArrowDownLeft className="w-2.5 h-2.5" />
                              ) : (
                                <ArrowUpRight className="w-2.5 h-2.5" />
                              )}
                              {tx.type}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className={`px-5 py-3 font-bold ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {isCredit ? "+" : "-"}${valFloat.toFixed(2)}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-muted-foreground select-all">
                          {tx.id}
                        </TableCell>
                        <TableCell className="px-5 py-3 text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No system transactions logged in database ledger.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
