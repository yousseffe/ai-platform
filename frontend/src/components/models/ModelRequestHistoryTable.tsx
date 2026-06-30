"use client";

import React from "react";
import { useModelRequestHistory } from "@/hooks/use-model-request-history";
import { Activity, Clock, ShieldAlert, CheckCircle, RefreshCw, Cpu, Database } from "lucide-react";

interface ModelRequestHistoryTableProps {
  modelId: string;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "--";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function ModelRequestHistoryTable({ modelId }: ModelRequestHistoryTableProps) {
  const { history, isLoading, error, refresh } = useModelRequestHistory(modelId);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Header controls */}
      <div className="p-4 border-b border-border bg-background/50 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="font-sans font-bold text-xs text-foreground uppercase tracking-wider">
            Prediction Request History (Postgres Audit Log)
          </h3>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          className="h-8 px-3 border border-border bg-secondary/30 hover:bg-secondary/60 text-muted-foreground hover:text-foreground text-[10px] font-bold font-mono tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
          title="Refresh History Logs"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          <span>REFRESH</span>
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-secondary/20 border-b border-border text-muted-foreground font-mono font-bold select-none text-[9px] uppercase tracking-wider">
              <th className="p-3.5">Time</th>
              <th className="p-3.5">Consumer / Caller</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Status Code</th>
              <th className="p-3.5">Latency</th>
              <th className="p-3.5">Req Size</th>
              <th className="p-3.5">Resp Size</th>
              <th className="p-3.5">Credits Charged</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading && history.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                    <span>Loading prediction audit history logs...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-red-500 font-bold">
                  <div className="flex items-center justify-center gap-2">
                    <ShieldAlert className="w-5 h-5" />
                    <span>Error loading request history: {error}</span>
                  </div>
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Database className="w-6 h-6 text-muted-foreground/40" />
                    <p className="font-semibold text-sm text-foreground/80">No Predictions Recorded</p>
                    <p className="text-xs max-w-sm">
                      This model has not received any external prediction requests yet. Use the playground or invoke the prediction URL to generate traffic.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              history.map((log) => {
                const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
                return (
                  <tr key={log.id} className="hover:bg-secondary/10 transition-colors font-mono text-[11px]">
                    {/* Timestamp */}
                    <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    {/* Caller */}
                    <td className="p-3.5 text-foreground/90 font-sans font-medium break-all">
                      {log.caller}
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold capitalize ${
                        isSuccess
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
                      }`}>
                        {isSuccess ? (
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <ShieldAlert className="w-3 h-3 text-red-500" />
                        )}
                        {log.status.toLowerCase()}
                      </span>
                    </td>

                    {/* Status Code */}
                    <td className={`p-3.5 font-bold ${isSuccess ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {log.statusCode}
                    </td>

                    {/* Latency */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                        {log.responseTimeMs} ms
                      </span>
                    </td>

                    {/* Req Size */}
                    <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                      {formatBytes(log.requestSizeBytes)}
                    </td>

                    {/* Resp Size */}
                    <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                      {formatBytes(log.responseSizeBytes)}
                    </td>

                    {/* Cost/Earnings */}
                    <td className="p-3.5 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      {log.creditsCharged > 0 ? `${log.creditsCharged.toFixed(4)} credits` : "0.0000 credits"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
