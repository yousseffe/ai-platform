"use client";

import React, { useState, useEffect } from "react";
import { Key, Copy, Check, Eye, EyeOff, Trash2, Plus, Loader2, Sparkles, Terminal, Activity, BarChart3, ShieldCheck, AlertCircle } from "lucide-react";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { Model } from "@/types";
import { toast } from "react-hot-toast";

interface ApiKeyInfo {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  model: {
    id: string;
    name: string;
  } | null;
}

interface ConsumerModelStats {
  modelId: string;
  modelName: string;
  modelType: string;
  modelFramework: string;
  costPerRequest: number;
  callCount: number;
  totalSpent: number;
}

interface ConsumerInferenceLog {
  id: string;
  apiKey: string | null;
  responseTimeMs: number;
  status: string;
  statusCode: number;
  createdAt: string;
  model: {
    id: string;
    name: string;
  } | null;
}

/**
 * REST API credentials management page.
 * Displays active model subscriptions, client credentials keys, and enables generating
 * multiple environment keys per model. Also tracks consumer logs and stats per model.
 */
export default function ApiSettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [keyName, setKeyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});

  // Usage states
  const [consumerStats, setConsumerStats] = useState<ConsumerModelStats[]>([]);
  const [consumerLogs, setConsumerLogs] = useState<ConsumerInferenceLog[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setLoadingUsage(true);
    try {
      // Fetch user live keys
      const keysData = await smartFetch<ApiKeyInfo[]>("/users/me/api-keys");
      setApiKeys(keysData);

      // Fetch user registered and marketplace public models
      const [userModels, publicModels] = await Promise.all([
        smartFetch<Model[]>("/models").catch(() => []),
        smartFetch<Model[]>("/models/marketplace").catch(() => []),
      ]);

      const merged = new Map<string, Model>();
      userModels.forEach((m) => merged.set(m.id, m));
      publicModels.forEach((m) => merged.set(m.id, m));

      const uniqueModels = Array.from(merged.values());
      setModels(uniqueModels);

      if (uniqueModels.length > 0) {
        setSelectedModelId(uniqueModels[0].id);
      }

      // Fetch usage stats and logs
      const [statsData, logsData] = await Promise.all([
        smartFetch<ConsumerModelStats[]>("/models/logs/consumer/stats").catch(() => []),
        smartFetch<ConsumerInferenceLog[]>("/models/logs/consumer").catch(() => []),
      ]);
      setConsumerStats(statsData);
      setConsumerLogs(logsData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to retrieve credentials and models");
    } finally {
      setLoading(false);
      setLoadingUsage(false);
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelId) {
      toast.error("Please choose a model");
      return;
    }
    setGenerating(true);
    try {
      const res = await smartFetch<ApiKeyInfo>("/users/me/api-keys", {
        method: "POST",
        body: JSON.stringify({
          modelId: selectedModelId,
          name: keyName.trim() || "Default Key",
        }),
      });
      setApiKeys((prev) => [res, ...prev]);
      setKeyName("");
      toast.success("API Key generated successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate key";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    const confirmation = window.confirm(
      "Are you sure you want to revoke this API key? Applications using this credential will fail immediately."
    );
    if (!confirmation) return;

    setRevokingId(keyId);
    try {
      await smartFetch(`/users/me/api-keys/${keyId}/revoke`, {
        method: "POST",
      });
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
      toast.success("API Key revoked successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke key";
      toast.error(msg);
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopy = async (keyText: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(keyText);
      setCopiedKeyId(keyId);
      toast.success("API key copied to clipboard");
      setTimeout(() => setCopiedKeyId(null), 2500);
    } catch {
      toast.error("Failed to copy API key");
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => ({
      ...prev,
      [keyId]: !prev[keyId],
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left side: Subscriptions & keys listing */}
        <div className="flex-1 card p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-border/60 pb-4 select-none">
            <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
              <Key className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-xs">Active Subscriptions & Keys</h2>
              <p className="text-[10px] text-muted-foreground">Manage your credentials and API access tokens split by registered models.</p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <span className="font-mono text-xs">Loading active credentials...</span>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground font-mono text-xs border border-dashed border-border rounded-lg bg-secondary/10">
              No API keys generated. Subscribe to a model on the right to generate credentials.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-[10px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-bold uppercase select-none">
                    <th className="py-2.5 px-2">Model</th>
                    <th className="py-2.5 px-2">Key Label</th>
                    <th className="py-2.5 px-2">Access Token</th>
                    <th className="py-2.5 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((key) => {
                    const isVisible = !!visibleKeys[key.id];
                    const maskedKey = key.key.substring(0, 11) + "•".repeat(24) + key.key.substring(key.key.length - 4);
                    return (
                      <tr key={key.id} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                        <td className="py-3 px-2 font-sans font-bold text-foreground">
                          {key.model?.name || "Deleted Model"}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground font-medium">
                          {key.name}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="bg-secondary/40 px-2 py-1 rounded text-foreground font-medium font-mono text-[9px] border border-border/50">
                              {isVisible ? key.key : maskedKey}
                            </span>
                            <button
                              onClick={() => toggleKeyVisibility(key.id)}
                              className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded hover:bg-secondary transition-colors"
                              title={isVisible ? "Hide Key" : "Show Key"}
                            >
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleCopy(key.key, key.id)}
                              className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded hover:bg-secondary transition-colors"
                              title="Copy key"
                            >
                              {copiedKeyId === key.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <button
                            onClick={() => handleRevokeKey(key.id)}
                            disabled={revokingId === key.id}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 p-1.5 rounded cursor-pointer transition-colors"
                            title="Revoke Key"
                          >
                            {revokingId === key.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right side: Generate new keys form */}
        <div className="w-full lg:w-[320px] shrink-0 card p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-border/60 pb-4 select-none">
            <div className="w-9 h-9 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-xs">Subscribe & Generate</h2>
              <p className="text-[10px] text-muted-foreground">Generate environment keys for models.</p>
            </div>
          </div>

          <form onSubmit={handleGenerateKey} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-mono">
                Select Model
              </label>
              <select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                disabled={models.length === 0}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none font-sans font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
              >
                {models.length === 0 ? (
                  <option value="">No models available</option>
                ) : (
                  models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-mono">
                Key Nickname / Label
              </label>
              <input
                type="text"
                placeholder="e.g. Production Key"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none font-mono font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={generating || models.length === 0}
              className="w-full btn-primary h-9 flex items-center justify-center gap-1.5 text-xs font-bold font-mono cursor-pointer rounded-lg border-none active:scale-[0.98]"
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Generate Token
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Model Usage Statistics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Model Statistics List */}
        <div className="lg:col-span-1 card p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-border/60 pb-4 select-none">
            <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
              <BarChart3 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-xs">Model Call Metrics</h2>
              <p className="text-[10px] text-muted-foreground">Cumulative prediction requests and credit spends per model.</p>
            </div>
          </div>

          {loadingUsage ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
              <span className="font-mono text-xs">Loading statistics...</span>
            </div>
          ) : consumerStats.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground font-mono text-xs border border-dashed border-border rounded-lg bg-secondary/10">
              No API calls recorded yet. Run model prediction to generate metrics.
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {consumerStats.map((stat) => (
                <div key={stat.modelId} className="p-3.5 rounded-xl border border-border/60 bg-secondary/10 hover:bg-secondary/20 transition-all font-mono text-xs">
                  <div className="flex justify-between items-center select-none mb-2">
                    <span className="font-sans font-bold text-foreground truncate max-w-[120px]">{stat.modelName}</span>
                    <span className="bg-secondary/60 px-1.5 py-0.5 rounded text-[8px] border border-border/40 font-semibold">{stat.modelFramework}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                    <div>
                      <span className="block text-[8px] text-muted-foreground/60 uppercase">Call Volume</span>
                      <span className="font-bold text-foreground text-xs">{stat.callCount} calls</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] text-muted-foreground/60 uppercase">Credits Spent</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {Math.round(stat.totalSpent)} Credits
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detailed Inference Logs */}
        <div className="lg:col-span-2 card p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-border/60 pb-4 select-none">
            <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
              <Activity className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-xs">Live Inference Audits</h2>
              <p className="text-[10px] text-muted-foreground">Real-time log tracing of last 50 inference execution results.</p>
            </div>
          </div>

          {loadingUsage ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
              <span className="font-mono text-xs">Loading execution logs...</span>
            </div>
          ) : consumerLogs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground font-mono text-xs border border-dashed border-border rounded-lg bg-secondary/10">
              No live logs available.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
              <table className="w-full font-mono text-[9px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-bold uppercase select-none">
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 px-2">Model</th>
                    <th className="py-2.5 px-2">Latency</th>
                    <th className="py-2.5 px-2">Auth</th>
                    <th className="py-2.5 px-2 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {consumerLogs.map((log) => {
                    const isSuccess = log.status === "SUCCESS";
                    const formattedLogTime = new Date(log.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });
                    const authText = log.apiKey && log.apiKey.startsWith("ml_sk_") ? "API Key" : "JWT Session";

                    return (
                      <tr key={log.id} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                        <td className="py-2 px-2 select-none">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            isSuccess ? "text-emerald-500" : "text-red-500"
                          }`}>
                            {isSuccess ? (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5" />
                            )}
                            {log.statusCode}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-sans font-bold text-foreground">
                          {log.model?.name || "Unknown Model"}
                        </td>
                        <td className="py-2 px-2 text-muted-foreground">
                          {log.responseTimeMs}ms
                        </td>
                        <td className="py-2 px-2 text-muted-foreground">
                          {authText}
                        </td>
                        <td className="py-2 px-2 text-right text-muted-foreground font-mono">
                          {formattedLogTime}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Integration Code Snippet */}
      <div className="card p-5 rounded-xl border border-border bg-card shadow-sm space-y-3.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
          <Terminal className="w-4 h-4" />
          <span className="font-semibold text-foreground text-[11px] font-mono">Integration Code Example</span>
        </div>
        <p className="text-[10px] text-muted-foreground font-sans">
          To run inference, send authenticated HTTP requests to the target model ID execution endpoint:
        </p>
        <pre className="bg-[#121316] text-[#ededed] border border-[#222326] p-3.5 rounded-lg text-[10px] font-mono overflow-x-auto font-medium leading-relaxed">
          curl -X POST &quot;http://localhost:5000/models/<span className="text-emerald-400">MODEL_ID</span>/predict&quot; \<br />
          &nbsp;&nbsp;-H &quot;Authorization: Bearer <span className="text-indigo-400">YOUR_PER_MODEL_API_KEY</span>&quot; \<br />
          &nbsp;&nbsp;-H &quot;Content-Type: application/json&quot; \<br />
          &nbsp;&nbsp;-d &apos;&#123;&quot;features&quot;: [1.2, 3.4, 5.6]&#125;&apos;
        </pre>
      </div>
    </div>
  );
}
