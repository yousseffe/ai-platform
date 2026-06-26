"use client";

import { useState } from "react";
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
} from "lucide-react";

export function AdminSystemLogs() {
  const { logs, isLoading, error, filters, setFilters, refresh } = useSystemLogs();
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState("");

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

  interface ParsedLog {
    timestamp: string;
    level: string;
    message: string;
    context?: string;
    traceId?: string;
    spanId?: string;
    rawJson?: any;
    isJson: boolean;
  }

  const parseLogLine = (lineStr: string): ParsedLog => {
    let traceId: string | undefined = undefined;
    try {
      const parsed = JSON.parse(lineStr);
      let level = (parsed.severity || parsed.level || "").toLowerCase();
      if (level === "warning") level = "warn";
      
      const message = parsed.body || parsed.message || parsed.msg || lineStr;
      const context = parsed.attributes?.context || parsed.context || parsed.logger || parsed.name;
      traceId = parsed.traceid || parsed.trace_id || parsed.attributes?.trace_id || parsed.attributes?.traceId;
      const spanId = parsed.spanid || parsed.span_id || parsed.attributes?.span_id || parsed.attributes?.spanId;

      if (!level) {
        const lowerMsg = String(message).toLowerCase();
        if (lowerMsg.includes("error") || lowerMsg.includes("failed") || lowerMsg.includes("exception") || lowerMsg.includes("critical") || lowerMsg.includes("stderr")) {
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
      // Check via regex fallback for hex string of 32 characters
      const match = lineStr.match(/\b([a-f0-9]{32})\b/);
      if (match) {
        traceId = match[1];
      }

      let level = "info";
      const lowerLine = lineStr.toLowerCase();
      if (lowerLine.includes("error") || lowerLine.includes("failed") || lowerLine.includes("exception") || lowerLine.includes("critical") || lowerLine.includes("stderr")) {
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
        traceId,
        isJson: false,
      };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-180px)]">
      {/* Left Sidebar Filter Pane */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-4 rounded-xl flex flex-col space-y-6">
        <div>
          <h4 className="text-slate-200 font-semibold mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
            <Layers className="w-4 h-4 text-purple-400" /> Platform Services
          </h4>
          <div className="space-y-2">
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
                className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                  filters.service === srv.id
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                    : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
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
                  className={`w-2 h-2 rounded-full ${
                    filters.service === srv.id ? "bg-purple-500" : "bg-slate-700"
                  }`}
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-slate-200 font-semibold mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
            <Filter className="w-4 h-4 text-emerald-400" /> Severity Level
          </h4>
          <div className="space-y-2">
            {[
              { id: "info", label: "INFO", color: "bg-purple-500" },
              { id: "warn", label: "WARNING", color: "bg-amber-500" },
              { id: "error", label: "ERROR", color: "bg-red-500" },
              { id: "debug", label: "DEBUG", color: "bg-blue-500" },
            ].map((lvl) => (
              <label
                key={lvl.id}
                className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                  filters.level === lvl.id
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
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

        <button
          onClick={refresh}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 px-4 rounded-lg cursor-pointer transition-colors font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Right Terminal Console Viewport */}
      <div className="lg:col-span-3 flex flex-col bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Terminal Header */}
        <div className="bg-slate-900/60 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-xs text-slate-200">Aggregate Log Stream</span>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search terminal..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-500 w-56"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Terminal Contents */}
        <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1.5 select-text">
          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-950/20 border border-red-900/30 text-red-400 rounded-lg mb-3">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>Error fetching logs: {error}</span>
            </div>
          )}

          {isLoading && filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mb-2 opacity-50" />
              <span>Querying Loki log shards...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-600">
              No logs matching active filter criteria.
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
                info: "border-l-purple-500/50 hover:bg-slate-900/40",
                warn: "border-l-amber-500/80 bg-amber-950/5 hover:bg-amber-950/10",
                error: "border-l-red-500/80 bg-red-950/5 hover:bg-red-950/10",
                debug: "border-l-blue-500/50 hover:bg-slate-900/40",
              };

              return (
                <div key={index} className="border border-slate-900/60 rounded-lg overflow-hidden transition-all duration-200">
                  {/* Log Header Line */}
                  <div
                    className={`flex items-start md:items-center gap-3 border-l-2 pl-2.5 pr-2 py-2 select-text ${
                      levelBorderColor[parsed.level] || "border-l-slate-800 hover:bg-slate-900/40"
                    }`}
                  >
                    {/* Timestamp */}
                    <span className="text-[10px] text-slate-500 font-mono select-none shrink-0 mt-0.5 md:mt-0">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                    </span>

                    {/* Severity Badge */}
                    <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                      levelColors[parsed.level] || "bg-slate-800 text-slate-400 border-slate-700"
                    }`}>
                      {parsed.level}
                    </span>

                    {/* Context Badge */}
                    {parsed.context && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-800/80 border border-slate-700/50 rounded text-slate-400 shrink-0">
                        {parsed.context}
                      </span>
                    )}

                    {/* Log Message */}
                    <span className={`break-all whitespace-pre-wrap flex-1 leading-relaxed ${
                      parsed.level === 'error' ? 'text-red-200 font-medium' : parsed.level === 'warn' ? 'text-amber-200 font-medium' : 'text-slate-300'
                    }`}>
                      {parsed.message}
                    </span>

                    {/* Buttons / Controls */}
                    <div className="flex items-center gap-1.5 shrink-0 select-none">
                      {parsed.traceId && (
                        <button
                          onClick={() => setSelectedTraceId(parsed.traceId!)}
                          className="p-1 bg-slate-900 border border-slate-800 hover:border-purple-500/40 hover:bg-purple-500/10 text-purple-400 text-[10px] rounded flex items-center gap-1 cursor-pointer transition-colors"
                          title="Inspect distributed request trace"
                        >
                          <Network className="w-3 h-3" />
                          <span className="hidden sm:inline">Trace</span>
                        </button>
                      )}

                      {parsed.isJson && (
                        <button
                          onClick={() => toggleExpand(index)}
                          className="p-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-[10px] rounded flex items-center gap-1 cursor-pointer transition-colors"
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
                    <div className="bg-slate-950/80 border-t border-slate-900 px-4 py-3 text-[11px] font-mono text-slate-400 space-y-3">
                      {parsed.traceId && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 font-semibold select-none">Trace ID:</span>
                          <span className="text-purple-400 break-all select-all">{parsed.traceId}</span>
                        </div>
                      )}
                      {parsed.spanId && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 font-semibold select-none">Span ID:</span>
                          <span className="text-blue-400 break-all select-all">{parsed.spanId}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {parsed.rawJson.attributes && Object.keys(parsed.rawJson.attributes).length > 0 && (
                          <div>
                            <div className="text-slate-500 font-semibold mb-1 text-[9px] uppercase tracking-wider select-none">Attributes</div>
                            <div className="space-y-1 bg-slate-900/60 p-2.5 rounded border border-slate-800/80 max-h-48 overflow-y-auto">
                              {Object.entries(parsed.rawJson.attributes).map(([k, v]) => (
                                <div key={k} className="flex flex-wrap gap-1">
                                  <span className="text-slate-500 select-none">{k}:</span>
                                  <span className="text-slate-300 break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {parsed.rawJson.resources && Object.keys(parsed.rawJson.resources).length > 0 && (
                          <div>
                            <div className="text-slate-500 font-semibold mb-1 text-[9px] uppercase tracking-wider select-none">Resources</div>
                            <div className="space-y-1 bg-slate-900/60 p-2.5 rounded border border-slate-800/80 max-h-48 overflow-y-auto">
                              {Object.entries(parsed.rawJson.resources).map(([k, v]) => (
                                <div key={k} className="flex flex-wrap gap-1">
                                  <span className="text-slate-500 select-none">{k}:</span>
                                  <span className="text-slate-300 break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
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
        </div>
      </div>

      {/* Slide-over trace panel */}
      {selectedTraceId && (
        <TraceFlowVisualizer
          traceId={selectedTraceId}
          onClose={() => setSelectedTraceId(null)}
        />
      )}
    </div>
  );
}
