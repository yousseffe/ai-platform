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
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-800 text-base">Prediction Sandbox History</h3>
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-semibold">
            {history.length}
          </span>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear History
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden border border-slate-200 shadow-sm">
        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No prediction history. Run a prediction above to log requests.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="px-6 py-4 font-semibold">Timestamp</th>
                  <th className="px-6 py-4 font-semibold">Request ID</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Latency</th>
                  <th className="px-6 py-4 font-semibold">Result Class</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {history.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">{r.time}</td>
                    <td className="px-6 py-4 font-mono text-slate-900 font-medium">{r.reqId}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`badge ${
                          r.status === "SUCCESS"
                            ? "badge-success bg-emerald-50 text-emerald-700"
                            : "badge-danger bg-red-50 text-red-700"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            r.status === "SUCCESS" ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        ></span>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{r.latency}</td>
                    <td className={`px-6 py-4 font-semibold ${r.status === "FAILED" ? "text-red-500" : "text-slate-700"}`}>
                      {typeof r.outcome === "object" ? JSON.stringify(r.outcome) : r.outcome}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onReplay(r)}
                        className="text-xs font-bold text-primary-600 hover:text-primary-800 hover:underline cursor-pointer"
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
