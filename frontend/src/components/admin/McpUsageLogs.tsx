"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";

interface LokiLogEntry {
  timestamp: string;
  level?: string;
  message: string;
  service?: string;
}

const LEVEL_STYLE: Record<string, string> = {
  error: "text-red-400",
  warn: "text-amber-400",
  warning: "text-amber-400",
  info: "text-blue-400",
  debug: "text-muted-foreground/60",
};

const LEVEL_ICON: Record<string, React.ReactNode> = {
  error: <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />,
  warn: <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />,
  warning: <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />,
  info: <Info className="w-3 h-3 text-blue-400 shrink-0" />,
};

/**
 * MCP Usage Logs panel.
 * Fetches recent MCP server activity from the Loki-backed admin logs endpoint
 * and displays them in a filterable, auto-refreshable terminal view.
 *
 * @returns The React component.
 */
export default function McpUsageLogs() {
  const [logs, setLogs] = useState<LokiLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [limit, setLimit] = useState(100);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await smartFetch<LokiLogEntry[]>(
        `/analytics/admin/logs?service=mcp&limit=${limit}`,
      );
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load MCP logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchLogs]);
  const filtered = levelFilter === "all"
    ? logs
    : logs.filter((l) => (l.level ?? "info").toLowerCase() === levelFilter);

  const errorCount = logs.filter((l) => (l.level ?? "").toLowerCase() === "error").length;
  const warnCount = logs.filter((l) => ["warn", "warning"].includes((l.level ?? "").toLowerCase())).length;

  return (
    <div className="space-y-4 h-full flex flex-col text-left">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Entries", value: logs.length, color: "text-foreground" },
          { label: "Warnings", value: warnCount, color: "text-amber-500" },
          { label: "Errors", value: errorCount, color: "text-red-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-border/80 rounded-2xl p-4 bg-card/65 backdrop-blur-md text-center hover-lift transition-all duration-300">
            <p className={`text-xl font-extrabold ${color}`}>{value}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1.5 bg-secondary/35 p-1 rounded-xl border border-border/80">
          {["all", "info", "warn", "error", "debug"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer ${
                levelFilter === lvl
                  ? "bg-card text-foreground shadow-xs border border-border"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="h-8 px-3.5 rounded-xl border border-border bg-card text-[10px] text-foreground font-sans ml-auto focus:outline-none focus:border-primary transition-all cursor-pointer"
        >
          <option value={50}>Last 50</option>
          <option value={100}>Last 100</option>
          <option value={250}>Last 250</option>
        </select>
        <Button onClick={fetchLogs} disabled={loading} variant="outline" className="btn-outline h-8 text-[10px] flex items-center gap-1.5 cursor-pointer">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          <span>Refresh</span>
        </Button>
      </div>

      {/* Log terminal */}
      <div className="flex-1 border border-border rounded-2xl bg-[#0a0a0a] dark:bg-black/60 overflow-hidden flex flex-col min-h-0 shadow-lg">
        <div className="px-4 py-2.5 border-b border-border bg-muted/15 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">mcp-server — {filtered.length} entries</span>
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-0.5 font-mono text-[10px]">
          {loading && (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-muted-foreground">Fetching logs from Loki...</span>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-muted-foreground/40 py-8 text-center">No log entries found for this filter.</p>
          )}
          {!loading && filtered.map((log, i) => {
            const level = (log.level ?? "info").toLowerCase();
            return (
              <div key={i} className="flex items-start gap-2 hover:bg-white/[0.02] px-1 py-0.5 rounded group">
                <span className="text-muted-foreground/30 text-[8px] shrink-0 pt-0.5 w-20 tabular-nums">
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "--:--:--"}
                </span>
                <span className="shrink-0 pt-0.5">{LEVEL_ICON[level] ?? <span className="w-3 h-3 block" />}</span>
                <span className={`break-all leading-relaxed ${LEVEL_STYLE[level] ?? "text-foreground/70"}`}>
                  {log.message}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
