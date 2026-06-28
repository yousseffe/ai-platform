"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal, RefreshCw, CheckCircle2, ChevronRight, XCircle } from "lucide-react";
import { smartFetch } from "@/lib/utils/smart-fetch";

interface ActionsTerminalProps {
  modelId: string;
  versionId: string;
  versionNumber: number;
  status: string;
  buildLogs?: string | null;
}

export default function ActionsTerminal({
  modelId,
  versionId,
  versionNumber,
  status,
  buildLogs,
}: ActionsTerminalProps) {
  const isBuildActive = status === "building" || status === "starting" || status === "uploading";
  const isFailed = status === "failed";

  const [lines, setLines] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState(isBuildActive);
  const [isLoading, setIsLoading] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Parse lines from raw string logs
  const parseLogs = (rawLogs: string | null | undefined): string[] => {
    if (!rawLogs) return [];
    return rawLogs.split("\n").filter((line) => line.trim() !== "");
  };

  // Sync / initial load
  useEffect(() => {
    if (buildLogs) {
      setLines(parseLogs(buildLogs));
    } else {
      // Fetch initial logs if not provided
      const fetchInitial = async () => {
        setIsLoading(true);
        try {
          const res = await smartFetch<{ buildLogs: string | null }>(
            `/models/${modelId}/versions/${versionId}/build-logs`
          );
          setLines(parseLogs(res?.buildLogs));
        } catch (err) {
          console.error("Failed to fetch initial build logs", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchInitial();
    }
  }, [versionId, modelId, buildLogs]);

  // Polling for logs when build is active
  useEffect(() => {
    setIsPolling(isBuildActive);
    if (!isBuildActive) return;

    const interval = setInterval(async () => {
      try {
        const res = await smartFetch<{ buildLogs: string | null }>(
          `/models/${modelId}/versions/${versionId}/build-logs`
        );
        if (res && res.buildLogs) {
          setLines(parseLogs(res.buildLogs));
        }
      } catch (err) {
        console.error("Failed to poll build logs", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [versionId, modelId, isBuildActive]);

  // Scroll to bottom of terminal when logs are appended
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [lines]);

  return (
    <div className="border border-border bg-black/40 rounded-xl overflow-hidden shadow-sm font-mono text-xs text-foreground">
      {/* Console Header Bar */}
      <div className="p-3 bg-card border-b border-border flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span className="font-bold text-[11px] text-foreground">.github/workflows/deploy.yml</span>
          <span className="text-[10px] bg-muted border border-border px-1.5 py-0.2 rounded text-muted-foreground">v{versionNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          {isPolling ? (
            <div className="flex items-center gap-1.5 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> compiling container logs
            </div>
          ) : isFailed ? (
            <div className="flex items-center gap-1.5 text-rose-500 text-[10px] font-bold uppercase tracking-wider">
              <XCircle className="w-3.5 h-3.5" /> build failed
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" /> build success
            </div>
          )}
        </div>
      </div>

      {/* Terminal Screen output */}
      <div className="p-5 h-72 bg-black/95 text-slate-300 font-mono text-[11px] overflow-y-auto leading-relaxed select-text space-y-1">
        {isLoading && lines.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading build logs...
          </div>
        ) : lines.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground font-sans">
            No build logs recorded yet.
          </div>
        ) : (
          lines.map((line, idx) => {
            if (typeof line !== "string") return null;
            const isStep = line.startsWith("Step") || line.startsWith("Run") || line.startsWith("===>") || line.startsWith("[INFO]") || line.startsWith("[BUILD]") || line.startsWith("Step ");
            const isSuccess = line.includes("[OK]") || line.includes("SUCCESS") || line.includes("success") || line.includes("Successfully");
            const isError = line.toLowerCase().includes("error") || line.toLowerCase().includes("fail");
            
            return (
              <div key={idx} className="flex items-start gap-1">
                <span className="text-muted-foreground/35 select-none w-5 text-right text-[10px] mr-2 pt-px">{idx + 1}</span>
                <span className={
                  isError ? "text-rose-400 font-medium" :
                  isStep ? "text-primary font-bold" : 
                  isSuccess ? "text-emerald-400 font-bold" : 
                  "text-slate-300"
                }>
                  {isStep && <ChevronRight className="w-3 h-3 inline-block mr-0.5 -mt-0.5" />}
                  {line}
                </span>
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
