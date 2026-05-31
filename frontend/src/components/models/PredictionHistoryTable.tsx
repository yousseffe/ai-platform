import React from "react";
import { Trash2 } from "lucide-react";
import type { HistoryItem } from "@/types";

interface PredictionHistoryTableProps {
  history: HistoryItem[];
  onClear: () => void;
  onReplay: (item: HistoryItem) => void;
}

/**
 * Renders the Prediction History section showing recent queries, latencies,
 * result outcomes, and confidence scores. Includes actions to replay inputs.
 *
 * @param props - PredictionHistoryTableProps component properties.
 * @returns The React component layout rendering sandbox query history logs.
 */
export function PredictionHistoryTable({
  history,
  onClear,
  onReplay,
}: PredictionHistoryTableProps) {
  return (
    <div className="font-mono text-xs text-foreground">
      <div className="flex items-center justify-between mb-4 select-none">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-foreground text-sm">Prediction Sandbox History</h3>
          <span className="bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full text-[10px] font-bold">
            {history.length}
          </span>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="text-[11px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear History
          </button>
        )}
      </div>

      <div className="border border-border bg-card rounded-xl p-0 overflow-hidden shadow-sm">
        {history.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground select-none text-xs">
            No prediction history. Run a query above to record executions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border select-none">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Request ID</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Latency</th>
                  <th className="px-6 py-4">Result Outcome</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((r, i) => (
                  <tr key={i} className="hover:bg-accent/40 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground">{r.time}</td>
                    <td className="px-6 py-4 font-bold text-foreground">{r.reqId}</td>
                    <td className="px-6 py-4 select-none">
                      <span
                        className={`badge ${
                          r.status === "SUCCESS"
                            ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                            : "bg-red-950/40 text-red-400 border-red-500/30"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            r.status === "SUCCESS" ? "bg-emerald-400" : "bg-red-400"
                          }`}
                        ></span>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{r.latency}</td>
                    <td className={`px-6 py-4 font-bold ${r.status === "FAILED" ? "text-red-400" : "text-foreground"}`}>
                      {typeof r.outcome === "object" ? JSON.stringify(r.outcome) : r.outcome}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onReplay(r)}
                        className="text-xs font-bold text-primary hover:underline cursor-pointer"
                      >
                        Replay Payload
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
