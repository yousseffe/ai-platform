"use client";

import { useSystemAlerts } from "@/hooks/use-system-alerts";
import { Bell, AlertOctagon, CheckCircle2, ShieldAlert, Clock, RefreshCw } from "lucide-react";

export function AlertsPanel() {
  const { alerts, isLoading, error, refresh } = useSystemAlerts();

  if (isLoading && alerts.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500 text-xs">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        <span>Loading firing alert alerts...</span>
      </div>
    );
  }

  if (error && alerts.length === 0) {
    return (
      <div className="p-4 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
        <AlertOctagon className="w-5 h-5 shrink-0" />
        <span>Could not sync platform alert state: {error}</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl overflow-hidden shadow-lg">
      <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500" />
          <h4 className="text-slate-200 font-semibold text-xs uppercase tracking-wider">Active System Alerts</h4>
        </div>
        <button
          onClick={refresh}
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors cursor-pointer"
          title="Refresh alerts"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="divide-y divide-slate-800/50 max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
            <span>All systems nominal. No firing alerts.</span>
          </div>
        ) : (
          alerts.map((alert) => {
            const isResolved = alert.status === "resolved";
            const isCritical = alert.severity === "critical";

            return (
              <div
                key={alert.id}
                className={`p-3.5 flex items-start gap-3 transition-colors ${
                  isResolved
                    ? "bg-slate-950/10 hover:bg-slate-950/20"
                    : isCritical
                    ? "bg-red-500/5 hover:bg-red-500/10"
                    : "bg-amber-500/5 hover:bg-amber-500/10"
                }`}
              >
                {/* Status Icon */}
                <div className="shrink-0 mt-0.5">
                  {isResolved ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : isCritical ? (
                    <AlertOctagon className="w-4 h-4 text-red-500" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span
                      className={`font-semibold text-xs ${
                        isResolved
                          ? "text-slate-400 line-through"
                          : isCritical
                          ? "text-red-400"
                          : "text-amber-400"
                      }`}
                    >
                      {alert.alertName}
                    </span>

                    <span
                      className={`text-[9px] uppercase tracking-wider font-semibold rounded px-1.5 py-0.5 ${
                        isResolved
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : isCritical
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    {alert.summary}
                  </p>

                  {/* Metadata labels */}
                  {alert.labels && Object.keys(alert.labels).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(alert.labels).map(([key, val]) => {
                        // Skip alertname and severity as they are rendered above
                        if (key === "alertname" || key === "severity") return null;
                        return (
                          <span
                            key={key}
                            className="bg-slate-800/80 border border-slate-700/50 text-slate-400 text-[9px] font-mono rounded px-1.5 py-0.5"
                          >
                            {key}: {val}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium pt-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      Triggered: {new Date(alert.startsAt).toLocaleString()}
                      {isResolved && alert.endsAt && (
                        <> &bull; Resolved: {new Date(alert.endsAt).toLocaleString()}</>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
