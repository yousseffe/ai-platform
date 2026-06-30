"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Bell, Loader2, AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";

interface SecurityAlert {
  id: string;
  alertName: string;
  severity: "critical" | "warning" | "info";
  status: "firing" | "resolved";
  summary: string;
  labels: Record<string, string>;
  startsAt: string;
  endsAt: string | null;
}

interface RiskEvent {
  id: string;
  modelId: string;
  riskScore: number;
  threatClass: string;
  createdAt: string;
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  critical: {
    bg: "bg-red-500/8 border-red-500/20",
    text: "text-red-500",
    icon: <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />,
  },
  warning: {
    bg: "bg-amber-500/8 border-amber-500/20",
    text: "text-amber-500",
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
  },
  info: {
    bg: "bg-blue-500/8 border-blue-500/20",
    text: "text-blue-500",
    icon: <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />,
  },
};

/**
 * Security Alerts Panel.
 * Displays recent security/fraud alerts from the platform alert store and
 * the most recent cross-model risk events from the fraud engine.
 *
 * @returns The React component.
 */
export default function SecurityAlertsPanel() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"alerts" | "events">("alerts");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsData, eventsData] = await Promise.all([
        smartFetch<SecurityAlert[]>("/analytics/admin/alerts"),
        smartFetch<RiskEvent[]>("/fraud/admin/events?limit=30"),
      ]);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
      setRiskEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const firingAlerts = alerts.filter((a) => a.status === "firing");
  const resolvedAlerts = alerts.filter((a) => a.status === "resolved");

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-red-500/20 bg-red-500/[0.04] rounded-xl p-3 text-center">
          <p className="text-2xl font-bold font-mono text-red-500">{firingAlerts.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mt-0.5">Firing Alerts</p>
        </div>
        <div className="border border-border bg-card rounded-xl p-3 text-center">
          <p className="text-2xl font-bold font-mono text-foreground">{riskEvents.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mt-0.5">Risk Events</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 border border-border rounded-lg p-0.5 bg-secondary/30 w-fit">
        {(["alerts", "events"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-md text-[10px] font-bold capitalize transition-colors ${
              activeTab === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "alerts" ? `Alerts (${alerts.length})` : `Risk Events (${riskEvents.length})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}

        {!loading && activeTab === "alerts" && alerts.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
            <p className="text-xs text-muted-foreground font-sans">No alerts on record</p>
          </div>
        )}

        {!loading && activeTab === "alerts" && alerts.map((alert) => {
          const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;
          return (
            <div key={alert.id} className={`rounded-xl border p-3 space-y-1.5 ${style.bg}`}>
              <div className="flex items-start gap-2">
                {style.icon}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold ${style.text}`}>{alert.alertName}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold border ${style.bg} ${style.text}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className={`text-[8px] font-bold ml-auto ${alert.status === "firing" ? "text-red-500" : "text-emerald-500"}`}>
                      {alert.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-foreground/80 font-sans mt-0.5">{alert.summary}</p>
                  {Object.keys(alert.labels).length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {Object.entries(alert.labels).map(([k, v]) => (
                        <span key={k} className="text-[8px] px-1.5 py-0.5 rounded bg-secondary border border-border font-mono text-muted-foreground">
                          {k}={v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[8px] text-muted-foreground font-mono pl-5">
                {new Date(alert.startsAt).toLocaleString()}
                {alert.endsAt && ` → ${new Date(alert.endsAt).toLocaleString()}`}
              </p>
            </div>
          );
        })}

        {!loading && activeTab === "events" && riskEvents.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
            <p className="text-xs text-muted-foreground font-sans">No risk events detected</p>
          </div>
        )}

        {!loading && activeTab === "events" && riskEvents.map((event) => {
          const score = event.riskScore;
          const colorClass = score >= 75 ? "text-red-500 border-red-500/20 bg-red-500/[0.04]"
            : score >= 50 ? "text-amber-500 border-amber-500/20 bg-amber-500/[0.04]"
            : "text-yellow-500 border-yellow-500/20 bg-yellow-500/[0.04]";
          return (
            <div key={event.id} className={`rounded-xl border p-3 flex items-center gap-3 ${colorClass}`}>
              <div className="text-center shrink-0">
                <p className={`text-xl font-bold font-mono ${colorClass.split(" ")[0]}`}>{score}</p>
                <p className="text-[8px] text-muted-foreground">score</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-bold ${colorClass.split(" ")[0]}`}>{event.threatClass}</p>
                <p className="text-[9px] text-muted-foreground font-mono truncate">model: {event.modelId}</p>
              </div>
              <p className="text-[8px] text-muted-foreground font-mono shrink-0">
                {new Date(event.createdAt).toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      <Button onClick={fetchData} disabled={loading} variant="outline" className="h-7 text-[10px] w-full flex items-center gap-1.5">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        Refresh
      </Button>
    </div>
  );
}
