"use client";

import { useState, useEffect, useRef } from "react";
import { useContainerLogs } from "@/hooks/use-container-logs";
import { Terminal, RefreshCw, Trash2, Search, Play, Pause, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ModelLogsConsoleProps {
  deploymentId: string;
}

export function ModelLogsConsole({ deploymentId }: ModelLogsConsoleProps) {
  const { logs, isConnected, error, clearLogs } = useContainerLogs(deploymentId);
  const [filter, setFilter] = useState<"all" | "stdout" | "stderr">("all");
  const [search, setSearch] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPaused && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isPaused]);

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === "all" || log.stream === filter;
    const matchesSearch =
      search === "" || log.text.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl transition-all duration-300">
      {/* Header Controls */}
      <div className="bg-slate-50/80 dark:bg-slate-900/80 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-purple-500 dark:text-purple-400" />
          <span className="font-semibold text-sm text-slate-850 dark:text-slate-200">Container Log Terminal</span>
          <span
            className={`w-2.5 h-2.5 rounded-full block animate-pulse ${
              isConnected ? "bg-emerald-500" : "bg-amber-500"
            }`}
            title={isConnected ? "WebSocket Streaming Active" : "Connecting..."}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-left select-none">
          {/* Stream Selector */}
          <Select
            value={filter}
            onValueChange={(val) => setFilter(val as "all" | "stdout" | "stderr")}
          >
            <SelectTrigger className="h-8 w-32 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-300 text-xs focus:ring-purple-500/20 focus:border-purple-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition duration-150">
              <SelectValue placeholder="All Channels" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-350">
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="stdout">stdout (Info)</SelectItem>
              <SelectItem value="stderr">stderr (Errors)</SelectItem>
            </SelectContent>
          </Select>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-500 w-44"
            />
            <Search className="w-3.5 h-3.5 text-slate-450 dark:text-slate-550 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
              isPaused
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-850 dark:hover:text-slate-200"
            }`}
            title={isPaused ? "Resume Autoscroll" : "Pause Autoscroll"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={clearLogs}
            className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-600 dark:hover:text-red-400 rounded-lg cursor-pointer transition-colors"
            title="Clear Console Screen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="p-4 font-mono text-xs overflow-y-auto h-96 space-y-1.5 select-text selection:bg-purple-500/20 dark:selection:bg-purple-500/30 bg-slate-50/20 dark:bg-transparent">
        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-100 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 rounded-lg mb-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Connection warning: {error}</span>
          </div>
        )}

        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-650">
            {logs.length === 0 ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin mb-2 opacity-50 text-purple-500" />
                <span>Listening for container stdout/stderr pipeline streams...</span>
              </>
            ) : (
              <span>No logs matching active filter criteria.</span>
            )}
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const lowerText = log.text.toLowerCase();
            const isError = lowerText.includes("error") || lowerText.includes("fail") || lowerText.includes("exception") || lowerText.includes("fatal");
            const isWarning = lowerText.includes("warn") || lowerText.includes("alert");

            let style = {
              border: "border-purple-500/30",
              text: "text-purple-900 dark:text-purple-100",
              bg: "bg-purple-50/10 hover:bg-purple-50/20 dark:bg-purple-950/2.5 dark:hover:bg-purple-950/5",
              badge: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
            };

            if (isError) {
              style = {
                border: "border-rose-500/50",
                text: "text-rose-800 dark:text-rose-400",
                bg: "bg-rose-50/10 hover:bg-rose-50/20 dark:bg-rose-950/5 dark:hover:bg-rose-950/10",
                badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-350",
              };
            } else if (isWarning) {
              style = {
                border: "border-amber-500/50",
                text: "text-amber-800 dark:text-amber-400",
                bg: "bg-amber-50/10 hover:bg-amber-50/20 dark:bg-amber-950/5 dark:hover:bg-amber-950/10",
                badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-450",
              };
            } else if (log.stream === "stderr") {
              style = {
                border: "border-slate-300 dark:border-slate-800/80",
                text: "text-slate-700 dark:text-slate-400",
                bg: "bg-slate-50/10 hover:bg-slate-50/20 dark:bg-slate-900/5 dark:hover:bg-slate-900/10",
                badge: "bg-slate-200/50 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
              };
            }

            return (
              <div
                key={index}
                className={`flex gap-3 leading-relaxed border-l-2 pl-2.5 transition-colors duration-150 ${style.border} ${style.text} ${style.bg}`}
              >
                {/* Timestamp */}
                <span className="text-slate-450 dark:text-slate-600 select-none shrink-0 font-medium">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                </span>

                {/* Channel */}
                <span
                  className={`font-semibold shrink-0 uppercase tracking-widest text-[9px] select-none rounded px-1 self-start ${style.badge}`}
                >
                  {log.stream}
                </span>

                {/* Log message */}
                <span className="break-all whitespace-pre-wrap flex-1">{log.text}</span>
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
