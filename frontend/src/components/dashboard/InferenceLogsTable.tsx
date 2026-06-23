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
 */
export function InferenceLogsTable({ logs, title }: InferenceLogsTableProps) {
  return (
    <Card className="lg:col-span-2 overflow-hidden flex flex-col border border-border bg-card p-0">
      <CardHeader className="p-5 border-b border-border bg-accent/20 flex flex-row items-center justify-between space-y-0 select-none">
        <CardTitle className="font-bold text-foreground text-sm font-mono flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
        <span className="text-[10px] text-muted-foreground font-mono">
          Last {logs.length} calls
        </span>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs font-mono">
            No prediction logs found. Make a model inference request to populate this ledger.
          </div>
        ) : (
          <Table className="w-full text-left border-collapse font-mono">
            <TableHeader>
              <TableRow className="bg-background border-b border-border hover:bg-background">
                <TableHead className="px-5 py-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-auto">Model</TableHead>
                <TableHead className="px-5 py-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-auto">API Auth Method</TableHead>
                <TableHead className="px-5 py-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-auto">Latency</TableHead>
                <TableHead className="px-5 py-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-auto">Status</TableHead>
                <TableHead className="px-5 py-3 font-bold text-[10px] uppercase tracking-wider text-muted-foreground h-auto">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border text-xs text-foreground">
              {logs.map((log) => {
                const isSuccess = log.status === "SUCCESS";
                const isFast = log.responseTimeMs < 400;
                
                let statusClass = "bg-red-950/40 text-red-400 border-red-500/20";
                if (isSuccess) {
                  statusClass = "bg-emerald-950/40 text-emerald-400 border-emerald-500/20";
                }

                return (
                  <TableRow key={log.id} className="hover:bg-accent/40 transition-colors border-b border-border">
                    <TableCell className="px-5 py-3.5 font-bold text-foreground">
                      {log.model?.name || "Deleted Model"}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-muted-foreground select-none max-w-[120px] truncate">
                      {log.apiKey && log.apiKey.startsWith("ml_sk_live") ? "API Key (sk_live)" : "JWT Session"}
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 font-semibold ${isFast ? "text-emerald-450" : "text-amber-400"}`}>
                        <Clock className="w-3.5 h-3.5" />
                        {log.responseTimeMs}ms
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <div className="flex items-center gap-2 select-none">
                        {isSuccess ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                        )}
                        <Badge className={`text-[9px] font-bold tracking-wider py-0.5 px-2 uppercase rounded border ${statusClass}`}>
                          {log.statusCode} {log.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-muted-foreground font-mono">
                      {new Date(log.createdAt).toLocaleTimeString()}
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
