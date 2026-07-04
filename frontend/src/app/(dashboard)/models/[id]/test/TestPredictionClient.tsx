"use client";

import React from "react";
import {
  ArrowLeft,
  Play,
  Clock,
  CheckCircle2,
  Cpu,
  FileCode,
  Sparkles,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePrediction } from "@/hooks/use-prediction";
import type { Model } from "@/types";
import { PredictionHistoryTable } from "@/components/models/PredictionHistoryTable";

interface TestPredictionClientProps {
  model: Model;
}

/**
 * Client component implementing the sandbox playground UI.
 * Connects code input widgets with live server-side prediction runners,
 * tracking request latencies, memory footprints, and localStorage histories
 * via a custom prediction controller hook.
 *
 * @param props - TestPredictionClient component properties.
 * @returns The React component layout rendering sandbox testing views.
 */
export default function TestPredictionClient({ model }: TestPredictionClientProps) {
  const router = useRouter();
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

  return (
    <div className="animate-fade-in w-full pb-12">
      {/* Back Button */}
      <button
        onClick={() => router.push(`/models/${model.id}`)}
        className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-6 hover:text-primary/80 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Model Details
      </button>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Sandbox Playground</h1>
            <span className="badge badge-info text-[10px]">
              Testing Interface
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Send real-time prediction request payloads to <span className="font-semibold text-foreground">{model.name}</span>
          </p>
          {activeDeployment ? (
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs text-muted-foreground font-medium">
                Live Deployment URL:{" "}
                <span className="font-mono text-primary">
                  {activeDeployment.url || `Port ${activeDeployment.port}`}
                </span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 px-3 py-1.5 rounded-lg w-fit">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                No active deployment. Run prediction requests might fail. Deploy a version first.
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={handleReset} className="btn-outline text-sm" title="Reset to original template">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button
            onClick={() => handleRun()}
            className="btn-primary text-sm font-semibold shadow-sm shadow-primary-500/20"
            disabled={isRunning || !isValidJson}
          >
            <Play className="w-4 h-4 fill-current" /> {isRunning ? "Running prediction..." : "Execute Query"}
          </button>
        </div>
      </div>

      {/* Editor & Output Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Payload Input */}
        <div className="card p-0 overflow-hidden flex flex-col h-125 border border-border shadow-sm">
          <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/40">
            <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <FileCode className="w-4 h-4 text-primary" /> Payload JSON
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleFormat}
                className="text-xs text-muted-foreground hover:text-primary font-semibold px-2 py-1 rounded bg-card border border-border cursor-pointer hover:border-muted-foreground/30 transition-colors"
                disabled={!isValidJson}
              >
                Format
              </button>
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider">APPLICATION/JSON</span>
            </div>
          </div>
          <div className="relative flex-1 flex flex-col bg-[#0f172a]">
            <textarea
              className="flex-1 w-full bg-[#0f172a] text-slate-100 font-mono text-sm p-6 overflow-auto resize-none focus:outline-none leading-relaxed border-0"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              spellCheck={false}
            />
            {!isValidJson && (
              <div className="bg-red-500/10 border-t border-red-500/20 p-3 text-xs font-mono text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="line-clamp-1">{jsonError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Prediction Result */}
        <div className="card p-0 overflow-hidden flex flex-col h-125 border border-border shadow-sm">
          <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/40">
            <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <Sparkles className="w-4 h-4 text-primary" /> Response Output
            </div>
            {httpStatus && (
              <div
                className={`flex items-center gap-2 text-xs font-bold tracking-wider ${
                  httpStatus.startsWith("200") ? "text-emerald-600" : "text-red-600"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    httpStatus.startsWith("200") ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                  }`}
                ></div>{" "}
                {httpStatus}
              </div>
            )}
          </div>
          <div className="flex-1 bg-[#0f172a] text-emerald-400 font-mono text-sm p-6 overflow-auto leading-relaxed">
            {result ? (
              <pre className="whitespace-pre-wrap">{result}</pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                <TerminalIcon className="w-8 h-8 opacity-40" />
                <p className="text-xs font-sans">Run a query to display prediction data.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="card flex items-center gap-4 py-5 border border-border shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-0.5">Response Latency</p>
            <p className="text-2xl font-bold text-foreground">{lastLatency}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 py-5 border border-border shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-0.5">Model Confidence</p>
            <p className="text-2xl font-bold text-foreground">{lastConfidence}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 py-5 border border-border shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-0.5">Container Memory</p>
            <p className="text-2xl font-bold text-foreground">{lastMemory}</p>
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
