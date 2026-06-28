"use client";

import { useState, useEffect } from "react";
import { useModelMetrics } from "@/hooks/use-model-metrics";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Cpu, HardDrive, Clock, Activity, AlertTriangle } from "lucide-react";

interface ModelAnalyticsProps {
  modelId: string;
}

export function ModelAnalytics({ modelId }: ModelAnalyticsProps) {
  const { metrics, isLoading, error } = useModelMetrics(modelId);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (metrics) {
      setHistory((prev) => {
        const newPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          cpu: metrics.cpuPercent,
          ram: metrics.ramMb,
          p50: metrics.latencyP50,
          p95: metrics.latencyP95,
          requests: metrics.requestRate,
          errors: metrics.errorRate,
        };
        // Keep last 15 points
        return [...prev, newPoint].slice(-15);
      });
    }
  }, [metrics]);

  if (isLoading && history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Activity className="w-10 h-10 animate-pulse text-purple-500 mb-3" />
        <p>Loading real-time model telemetry...</p>
      </div>
    );
  }

  if (error && history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-400 bg-red-950/20 rounded-xl border border-red-900/30 p-6">
        <AlertTriangle className="w-10 h-10 mb-3" />
        <p className="font-semibold mb-1">Metrics Scrape Failed</p>
        <p className="text-xs opacity-80 text-center max-w-md">{error}</p>
      </div>
    );
  }

  const currentMetrics = metrics || {
    cpuPercent: 0,
    ramMb: 0,
    latencyP50: 0,
    latencyP95: 0,
    requestRate: 0,
    errorRate: 0,
  };

  return (
    <div className="space-y-6">
      {/* Real-time Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* CPU Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-medium block">Container CPU</span>
            <span className="text-2xl font-bold text-slate-100">{currentMetrics.cpuPercent.toFixed(1)}%</span>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
            <Cpu className="w-6 h-6" />
          </div>
        </div>

        {/* RAM Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-medium block">Memory Footprint</span>
            <span className="text-2xl font-bold text-slate-100">{currentMetrics.ramMb.toFixed(1)} MB</span>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
            <HardDrive className="w-6 h-6" />
          </div>
        </div>

        {/* Latency Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-medium block">P95 Latency</span>
            <span className="text-2xl font-bold text-slate-100">{currentMetrics.latencyP95.toFixed(0)} ms</span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Requests Card */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-medium block">Throughput</span>
            <span className="text-2xl font-bold text-slate-100">{currentMetrics.requestRate.toFixed(2)} req/s</span>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Resource Utilization Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/30 border border-slate-800/50 p-5 rounded-xl">
          <h4 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" /> Resource Footprint (%)
          </h4>
          <div className="h-64">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    name="CPU Usage"
                    stroke="#a855f7"
                    fillOpacity={1}
                    fill="url(#colorCpu)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Gathering resource telemetry history...
              </div>
            )}
          </div>
        </div>

        {/* Memory Footprint Chart */}
        <div className="bg-slate-900/30 border border-slate-800/50 p-5 rounded-xl">
          <h4 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-400" /> RAM Utilization (MB)
          </h4>
          <div className="h-64">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} unit=" MB" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ram"
                    name="RAM Usage"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorRam)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Gathering memory telemetry history...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Latency Chart */}
      <div className="bg-slate-900/30 border border-slate-800/50 p-5 rounded-xl">
        <h4 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" /> Prediction Response Latency Profile (ms)
        </h4>
        <div className="h-64">
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} unit=" ms" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155" }}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line
                  type="monotone"
                  dataKey="p50"
                  name="P50 Median Latency"
                  stroke="#10b981"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="p95"
                  name="P95 Tail Latency"
                  stroke="#ef4444"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-xs">
              No prediction load detected on active container.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
