"use client";

import { useState, useEffect, useRef } from "react";
import { useSystemLogs } from "@/hooks/use-system-logs";
import { TraceFlowVisualizer } from "./TraceFlowVisualizer";
import {
  Terminal,
  Activity,
  Layers,
  Filter,
  RefreshCw,
  Search,
  AlertOctagon,
  Network,
  Clock,
  ChevronDown,
  ChevronUp,
  Cpu,
  ShieldAlert,
  ArrowDown
} from "lucide-react";

export function AdminSystemLogs() {
  const { logs, isLoading, error, filters, setFilters, refresh } = useSystemLogs();
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState("");
  const [autoscroll, setAutoscroll] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const handleServiceChange = (service: string) => {
    setFilters((prev) => ({
      ...prev,
      service: prev.service === service ? "" : service,
    }));
  };

  const handleLevelChange = (level: string) => {
    setFilters((prev) => ({
      ...prev,
      level: prev.level === level ? "" : level,
    }));
  };

  // Local client-side search query
  const filteredLogs = logs.filter((log) => {
    if (!localSearch) return true;
    return log.line.toLowerCase().includes(localSearch.toLowerCase());
  });

  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});

  const toggleExpand = (index: number) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Auto-scroll to terminal bottom if enabled
  useEffect(() => {
    if (autoscroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredLogs, autoscroll]);

  interface ParsedLog {
    timestamp: string;
    level: string;
    message: string;
    context?: string;
    traceId?: string;
    spanId?: string;
    rawJson?: {
      attributes?: Record<string, unknown>;
      resources?: Record<string, unknown>;
      [key: string]: unknown;
    };
    isJson: boolean;
  }

  const isValidOtelTraceId = (id: string | undefined): id is string =>
    typeof id === "string" && /^[a-f0-9]{32}$/.test(id);

  const parseLogLine = (lineStr: string): ParsedLog => {
    try {
      const parsed = JSON.parse(lineStr);
      let level = (parsed.severity || parsed.level || parsed.Level || "").toLowerCase();
      if (level === "warning") level = "warn";

      const message =
        parsed.body || parsed.message || parsed.msg || parsed.Message || lineStr;
      const context =
        parsed.logger ||
        parsed.context ||
        parsed.attributes?.context ||
        parsed.attributes?.logger ||
        parsed.name;

      const traceId: string | undefined =
        parsed.trace_id ||
        parsed.traceid ||
        parsed["trace-id"] ||
        parsed.attributes?.trace_id ||
        parsed.attributes?.traceid ||
        parsed.attributes?.traceId ||
        undefined;

      const spanId: string | undefined =
        parsed.span_id ||
        parsed.spanid ||
        parsed["span-id"] ||
        parsed.attributes?.span_id ||
        parsed.attributes?.spanId ||
        undefined;

      if (!level) {
        const lowerMsg = String(message).toLowerCase();
        if (
          lowerMsg.includes("error") ||
          lowerMsg.includes("failed") ||
          lowerMsg.includes("exception") ||
          lowerMsg.includes("critical") ||
          lowerMsg.includes("stderr")
        ) {
          level = "error";
        } else if (lowerMsg.includes("warning") || lowerMsg.includes("warn")) {
          level = "warn";
        } else if (lowerMsg.includes("debug")) {
          level = "debug";
        } else {
          level = "info";
        }
      }

      return {
        timestamp: parsed.timestamp || parsed.time || "",
        level,
        message,
        context,
        traceId,
        spanId,
        rawJson: parsed,
        isJson: true,
      };
    } catch {
      let level = "info";
      const lowerLine = lineStr.toLowerCase();
      if (
        lowerLine.includes("error") ||
        lowerLine.includes("failed") ||
        lowerLine.includes("exception") ||
        lowerLine.includes("critical") ||
        lowerLine.includes("stderr")
      ) {
        level = "error";
      } else if (lowerLine.includes("warning") || lowerLine.includes("warn")) {
        level = "warn";
      } else if (lowerLine.includes("debug")) {
        level = "debug";
      }

      return {
        timestamp: "",
        level,
        message: lineStr,
        traceId: undefined,
        isJson: false,
      };
    }
  };

  // Stats calculation
  const errorCount = filteredLogs.filter(l => {
    const p = parseLogLine(l.line);
    return p.level === "error";
  }).length;

  const warnCount = filteredLogs.filter(l => {
    const p = parseLogLine(l.line);
    return p.level === "warn";
  }).length;

  return (
    <div className="space-y-6 text-left">
      {/* 1. Real-time Telemetry Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10 font-sans">
        <div className="border border-border/80 bg-card/65 rounded-2xl p-4 shadow-xs backdrop-blur-md hover-lift transition-all duration-300">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Loki Connection</span>
          <div className="flex items-center gap-2 mt-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-foreground">TAILING LIVE</span>
          </div>
        </div>
        <div className="border border-border/80 bg-card/65 rounded-2xl p-4 shadow-xs backdrop-blur-md hover-lift transition-all duration-300">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Logs Loaded</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-foreground">{filteredLogs.length}</span>
            <span className="text-[9px] text-muted-foreground">Buffered lines</span>
          </div>
        </div>
        <div className="border border-border/80 bg-card/65 rounded-2xl p-4 shadow-xs backdrop-blur-md hover-lift transition-all duration-300">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Error Flags</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-red-500">{errorCount}</span>
            <span className="text-[9px] text-muted-foreground">Fail alerts</span>
          </div>
        </div>
        <div className="border border-border/80 bg-card/65 rounded-2xl p-4 shadow-xs backdrop-blur-md hover-lift transition-all duration-300">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Warning Warnings</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-amber-500">{warnCount}</span>
            <span className="text-[9px] text-muted-foreground">Warnings flagged</span>
          </div>
        </div>
      </div>

      {/* 2. Main Console Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-260px)] font-sans relative">
        {/* Left Sidebar Filter Pane */}
        <div className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md p-5 rounded-2xl flex flex-col justify-between text-left hover-lift transition-all duration-300 min-h-0 overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h4 className="text-foreground font-bold mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                <Layers className="w-4 h-4 text-purple-500" /> Platform Services
              </h4>
              <div className="space-y-1.5">
                {[
                  { id: "nestjs", label: "NestJS API Server" },
                  { id: "postgres", label: "PostgreSQL Database" },
                  { id: "redis", label: "Redis Queue Cache" },
                  { id: "minio", label: "MinIO S3 Storage" },
                  { id: "nginx", label: "Nginx Gateway Router" },
                  { id: "fastapi", label: "Model Sandboxes (FastAPI)" },
                ].map((srv) => (
                  <label
                    key={srv.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                      filters.service === srv.id
                        ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 font-bold"
                        : "bg-card border-border/80 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                    }`}
                  >
                    <span>{srv.label}</span>
                    <input
                      type="checkbox"
                      checked={filters.service === srv.id}
                      onChange={() => handleServiceChange(srv.id)}
                      className="sr-only"
                    />
                    <span
                      className={`w-2 h-2 rounded-full transition-all ${
                        filters.service === srv.id ? "bg-purple-500 scale-125" : "bg-border/60"
                      }`}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-foreground font-bold mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                <Filter className="w-4 h-4 text-emerald-500" /> Severity Level
              </h4>
              <div className="space-y-1.5">
                {[
                  { id: "info", label: "INFO", color: "bg-purple-500" },
                  { id: "warn", label: "WARNING", color: "bg-amber-500" },
                  { id: "error", label: "ERROR", color: "bg-red-500" },
                  { id: "debug", label: "DEBUG", color: "bg-blue-500" },
                ].map((lvl) => (
                  <label
                    key={lvl.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                      filters.level === lvl.id
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold"
                        : "bg-card border-border/80 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                    }`}
                  >
                    <span>{lvl.label}</span>
                    <input
                      type="checkbox"
                      checked={filters.level === lvl.id}
                      onChange={() => handleLevelChange(lvl.id)}
                      className="sr-only"
                    />
                    <span className={`w-2 h-2 rounded-full ${lvl.color}`} />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={refresh}
            disabled={isLoading}
            className="btn-outline w-full flex items-center justify-center gap-2 h-9 font-bold text-[10px] cursor-pointer mt-4 rounded-xl shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Loki Shards</span>
          </button>
        </div>

        {/* Right Terminal Console Viewport */}
        <div className="lg:col-span-3 flex flex-col bg-slate-950 dark:bg-black border border-border/85 rounded-3xl overflow-hidden shadow-2xl relative min-h-0">
          {/* Terminal Header */}
          <div className="bg-muted/15 px-5 py-4 border-b border-border/85 flex flex-wrap items-center justify-between gap-3 text-left shrink-0">
            <div className="flex items-center gap-3">
              <Terminal className="w-4 h-4 text-purple-500" />
              <span className="font-bold text-xs text-foreground">Aggregate Operations Logs</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setAutoscroll(!autoscroll)}
                className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  autoscroll
                    ? "bg-primary/10 border-primary/20 text-primary"
                    : "bg-card border-border/80 text-muted-foreground hover:text-foreground"
                }`}
                title="Lock scrolling window to tail newest logged lines"
              >
                <ArrowDown className={`w-3 h-3 ${autoscroll ? "animate-bounce" : ""}`} />
                Tail Logs
              </button>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search stream..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="bg-background border border-border text-foreground text-xs pl-8 pr-3 py-1.5 rounded-xl focus:outline-hidden focus:border-primary w-48 font-sans"
                />
                <Search className="w-3.5 h-3.5 text-muted-foreground/60 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Terminal Contents */}
          <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-2 select-text min-h-0 custom-scrollbar">
            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl mb-3">
                <AlertOctagon className="w-4 h-4 shrink-0" />
                <span>Error fetching logs: {error}</span>
              </div>
            )}

            {isLoading && filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mb-2.5 opacity-50 text-primary" />
                <span className="text-[10px] font-sans">Querying Loki log shards...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-600 font-sans">
                No logs match active Loki criteria.
              </div>
            ) : (
              filteredLogs.map((log, index) => {
                const parsed = parseLogLine(log.line);

                const levelColors: Record<string, string> = {
                  info: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                  warn: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                  error: "bg-red-500/10 text-red-400 border-red-500/20",
                  debug: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                };

                const levelBorderColor: Record<string, string> = {
                  info: "border-l-purple-500/40 hover:bg-slate-900/20",
                  warn: "border-l-amber-500/80 bg-amber-950/5 hover:bg-amber-950/10",
                  error: "border-l-red-500/80 bg-red-950/5 hover:bg-red-950/10",
                  debug: "border-l-blue-500/40 hover:bg-slate-900/20",
                };

                return (
                  <div key={index} className="border border-slate-900/40 rounded-xl overflow-hidden transition-all duration-200">
                    {/* Log Header Line */}
                    <div
                      className={`flex items-start md:items-center gap-3 border-l-2 pl-3 pr-2 py-2 select-text ${
                        levelBorderColor[parsed.level] || "border-l-slate-800 hover:bg-slate-900/20"
                      }`}
                    >
                      {/* Timestamp */}
                      <span className="text-[10px] text-slate-500 font-mono select-none shrink-0 mt-0.5 md:mt-0">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour12: false }) : "—"}
                      </span>

                      {/* Severity Badge */}
                      <span className={`text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                        levelColors[parsed.level] || "bg-slate-800 text-slate-400 border-slate-700"
                      }`}>
                        {parsed.level}
                      </span>

                      {/* Context Badge */}
                      {parsed.context && (
                        <span className="text-[8px] font-mono px-1.5 py-0.5 bg-slate-800/80 border border-slate-700/50 rounded text-slate-400 shrink-0">
                          {parsed.context}
                        </span>
                      )}

                      {/* Log Message */}
                      <span className={`break-all whitespace-pre-wrap flex-1 leading-relaxed text-left ${
                        parsed.level === 'error' ? 'text-red-200 font-medium' : parsed.level === 'warn' ? 'text-amber-200 font-medium' : 'text-slate-300'
                      }`}>
                        {parsed.message}
                      </span>

                      {/* Buttons / Controls */}
                      <div className="flex items-center gap-1.5 shrink-0 select-none">
                        {isValidOtelTraceId(parsed.traceId) && (
                          <button
                            onClick={() => setSelectedTraceId(parsed.traceId!)}
                            className="p-1 bg-secondary border border-border/80 hover:border-purple-500/45 hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                            title={`Inspect distributed trace · ${parsed.traceId}`}
                          >
                            <Network className="w-3 h-3" />
                            <span className="hidden sm:inline">Trace</span>
                          </button>
                        )}

                        {parsed.isJson && (
                          <button
                            onClick={() => toggleExpand(index)}
                            className="p-1 bg-secondary border border-border/80 hover:border-border text-muted-foreground hover:text-foreground text-[9px] rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                            title="View full log metadata"
                          >
                            {expandedLogs[index] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">Details</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded details section */}
                    {expandedLogs[index] && parsed.isJson && (
                      <div className="bg-muted/30 border-t border-border px-4 py-3 text-[10px] font-mono text-muted-foreground space-y-3">
                        {parsed.traceId && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground/80 font-semibold select-none">Trace ID:</span>
                            <span className="text-purple-500 break-all select-all">{parsed.traceId}</span>
                          </div>
                        )}
                        {parsed.spanId && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground/80 font-semibold select-none">Span ID:</span>
                            <span className="text-blue-500 break-all select-all">{parsed.spanId}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {parsed.rawJson?.attributes && Object.keys(parsed.rawJson.attributes).length > 0 && (
                            <div>
                              <div className="text-muted-foreground/75 font-semibold mb-1 text-[8px] uppercase tracking-wider select-none text-left">Attributes</div>
                              <div className="space-y-1 bg-secondary/40 p-2.5 rounded-xl border border-border max-h-48 overflow-y-auto text-left">
                                {Object.entries(parsed.rawJson.attributes).map(([k, v]) => (
                                  <div key={k} className="flex flex-wrap gap-1">
                                    <span className="text-muted-foreground/60 select-none">{k}:</span>
                                    <span className="text-foreground/90 break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {parsed.rawJson?.resources && Object.keys(parsed.rawJson.resources).length > 0 && (
                            <div>
                              <div className="text-muted-foreground/75 font-semibold mb-1 text-[8px] uppercase tracking-wider select-none text-left">Resources</div>
                              <div className="space-y-1 bg-secondary/40 p-2.5 rounded-xl border border-border max-h-48 overflow-y-auto text-left">
                                {Object.entries(parsed.rawJson.resources).map(([k, v]) => (
                                  <div key={k} className="flex flex-wrap gap-1">
                                    <span className="text-muted-foreground/60 select-none">{k}:</span>
                                    <span className="text-foreground/90 break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>

      {/* Trace modal — rendered into document.body via portal */}
      {selectedTraceId && (
        <TraceFlowVisualizer
          traceId={selectedTraceId}
          onClose={() => setSelectedTraceId(null)}
        />
      )}
    </div>
  );
}
