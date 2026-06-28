"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Network,
  Clock,
  Database,
  Server,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { smartFetch } from "@/lib/utils/smart-fetch";

/* ─── types ─────────────────────────────────────────────────────────── */
interface TraceSpan {
  traceId: string;
  spanId?: string;
  parentSpanId?: string;
  service: string;
  name: string;
  timestampNs: number;
  durationMs: number;
  offsetMs: number;
  status: "success" | "error";
  attributes: Record<string, any>;
}

interface TraceFlowVisualizerProps {
  traceId: string;
  onClose: () => void;
}

/* ─── helpers ────────────────────────────────────────────────────────── */
function serviceColor(service: string) {
  const s = service.toLowerCase();
  if (s.includes("backend") || s.includes("nestjs")) return "bg-purple-500";
  if (s.includes("postgres") || s.includes("db")) return "bg-teal-500";
  if (s.includes("redis")) return "bg-amber-500";
  if (s.includes("minio")) return "bg-cyan-500";
  if (s.includes("gateway") || s.includes("nginx")) return "bg-blue-500";
  if (s.includes("sandbox") || s.includes("fastapi")) return "bg-emerald-500";
  return "bg-slate-500";
}

function serviceBg(service: string) {
  const s = service.toLowerCase();
  if (s.includes("backend") || s.includes("nestjs"))
    return "bg-purple-500/10 border-purple-500/20";
  if (s.includes("postgres") || s.includes("db"))
    return "bg-teal-500/10 border-teal-500/20";
  if (s.includes("redis")) return "bg-amber-500/10 border-amber-500/20";
  if (s.includes("minio")) return "bg-cyan-500/10 border-cyan-500/20";
  if (s.includes("gateway") || s.includes("nginx"))
    return "bg-blue-500/10 border-blue-500/20";
  if (s.includes("sandbox") || s.includes("fastapi"))
    return "bg-emerald-500/10 border-emerald-500/20";
  return "bg-slate-800/60 border-slate-700/40";
}

function ServiceIcon({ service }: { service: string }) {
  const s = service.toLowerCase();
  const cls = "w-3 h-3";
  if (s.includes("postgres") || s.includes("db")) return <Database className={cls} />;
  if (s.includes("gateway") || s.includes("nginx")) return <Network className={cls} />;
  if (s.includes("sandbox") || s.includes("fastapi")) return <Cpu className={cls} />;
  if (s.includes("redis")) return <Clock className={cls} />;
  return <Server className={cls} />;
}

/* ─── component ───────────────────────────────────────────────────────── */
export function TraceFlowVisualizer({ traceId, onClose }: TraceFlowVisualizerProps) {
  const [spans, setSpans] = useState<TraceSpan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTrace = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await smartFetch<{ traceId: string; spans: TraceSpan[]; error?: string }>(
        `/analytics/admin/traces/${traceId}`
      );
      setSpans(data.spans || []);
      if (data.error) setError(data.error);
    } catch (err: any) {
      setError(err.message || "Failed to load trace");
      setSpans([]);
    } finally {
      setIsLoading(false);
    }
  }, [traceId]);

  useEffect(() => {
    fetchTrace();
  }, [fetchTrace]);

  // ESC key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(traceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalDuration =
    spans.length > 0
      ? Math.max(...spans.map((s) => (s.offsetMs || 0) + s.durationMs))
      : 0;

  const successCount = spans.filter((s) => s.status === "success").length;
  const errorCount = spans.filter((s) => s.status === "error").length;

  /* Group by service for a summary row */
  const serviceSet = [...new Set(spans.map((s) => s.service))];

  const modal = (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Distributed Trace Flow"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div
        className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: "modalIn 0.2s cubic-bezier(0.16,1,0.3,1)" }}
      >
        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Network className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-100 text-sm">
              Distributed Trace Flow
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] text-slate-500 font-mono truncate">
                {traceId}
              </span>
              <button
                onClick={handleCopy}
                className="p-0.5 text-slate-500 hover:text-purple-400 transition-colors cursor-pointer shrink-0"
                title="Copy Trace ID"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Stats bar ── */}
        {!isLoading && spans.length > 0 && (
          <div className="px-5 py-3 bg-slate-900/40 border-b border-slate-800/60 flex flex-wrap items-center gap-5 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>
                Total:{" "}
                <strong className="text-slate-200">{totalDuration}ms</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-500" />
              <span>
                Spans: <strong className="text-slate-200">{spans.length}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-400">{successCount} ok</span>
            </div>
            {errorCount > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-red-400">{errorCount} errors</span>
              </div>
            )}
            {/* Service pills */}
            <div className="flex flex-wrap gap-1.5 ml-auto">
              {serviceSet.map((svc) => (
                <span
                  key={svc}
                  className={`px-2 py-0.5 text-[9px] uppercase font-semibold tracking-wider rounded-full border ${serviceBg(svc)}`}
                >
                  {svc.replace(/ai-platform-/, "").replace(/-\d+$/, "")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-400 opacity-70" />
              <span className="text-sm">Querying Loki trace shards…</span>
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <div className="flex items-start gap-2 p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl mb-4 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Empty */}
          {!isLoading && spans.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
              <Network className="w-10 h-10 opacity-20" />
              <p className="text-sm font-medium text-slate-400">No correlated spans found</p>
              <div className="text-xs text-slate-600 space-y-1.5 text-center max-w-sm">
                <p>Loki was queried using three strategies:</p>
                <p className="text-slate-700 font-mono">trace_id · traceid · line filter</p>
                <p className="mt-2">Spans appear here when the backend's Winston logger has the
                  <span className="text-purple-500/70"> OpenTelemetryTransportV3 </span>
                  wired and an active HTTP request span is in context at log time.
                </p>
                <p className="text-slate-700">
                  Trigger an API request, then open the resulting log's trace.
                </p>
              </div>
              <div className="mt-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-600 break-all">
                {traceId}
              </div>
            </div>
          )}

          {/* Waterfall timeline */}
          {!isLoading && spans.length > 0 && (
            <div className="space-y-3">
              {spans.map((span, i) => {
                const leftPct = totalDuration
                  ? ((span.offsetMs || 0) / totalDuration) * 100
                  : 0;
                const widthPct = totalDuration
                  ? Math.max(2, (span.durationMs / totalDuration) * 100)
                  : 2;

                return (
                  <div
                    key={i}
                    className={`rounded-xl border overflow-hidden transition-all duration-200 ${
                      span.status === "error"
                        ? "border-red-900/40 bg-red-950/5"
                        : "border-slate-800/60 bg-slate-900/20"
                    }`}
                  >
                    {/* Span header */}
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      {/* Icon */}
                      <div
                        className={`p-1.5 rounded-md shrink-0 text-slate-950 ${serviceColor(span.service)}`}
                      >
                        <ServiceIcon service={span.service} />
                      </div>

                      {/* Name + service */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-200 truncate">
                          {span.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {span.service.replace(/ai-platform-/, "").replace(/-\d+$/, "")}
                          {span.spanId && (
                            <span className="ml-2 text-slate-700">
                              span:{span.spanId.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status + duration */}
                      <div className="flex items-center gap-2 shrink-0">
                        {span.status === "error" ? (
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                            error
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            ok
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-slate-400">
                          {span.durationMs > 0 ? `${span.durationMs}ms` : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Waterfall bar */}
                    <div className="mx-3 mb-2.5 h-2.5 bg-slate-800/50 rounded-full relative overflow-hidden">
                      <div
                        className={`absolute h-full rounded-full transition-all duration-500 ${
                          span.status === "error"
                            ? "bg-red-500"
                            : serviceColor(span.service)
                        }`}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                      />
                    </div>

                    {/* Offset label */}
                    <div className="px-3 pb-2 flex justify-between text-[9px] font-mono text-slate-700">
                      <span>+{span.offsetMs ?? 0}ms</span>
                      <span>
                        {span.offsetMs != null && span.durationMs
                          ? `ends @${span.offsetMs + span.durationMs}ms`
                          : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <span className="text-[10px] text-slate-600">
            Spans sourced from Loki log correlation · Winston OpenTelemetry propagation
          </span>
          <button
            onClick={fetchTrace}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
