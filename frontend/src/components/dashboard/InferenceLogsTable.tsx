import React, { useState } from "react";
import { Terminal, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ModelLog } from "@/types";

interface InferenceLogsTableProps {
  logs: ModelLog[];
  title: string;
}

const PAGE_SIZE = 5;

/**
 * Reusable table component displaying prediction log details: model, response latency,
 * api authentication method, status code badges, and execution timestamp.
 * Includes client-side pagination for premium user experience.
 *
 * @param props - InferenceLogsTableProps component properties.
 * @returns The React component layout rendering sandbox query history logs.
 */
export function InferenceLogsTable({ logs, title }: InferenceLogsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [prevLength, setPrevLength] = useState(logs.length);

  if (logs.length !== prevLength) {
    setPrevLength(logs.length);
    setCurrentPage(1);
  }

  const totalPages = Math.ceil(logs.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const currentLogs = logs.slice(startIndex, endIndex);

  return (
    <Card className="lg:col-span-2 overflow-hidden flex flex-col border border-border border-l-4 border-l-primary bg-card p-0 shadow-sm font-sans justify-between">
      <div className="flex-1 flex flex-col">
        <CardHeader className="p-4 border-b border-border bg-secondary/20 flex flex-row items-center justify-between space-y-0 select-none">
          <CardTitle className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" strokeWidth={2} />
            {title}
          </CardTitle>
          <span className="text-[10px] text-muted-foreground font-bold font-mono bg-secondary px-2.5 py-1 rounded-lg border border-border">
            Total {logs.length} calls
          </span>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto flex-1 flex flex-col justify-between">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs font-mono">
              No prediction logs found. Make a model inference request to populate this ledger.
            </div>
          ) : (
            <Table className="w-full text-left border-collapse font-sans text-xs">
              <TableHeader>
                <TableRow className="bg-secondary/30 border-b border-border hover:bg-secondary/30 select-none">
                  <TableHead className="px-4.5 py-3 font-bold text-[9px] uppercase tracking-wider text-muted-foreground h-auto">Model</TableHead>
                  <TableHead className="px-4.5 py-3 font-bold text-[9px] uppercase tracking-wider text-muted-foreground h-auto">API Auth Method</TableHead>
                  <TableHead className="px-4.5 py-3 font-bold text-[9px] uppercase tracking-wider text-muted-foreground h-auto">Latency</TableHead>
                  <TableHead className="px-4.5 py-3 font-bold text-[9px] uppercase tracking-wider text-muted-foreground h-auto">Status</TableHead>
                  <TableHead className="px-4.5 py-3 font-bold text-[9px] uppercase tracking-wider text-muted-foreground h-auto">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/30 text-xs text-foreground font-mono">
                {currentLogs.map((log) => {
                  const isSuccess = log.status === "SUCCESS";
                  const isFast = log.responseTimeMs < 400;

                  return (
                    <TableRow key={log.id} className="hover:bg-secondary/40 transition-colors border-b border-border/30">
                      <TableCell className="px-4.5 py-3.5 font-bold text-foreground font-sans text-xs">
                        {log.model?.name || "Deleted Model"}
                      </TableCell>
                      <TableCell className="px-4.5 py-3.5 text-muted-foreground select-none max-w-[120px] truncate text-[11px]">
                        {log.apiKey && log.apiKey.startsWith("ml_sk_live") ? "API Key (sk_live)" : "JWT Session"}
                      </TableCell>
                      <TableCell className="px-4.5 py-3.5">
                        {isFast ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-emerald-500/10 bg-emerald-500/[0.04] text-emerald-600 dark:text-emerald-400 text-[10.5px] font-bold font-mono">
                            <Clock className="w-3 h-3 text-emerald-500" strokeWidth={2.5} /> {log.responseTimeMs}ms
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/15 bg-amber-500/[0.04] text-amber-600 dark:text-amber-400 text-[10.5px] font-bold font-mono">
                            <Clock className="w-3 h-3 text-amber-500" strokeWidth={2.5} /> {log.responseTimeMs}ms
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4.5 py-3.5">
                        <div className="flex items-center gap-1.5 select-none">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold tracking-wider uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {log.statusCode} {log.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-red-500/20 bg-red-500/10 text-red-650 dark:text-red-450 text-[9px] font-bold tracking-wider uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> {log.statusCode} {log.status}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4.5 py-3.5 text-muted-foreground text-[11px]">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3.5 border-t border-border bg-secondary/10 select-none font-sans text-xs">
          <div className="text-muted-foreground text-[10px] font-medium font-mono">
            Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{" "}
            <span className="font-semibold text-foreground">{Math.min(endIndex, logs.length)}</span> of{" "}
            <span className="font-semibold text-foreground">{logs.length}</span> calls
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-bold text-foreground font-mono">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
