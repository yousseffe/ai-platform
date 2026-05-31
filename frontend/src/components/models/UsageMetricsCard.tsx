import React from "react";

/**
 * Renders the Usage Metrics card showing api calls count and p95 latencies.
 *
 * @returns The React component layout for usage metrics.
 */
export function UsageMetricsCard() {
  return (
    <div className="w-full lg:w-72 font-mono text-xs">
      <div className="card h-full">
        <h3 className="font-bold text-foreground mb-4 text-sm">Usage Metrics</h3>
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-muted-foreground">API Calls (24h)</span>
            <span className="text-foreground font-bold">42.8k</span>
          </div>
          <div className="w-full bg-background border border-border rounded-full h-2 mt-2">
            <div className="bg-primary h-full rounded-full" style={{ width: "85%" }}></div>
          </div>
        </div>
        <div className="mb-6 flex justify-between items-center">
          <span className="text-muted-foreground">Latency (p95)</span>
          <span className="text-foreground font-bold">124ms</span>
        </div>
        <button className="btn-outline w-full cursor-pointer">View Analytics</button>
      </div>
    </div>
  );
}
