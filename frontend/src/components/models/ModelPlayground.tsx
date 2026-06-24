"use client";

import React from "react";
import Link from "next/link";
import { Play, Clock, CheckCircle2, Cpu, FileCode, Sparkles, AlertTriangle, RotateCcw, Lock } from "lucide-react";
import { usePrediction } from "@/hooks/use-prediction";
import type { Model } from "@/types";
import { PredictionHistoryTable } from "./PredictionHistoryTable";

interface ModelPlaygroundProps {
  model: Model;
  isAuthenticated?: boolean;
}

/**
 * ModelPlayground component rendering prediction JSON inputs,
 * execution handlers, performance metrics, and prediction histories.
 */
export default function ModelPlayground({ model, isAuthenticated = true }: ModelPlaygroundProps) {
  const {
    activeDeployment,
    isRunning,
    payload,
    setPayload,
    result,
    isValidJson,
    jsonError,
    lastLatency,
    lastConfidence,
    lastMemory,
    httpStatus,
    history,
    handleRun,
    handleFormat,
    handleReset,
    handleClearHistory,
    loadHistoryItem,
  } = usePrediction(model);

  const lineNumbersRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const lineNumbers = React.useMemo(() => {
    const lines = payload.split("\n");
    return Array.from({ length: Math.max(lines.length, 1) }, (_, i) => i + 1);
  }, [payload]);

  return (
    <div className="space-y-6 font-mono text-xs text-foreground animate-fade-in">
      {/* Playground Header status banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-card border border-border rounded-xl gap-4 shadow-sm select-none font-sans">
        <div className="space-y-1">
          <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
            Sandbox Playground
          </span>
          <p className="text-[11px] text-muted-foreground mt-1">
            Send raw prediction payloads to the container execution engine.
          </p>
        </div>

        <div>
          {activeDeployment ? (
            <span className="badge badge-success text-[10px] font-bold py-1.5 px-3 rounded-lg font-sans">
              <span className="badge-dot animate-pulse"></span>
              LIVE: {activeDeployment.url || `Port ${activeDeployment.port}`}
            </span>
          ) : (
            <span className="badge badge-warning text-[10px] font-bold py-1.5 px-3 rounded-lg font-sans">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
              NO ACTIVE DEPLOYMENT (Queries will fail)
            </span>
          )}
        </div>
      </div>

      {/* Editor & Output Container */}
      <div className="relative">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-300 ${!isAuthenticated ? "blur-[2px] pointer-events-none select-none opacity-50" : ""}`}>
          {/* Payload Input */}
          <div className="border border-border bg-card rounded-xl overflow-hidden flex flex-col h-[400px] shadow-sm">
            <div className="p-4 border-b border-border flex justify-between items-center bg-background select-none font-sans">
              <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                <FileCode className="w-4 h-4 text-primary" /> Payload JSON
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleFormat}
                  className="text-[10px] text-muted-foreground hover:text-foreground font-bold px-2 py-1 rounded bg-background border border-border cursor-pointer transition-colors"
                  disabled={!isValidJson}
                >
                  Format
                </button>
                <span className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase">APPLICATION/JSON</span>
              </div>
            </div>
            <div className="relative flex-1 flex bg-[#f8f9fa] dark:bg-[#0c0d12] border-t border-border/50 overflow-hidden">
              {/* Line Numbers Column */}
              <div
                ref={lineNumbersRef}
                className="w-10 select-none text-right pr-2 text-muted-foreground/30 dark:text-zinc-650 border-r border-border/40 py-4 bg-slate-100/30 dark:bg-zinc-900/10 overflow-hidden font-mono text-[11px] leading-relaxed flex flex-col"
              >
                {lineNumbers.map((num) => (
                  <div key={num}>{num}</div>
                ))}
              </div>
              {/* Textarea */}
              <textarea
                ref={textareaRef}
                onScroll={handleScroll}
                className="flex-1 bg-transparent text-slate-800 dark:text-slate-200 font-mono text-[11px] p-4 pl-3 overflow-auto resize-none focus:outline-none leading-relaxed border-0 h-full w-full outline-none focus:ring-0"
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                spellCheck={false}
              />
              {!isValidJson && (
                <div className="absolute bottom-0 left-0 right-0 bg-red-950/90 border-t border-red-500/20 p-2.5 text-[10px] font-mono text-red-400 flex items-center gap-2 z-10">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                  <span className="line-clamp-1">{jsonError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Prediction Result */}
          <div className="border border-border bg-card rounded-xl overflow-hidden flex flex-col h-[400px] shadow-sm">
            <div className="p-4 border-b border-border flex justify-between items-center bg-background select-none font-sans">
              <div className="flex items-center gap-2 font-bold text-foreground text-xs">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" /> Response Output
              </div>
              {httpStatus && (
                <div
                  className={`flex items-center gap-1.5 text-[10px] font-bold tracking-wider ${
                    httpStatus.startsWith("200") ? "text-emerald-600 dark:text-emerald-400" : "text-red-650 dark:text-red-400"
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      httpStatus.startsWith("200") ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                    }`}
                  ></div>
                  {httpStatus}
                </div>
              )}
            </div>
            <div className="flex-1 bg-[#f8f9fa] dark:bg-[#0c0d12] text-emerald-650 dark:text-emerald-400 font-mono text-[11px] p-4 overflow-auto leading-relaxed border-t border-border/50">
              {result ? (
                <pre className="whitespace-pre-wrap">{result}</pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/45 gap-2 select-none">
                  <TerminalIcon className="w-8 h-8 opacity-45" />
                  <p className="text-[11px] font-sans">Run a query payload to display inference telemetry.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lock Overlay for Guests */}
        {!isAuthenticated && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-20 bg-background/30 backdrop-blur-[2px] transition-all duration-300">
            <div className="bg-card/95 border border-border/80 rounded-2xl p-8 shadow-xl max-w-sm space-y-5 animate-fade-in backdrop-blur-md">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary animate-bounce">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-foreground">Interactive Playground Locked</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sign in or register a free account to execute live predictions and test sandbox models.
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-2 select-none font-sans">
                <Link
                  href="/login"
                  className="btn-outline px-4 py-2 text-xs font-bold"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="btn-primary px-4 py-2 text-xs font-bold"
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Actions Row */}
      <div className="flex justify-end gap-3 select-none font-sans">
        <button 
          onClick={handleReset} 
          className="btn-outline flex items-center gap-1.5 font-bold" 
          title="Reset to template"
          disabled={!isAuthenticated}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Template
        </button>
        <button
          onClick={handleRun}
          className="btn-primary flex items-center gap-1.5 font-bold"
          disabled={!isAuthenticated || isRunning || !isValidJson}
        >
          <Play className="w-3.5 h-3.5 fill-current" /> {isRunning ? "Executing query..." : "Run Inference"}
        </button>
      </div>

      {/* Telemetry Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none font-sans">
        <div className="border border-border bg-card flex items-center gap-4 py-4 px-5 rounded-xl shadow-sm">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase mb-0.5">Response Latency</p>
            <p className="text-xl font-extrabold text-foreground">{lastLatency}</p>
          </div>
        </div>
        <div className="border border-border bg-card flex items-center gap-4 py-4 px-5 rounded-xl shadow-sm">
          <div className="w-10 h-10 rounded bg-emerald-50 text-emerald-600 border border-emerald-500/10 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase mb-0.5">Confidence Score</p>
            <p className="text-xl font-extrabold text-foreground">{lastConfidence}</p>
          </div>
        </div>
        <div className="border border-border bg-card flex items-center gap-4 py-4 px-5 rounded-xl shadow-sm">
          <div className="w-10 h-10 rounded bg-amber-50 text-amber-600 border border-amber-500/10 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-500/20 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[9px] font-bold text-muted-foreground tracking-wider uppercase mb-0.5">Container Memory</p>
            <p className="text-xl font-extrabold text-foreground">{lastMemory}</p>
          </div>
        </div>
      </div>

      <PredictionHistoryTable
        history={history}
        onClear={handleClearHistory}
        onReplay={loadHistoryItem}
      />
    </div>
  );
}

function TerminalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}
