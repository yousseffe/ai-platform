import React from "react";
import { Terminal, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ModelLog } from "@/types";

interface InferenceLogsTableProps {
  logs: ModelLog[];
  title: string;
}

/**
 * Reusable table component displaying prediction log details: model, response latency,
 * api authentication method, status code badges, and execution timestamp.
 * Re-styled for premium readability in light and dark mode.
 */
export function InferenceLogsTable({ logs, title }: InferenceLogsTableProps) {
  return (
    <Card className="lg:col-span-2 overflow-hidden flex flex-col border border-border bg-card p-0 shadow-sm font-sans">
      <CardHeader className="p-4 border-b border-border bg-secondary/10 flex flex-row items-center justify-between space-y-0 select-none">
        <CardTitle className="font-semibold text-foreground text-xs flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          {title}
        </CardTitle>
        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded border border-border/40">
          Last {logs.length} calls
        </span>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs font-mono">
            No prediction logs found. Make a model inference request to populate this ledger.
          </div>
        ) : (
          <Table className="w-full text-left border-collapse font-sans text-xs">
            <TableHeader>
              <TableRow className="bg-secondary/20 border-b border-border hover:bg-secondary/20 select-none">
                <TableHead className="px-4 py-2.5 font-bold text-[9px] uppercase tracking-wider text-muted-foreground h-auto">Model</TableHead>
                <TableHead className="px-4 py-2.5 font-bold text-[9px] uppercase tracking-wider text-muted-foreground h-auto">API Auth Method</TableHead>
                <TableHead className="px-4 py-2.5 font-bold text-[9px] uppercase tracking-wider text-muted-foreground h-auto">Latency</TableHead>
                <TableHead className="px-4 py-2.5 font-bold text-[9px] uppercase tracking-wider text-muted-foreground h-auto">Status</TableHead>
                <TableHead className="px-4 py-2.5 font-bold text-[9px] uppercase tracking-wider text-muted-foreground h-auto">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border text-xs text-foreground font-mono">
              {logs.map((log) => {
                const isSuccess = log.status === "SUCCESS";
                const isFast = log.responseTimeMs < 400;
                
                let badgeClass = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-500/20";
                if (isSuccess) {
                  badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-500/20";
                }

                return (
                  <TableRow key={log.id} className="hover:bg-secondary/30 transition-colors border-b border-border">
                    <TableCell className="px-4 py-3 font-semibold text-foreground font-sans text-xs">
                      {log.model?.name || "Deleted Model"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground select-none max-w-[120px] truncate text-[11px]">
                      {log.apiKey && log.apiKey.startsWith("ml_sk_live") ? "API Key (sk_live)" : "JWT Session"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${isFast ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                        <Clock className="w-3 h-3 shrink-0" />
                        {log.responseTimeMs}ms
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-1.5 select-none">
                        {isSuccess ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0" />
                        )}
                        <Badge variant="outline" className={`text-[9px] font-bold tracking-wider py-0.5 px-1.5 uppercase rounded border ${badgeClass}`}>
                          {log.statusCode} {log.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground text-[11px]">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
