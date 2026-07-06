import React, { useState } from "react";
import { Terminal, Clock, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModelLog } from "@/types";
import LogDetailModal from "./shared/LogDetailModal";

interface InferenceLogsTableProps {
  logs: ModelLog[];
  title: string;
}

const PAGE_SIZE = 5;

export function InferenceLogsTable({ logs, title }: InferenceLogsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "FAILED">("ALL");
  const [selectedLog, setSelectedLog] = useState<ModelLog | null>(null);

  // Reset page when filter inputs change
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // Apply filters client-side
  const filteredLogs = logs.filter((log) => {
    const modelName = log.model?.name || "Deleted Model";
    const matchesSearch = modelName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  return (
    <Card className="lg:col-span-2 overflow-hidden flex flex-col border border-border border-l-4 border-l-primary bg-card p-0 shadow-sm font-sans justify-between">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <CardHeader className="p-4 border-b border-border bg-secondary/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
          <CardTitle className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" strokeWidth={2} />
            {title}
          </CardTitle>
          <span className="text-[10px] text-muted-foreground font-bold font-mono bg-secondary px-2.5 py-1 rounded-lg border border-border self-start sm:self-auto">
            Found {filteredLogs.length} matching calls
          </span>
        </CardHeader>

        {/* Filters Panel */}
        <div className="p-3.5 border-b border-border/60 bg-secondary/5 flex flex-col sm:flex-row gap-3 items-center">
          {/* Search by Model */}
          <div className="relative w-full sm:flex-1 text-left">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Filter by model name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8.5 h-8.5 text-xs w-full border-border bg-card placeholder:text-muted-foreground/60 focus-visible:ring-primary/20"
            />
          </div>

          {/* Filter by Status */}
          <div className="flex items-center gap-2 w-full sm:w-auto text-left">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground hidden sm:block shrink-0" />
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as "ALL" | "SUCCESS" | "FAILED")}
            >
              <SelectTrigger className="h-8.5 w-full sm:w-36 text-xs border-border bg-card">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                <SelectItem value="FAILED">FAILED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table Body */}
        <CardContent className="p-0 overflow-x-auto flex-1 flex flex-col justify-between">
          {filteredLogs.length === 0 ? (
            <EmptyState
              icon={<Terminal />}
              title="No matching logs found"
              description="Refine your query constraints or make a test prediction call."
            />
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
                    <TableRow
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-secondary/40 border-b border-border/30 cursor-pointer group transition duration-150"
                      title="Click to view details"
                    >
                      <TableCell className="px-4.5 py-3.5 font-bold text-foreground font-sans text-xs group-hover:text-primary transition-colors">
                        {log.model?.name || "Deleted Model"}
                      </TableCell>
                      <TableCell className="px-4.5 py-3.5 text-muted-foreground select-none max-w-[120px] truncate text-[11px]">
                        {log.apiKey && log.apiKey.startsWith("ml_sk_live") ? "API Key (sk_live)" : "JWT Session"}
                      </TableCell>
                      <TableCell className="px-4.5 py-3.5">
                        {isFast ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-emerald-500/10 bg-emerald-500/[0.04] text-emerald-650 dark:text-emerald-400 text-[10.5px] font-bold font-mono">
                            <Clock className="w-3 h-3 text-emerald-500 animate-pulse" strokeWidth={2.5} /> {log.responseTimeMs}ms
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/15 bg-amber-500/[0.04] text-amber-650 dark:text-amber-400 text-[10.5px] font-bold font-mono">
                            <Clock className="w-3 h-3 text-amber-500" strokeWidth={2.5} /> {log.responseTimeMs}ms
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4.5 py-3.5">
                        <div className="flex items-center gap-1.5 select-none">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 text-[9px] font-bold tracking-wider uppercase">
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3.5 border-t border-border bg-secondary/10 select-none font-sans text-xs">
          <div className="text-muted-foreground text-[10px] font-medium font-mono">
            Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{" "}
            <span className="font-semibold text-foreground">{Math.min(endIndex, filteredLogs.length)}</span> of{" "}
            <span className="font-semibold text-foreground">{filteredLogs.length}</span> matching calls
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-bold text-foreground font-mono">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Log Explorer Dialog Modal */}
      <LogDetailModal
        log={selectedLog}
        isOpen={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      />
    </Card>
  );
}
