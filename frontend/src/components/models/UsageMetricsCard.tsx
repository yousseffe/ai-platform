import React from "react";

/**
 * Renders the Usage Metrics card showing api calls count and p95 latencies.
 *
 * @returns The React component layout for usage metrics.
 */
export function UsageMetricsCard() {
  return (
    <div className="w-full lg:w-72">
      <div className="card h-full">
        <h3 className="font-bold text-slate-800 mb-4">Usage Metrics</h3>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-500">API Calls (24h)</span>
            <span className="text-slate-900 font-bold">42.8k</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: "85%" }}></div>
          </div>
        </div>
        <div className="mb-6 flex justify-between items-center text-sm">
          <span className="text-slate-500">Latency (p95)</span>
          <span className="text-slate-900 font-bold">124ms</span>
        </div>
        <button className="btn-outline w-full text-sm cursor-pointer">View Analytics</button>
      </div>
    </div>
  );
}
