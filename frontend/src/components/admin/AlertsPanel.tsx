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
      <div className="p-4 bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
        <AlertOctagon className="w-5 h-5 shrink-0" />
        <span>Could not sync platform alert state: {error}</span>
      </div>
    );
  }

  return (
    <div className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl overflow-hidden hover-lift transition-all duration-300">
      <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500" />
          <h4 className="text-foreground font-bold text-xs uppercase tracking-wider">Active System Alerts</h4>
        </div>
        <button
          onClick={refresh}
          className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer border border-border/60 bg-card"
          title="Refresh alerts"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="divide-y divide-border/60 max-h-[500px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
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
                    ? "hover:bg-muted/25 transition-all"
                    : isCritical
                    ? "bg-red-500/5 hover:bg-red-500/[0.08] transition-all"
                    : "bg-amber-500/5 hover:bg-amber-500/[0.08] transition-all"
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
                      className={`font-bold text-xs ${
                        isResolved
                          ? "text-muted-foreground line-through"
                          : isCritical
                          ? "text-red-500"
                          : "text-amber-500"
                      }`}
                    >
                      {alert.alertName}
                    </span>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                        isResolved
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : isCritical
                          ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {alert.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-foreground/80 font-sans leading-relaxed text-left">
                    {alert.summary}
                  </p>

                  {/* Metadata labels */}
                  {alert.labels && Object.keys(alert.labels).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(alert.labels).map(([key, val]) => {
                        if (key === "alertname" || key === "severity") return null;
                        return (
                          <span
                            key={key}
                            className="bg-secondary border border-border text-muted-foreground text-[9px] font-mono rounded px-2 py-0.5"
                          >
                            {key}: {val}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1.5 font-sans">
                    <Clock className="w-3 h-3 text-muted-foreground/75" />
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
