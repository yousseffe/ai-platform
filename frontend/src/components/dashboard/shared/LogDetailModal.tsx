import React, { useState } from "react";
import { Clock, Terminal, Shield, Coins, Copy, Code } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ModelLog } from "@/types";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface LogDetailModalProps {
  log: ModelLog | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LogDetailModal({
  log,
  isOpen,
  onOpenChange,
}: LogDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"request" | "response">("request");

  if (!log) return null;

  const isSuccess = log.status === "SUCCESS";
  const isFast = log.responseTimeMs < 400;

  // Format creation timestamp
  const dateFormatted = new Date(log.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  // Extract authentic example payload and expected result from the model's active version
  const latestVersion = log.model?.versions && log.model.versions.length > 0
    ? log.model.versions[log.model.versions.length - 1]
    : null;

  // Format and parse request payload from backend example payload
  let requestPayloadJSON = "";
  try {
    const rawPayload = latestVersion?.examplePayload || "";
    if (rawPayload.trim()) {
      const parsed = JSON.parse(rawPayload);
      requestPayloadJSON = JSON.stringify(parsed, null, 2);
    } else {
      requestPayloadJSON = JSON.stringify(
        {
          model: log.model?.id || "unknown-model",
          inputs: {
            prompt: "Identify bottlenecks in cloud computing clusters using machine learning pipelines...",
          }
        },
        null,
        2
      );
    }
  } catch {
    requestPayloadJSON = latestVersion?.examplePayload || JSON.stringify({ message: "No structured payload defined." }, null, 2);
  }

  // Format and parse response payload from backend expected result schema
  let responsePayloadJSON = "";
  try {
    const rawResult = latestVersion?.expectedResult || "";
    if (rawResult.trim()) {
      const parsed = JSON.parse(rawResult);
      responsePayloadJSON = JSON.stringify(parsed, null, 2);
    } else {
      responsePayloadJSON = isSuccess
        ? JSON.stringify(
            {
              id: `pred_${log.id.slice(0, 8)}`,
              status: "success",
              response_time_ms: log.responseTimeMs,
              message: "Model predictions resolved successfully."
            },
            null,
            2
          )
        : JSON.stringify(
            {
              error: {
                code: log.statusCode,
                status: "failed",
                message: "The model instance encountered an error during inference."
              }
            },
            null,
            2
          );
    }
  } catch {
    responsePayloadJSON = latestVersion?.expectedResult || JSON.stringify({ message: "No structured output schema defined." }, null, 2);
  }

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${type} JSON!`, {
      id: "modal-copy-toast",
      duration: 1500,
    });
  };

  const curlCommand = `curl -X POST https://api.qantara.ai/v1/models/${log.model?.id || "model"}/predict \\\n  -H "Authorization: Bearer ${log.apiKey ? "qt_sk_..." : "JWT_SESSION_TOKEN"}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify({ inputs: { prompt: "..." } })}'`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 overflow-visible border border-border bg-popover dark:bg-slate-950 rounded-xl select-none font-sans mt-10">
        
        {/* Floating Gradient Icon at the top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-primary via-indigo-600 to-teal-400 text-white shadow-lg border-4 border-popover dark:border-slate-950 z-50 shrink-0">
          <Terminal className="h-5.5 w-5.5" />
        </div>

        {/* Modal Header */}
        <DialogHeader className="p-5 pt-8 border-b border-border bg-secondary/15 flex flex-col items-center text-center">
          <DialogTitle className="text-sm font-bold text-foreground">Inference Query Console</DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground mt-0.5">
            Request Log ID: <span className="font-mono text-foreground font-semibold">{log.id}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-140px)] space-y-5">
          
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="border border-border rounded-lg p-3 bg-secondary/5 text-left">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Status Code</span>
              <div className="mt-1 flex items-center gap-1.5">
                {isSuccess ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-650 dark:text-emerald-400 text-[10px] font-bold font-mono">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    {log.statusCode} SUCCESS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/25 text-red-650 dark:text-red-400 text-[10px] font-bold font-mono">
                    <span className="w-1 h-1 rounded-full bg-red-500" />
                    {log.statusCode} ERROR
                  </span>
                )}
              </div>
            </div>

            <div className="border border-border rounded-lg p-3 bg-secondary/5 text-left">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Response Latency</span>
              <div className="mt-1 flex items-center gap-1.5">
                {isFast ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold font-mono">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    {log.responseTimeMs}ms (Fast)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-450 text-[10px] font-bold font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {log.responseTimeMs}ms
                  </span>
                )}
              </div>
            </div>

            <div className="border border-border rounded-lg p-3 bg-secondary/5 text-left">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Auth Method</span>
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                {log.apiKey ? "API Key" : "Session JWT"}
              </span>
            </div>

            <div className="border border-border rounded-lg p-3 bg-secondary/5 text-left">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Cost Deducted</span>
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                ${(log.model?.costPerRequest || 0.02).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Model information & Request URL */}
          <div className="border border-border rounded-lg p-4 bg-secondary/5 text-left space-y-2.5">
            <div className="flex justify-between items-center text-xs font-mono select-none">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Inference Endpoint Target</span>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Model: {log.model?.name || "Deleted Model"}</span>
            </div>
            <div className="flex gap-2 items-center bg-slate-900 border border-slate-800 p-2.5 rounded-lg font-mono text-[11px]">
              <span className="text-pink-500 font-bold">POST</span>
              <span className="text-slate-300 select-all truncate flex-1">
                https://api.qantara.ai/v1/models/{log.model?.id || "model"}/predict
              </span>
            </div>
          </div>

          {/* cURL Command helper */}
          <div className="border border-border rounded-lg overflow-hidden text-left font-mono">
            <div className="flex items-center justify-between border-b border-border bg-secondary/20 px-3.5 py-2">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Code className="h-3.5 w-3.5" /> cURL Request Simulation
              </span>
              <button
                onClick={() => handleCopy(curlCommand, "cURL")}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Copy Curl"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <pre className="p-3 bg-[#121316] text-[#ededed] text-[10px] leading-relaxed overflow-x-auto select-all max-w-full font-mono">
              {curlCommand}
            </pre>
          </div>

          {/* Tabbed Payloads Block */}
          <div className="border border-border rounded-lg overflow-hidden text-left font-mono">
            {/* Tab selection header */}
            <div className="flex justify-between items-center border-b border-border bg-secondary/20 px-1 py-1">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab("request")}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase rounded-md cursor-pointer transition-all",
                    activeTab === "request"
                      ? "bg-card text-foreground border border-border shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Request payload
                </button>
                <button
                  onClick={() => setActiveTab("response")}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase rounded-md cursor-pointer transition-all",
                    activeTab === "response"
                      ? "bg-card text-foreground border border-border shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Response payload
                </button>
              </div>
              <button
                onClick={() =>
                  handleCopy(
                    activeTab === "request" ? requestPayloadJSON : responsePayloadJSON,
                    activeTab === "request" ? "Request" : "Response"
                  )
                }
                className="p-1.5 mr-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Copy JSON"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>

            {/* Code editor content */}
            <pre className="p-3.5 bg-[#121316] text-emerald-400 text-[10.5px] leading-relaxed overflow-x-auto select-all max-w-full max-h-[160px] overflow-y-auto font-mono">
              {activeTab === "request" ? requestPayloadJSON : responsePayloadJSON}
            </pre>
          </div>

          {/* Date info block */}
          <p className="text-[10px] text-muted-foreground text-center font-mono select-none">
            Query served on <span className="font-semibold text-foreground">{dateFormatted}</span> by Qantara Cluster nodes.
          </p>

        </div>

      </DialogContent>
    </Dialog>
  );
}
