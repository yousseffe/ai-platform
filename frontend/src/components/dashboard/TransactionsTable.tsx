"use client";

import React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Transaction } from "@/lib/services/wallets.service";

interface TransactionsTableProps {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  loading: boolean;
}

/**
 * Premium dashboard ledger component displaying a paginated table of transactions history.
 * Custom styled to achieve visual excellence in both dark and light modes.
 *
 * @returns The React component rendering the transactions table context.
 */
export default function TransactionsTable({
  transactions,
  total,
  page,
  limit,
  onPageChange,
  loading,
}: TransactionsTableProps) {
  const totalPages = Math.ceil(total / limit) || 1;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="overflow-hidden flex flex-col border border-border bg-card shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-300 rounded-xl text-left font-sans h-full">
      <CardHeader className="p-4.5 border-b border-border bg-secondary/5 flex flex-row items-center justify-between space-y-0 select-none">
        <div className="space-y-0.5">
          <CardTitle className="font-bold text-foreground text-xs flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" strokeWidth={2} />
            Transaction History
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Audit trail of workspace balance top-ups, deductions, and payouts
          </p>
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground font-mono bg-secondary border border-border/40 px-2 py-0.5 rounded-md">
          {total} total
        </span>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col justify-between">
        <div className="overflow-x-auto w-full">
          <Table className="w-full text-left border-collapse text-xs">
            <TableHeader>
              <TableRow className="bg-secondary/15 border-b border-border hover:bg-secondary/15 select-none">
                <TableHead className="px-4.5 py-3.5 font-bold text-[9px] uppercase tracking-widest text-muted-foreground h-auto">Type</TableHead>
                <TableHead className="px-4.5 py-3.5 font-bold text-[9px] uppercase tracking-widest text-muted-foreground h-auto">Amount</TableHead>
                <TableHead className="px-4.5 py-3.5 font-bold text-[9px] uppercase tracking-widest text-muted-foreground h-auto">Reference Description</TableHead>
                <TableHead className="px-4.5 py-3.5 font-bold text-[9px] uppercase tracking-widest text-muted-foreground h-auto">Status</TableHead>
                <TableHead className="px-4.5 py-3.5 font-bold text-[9px] uppercase tracking-widest text-muted-foreground h-auto">Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/30 text-xs text-foreground font-mono">
              {loading ? (
                // Shimmer Loader Rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx} className="border-b border-border/30 animate-pulse">
                    <TableCell className="px-4.5 py-4"><div className="h-4 w-12 bg-muted rounded-md" /></TableCell>
                    <TableCell className="px-4.5 py-4"><div className="h-4 w-16 bg-muted rounded-md" /></TableCell>
                    <TableCell className="px-4.5 py-4"><div className="h-4 w-40 bg-muted rounded-md" /></TableCell>
                    <TableCell className="px-4.5 py-4"><div className="h-4 w-14 bg-muted rounded-md" /></TableCell>
                    <TableCell className="px-4.5 py-4"><div className="h-4 w-28 bg-muted rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-4.5 py-12 text-center text-muted-foreground text-xs font-sans">
                    No transactions recorded on this workspace wallet.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const isCredit = tx.type === "CREDIT";
                  const isSuccess = tx.status === "COMPLETED";

                  let statusBadgeClass = "badge-neutral";
                  if (tx.status === "COMPLETED") statusBadgeClass = "badge-success";
                  if (tx.status === "FAILED") statusBadgeClass = "badge-danger";
                  if (tx.status === "PENDING") statusBadgeClass = "badge-warning";

                  return (
                    <TableRow key={tx.id} className="hover:bg-secondary/20 border-b border-border/30 transition-colors">
                      {/* Type Column */}
                      <TableCell className="px-4.5 py-3 font-semibold text-foreground font-sans">
                        <span className="flex items-center gap-1.5 select-none">
                          {isCredit ? (
                            <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                              <ArrowDownLeft className="w-3 h-3" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-md bg-red-500/10 text-red-500 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-500/20">
                              <ArrowUpRight className="w-3 h-3" />
                            </div>
                          )}
                          <span className={isCredit ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-red-500 dark:text-red-400 font-bold"}>
                            {tx.type}
                          </span>
                        </span>
                      </TableCell>

                      {/* Amount Column */}
                      <TableCell className={isCredit ? "px-4.5 py-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono text-[11px]" : "px-4.5 py-3 font-bold text-red-500 dark:text-red-400 font-mono text-[11px]"}>
                        {isCredit ? "+" : "-"}${Number(tx.amount).toFixed(2)}
                      </TableCell>

                      {/* Reference Column */}
                      <TableCell className="px-4.5 py-3 font-medium text-foreground font-sans text-xs truncate max-w-[200px]" title={tx.reference || "None"}>
                        {tx.reference || "Ledger adjustment"}
                      </TableCell>

                      {/* Status Column */}
                      <TableCell className="px-4.5 py-3 select-none">
                        <div className="flex items-center gap-1">
                          {isSuccess ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          ) : tx.status === "FAILED" ? (
                            <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                          <Badge variant="outline" className={`badge text-[8.5px] font-bold tracking-wider py-0.5 px-1.5 uppercase rounded border ${statusBadgeClass}`}>
                            {tx.status}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Date Column */}
                      <TableCell className="px-4.5 py-3 text-muted-foreground font-sans text-[10.5px]">
                        {formatDate(tx.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination controls footer */}
        {totalPages > 1 && (
          <div className="p-3.5 border-t border-border/50 bg-secondary/5 flex items-center justify-between select-none">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1 || loading}
                className="h-7 px-2.5 text-[10px] font-bold rounded-lg border-border/60 hover:bg-secondary cursor-pointer gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages || loading}
                className="h-7 px-2.5 text-[10px] font-bold rounded-lg border-border/60 hover:bg-secondary cursor-pointer gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
