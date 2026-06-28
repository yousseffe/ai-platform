"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  Globe,
  Hash,
  Info,
  Lock,
  Package,
  Play,
  Server,
  Shield,
  Sparkles,
  Tag,
  Terminal,
  User,
  Zap,
  Box,
  Cpu,
  HardDrive,
  Sliders,
  Maximize,
  Wrench,
  Key,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Model, ModelVersion } from "@/types";
import { DeploymentStatus, Framework, ModelType, TaskType, VersionStatus } from "@/types/enums";
import ModelPlayground from "@/components/models/ModelPlayground";

interface PublicModelDetailClientProps {
  /** The full model object fetched server-side. */
  model: Model;
  /** Whether the current visitor is logged in. */
  isAuthenticated: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a Tailwind badge color class based on the model type enum value.
 *
 * @param type - The ModelType enum value.
 * @returns A CSS class string for the badge.
 */
function modelTypeColor(type: string): string {
  const map: Record<string, string> = {
    [ModelType.TABULAR]: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    [ModelType.NLP]: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
    [ModelType.VISION]: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    [ModelType.LLM_GGUF]: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    [ModelType.DIFFUSION]: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800",
  };
  return map[type] ?? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
}

/**
 * Returns a display label for the model type.
 *
 * @param type - The ModelType enum value.
 * @returns A human-readable type label.
 */
function modelTypeLabel(type: string): string {
  const map: Record<string, string> = {
    [ModelType.TABULAR]: "Tabular & Analytics",
    [ModelType.NLP]: "Natural Language",
    [ModelType.VISION]: "Computer Vision",
    [ModelType.LLM_GGUF]: "Large Language Model",
    [ModelType.DIFFUSION]: "Stable Diffusion",
  };
  return map[type] ?? type;
}

/**
 * Returns a display label for the framework.
 *
 * @param fw - The Framework enum value.
 * @returns A human-readable framework label.
 */
function frameworkLabel(fw: string): string {
  const map: Record<string, string> = {
    [Framework.SKLEARN]: "Scikit-Learn",
    [Framework.PYTORCH]: "PyTorch",
    [Framework.TENSORFLOW]: "TensorFlow",
    [Framework.ONNX]: "ONNX Runtime",
    [Framework.LLAMA_CPP]: "llama.cpp",
    [Framework.VLLM]: "vLLM",
    [Framework.CUSTOM]: "Custom",
  };
  return map[fw] ?? fw;
}

/**
 * Returns a display label for the task type.
 *
 * @param task - The TaskType enum value.
 * @returns A human-readable task type label.
 */
function taskTypeLabel(task: string): string {
  const map: Record<string, string> = {
    [TaskType.CLASSIFICATION]: "Classification",
    [TaskType.REGRESSION]: "Regression",
    [TaskType.GENERATION]: "Generation",
    [TaskType.OBJECT_DETECTION]: "Object Detection",
    [TaskType.SEGMENTATION]: "Segmentation",
    [TaskType.EMBEDDING]: "Embedding",
    [TaskType.CHAT]: "Chat / Dialogue",
    [TaskType.OTHER]: "Other",
  };
  return map[task] ?? task;
}

/**
 * Returns badge styles for a version build status.
 *
 * @param status - The VersionStatus enum value.
 * @returns An object with label and CSS class.
 */
function versionStatusBadge(status: string): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    [VersionStatus.READY]: { label: "Ready", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" },
    [VersionStatus.BUILDING]: { label: "Building", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300" },
    [VersionStatus.UPLOADED]: { label: "Uploaded", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300" },
    [VersionStatus.FAILED]: { label: "Failed", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300" },
  };
  return map[status] ?? { label: status, className: "bg-slate-100 text-slate-600 border-slate-200" };
}

/**
 * Checks if any version has a live running deployment.
 *
 * @param versions - The model versions array.
 * @returns True if at least one running deployment exists.
 */
function hasLiveDeployment(versions: ModelVersion[]): boolean {
  return versions.some((v) =>
    v.deployments?.some((d) => d.status === DeploymentStatus.RUNNING)
  );
}

/**
 * Formats a date string into a readable format.
 *
 * @param dateStr - ISO date string.
 * @returns Formatted date string like "Jun 22, 2026".
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Code block with syntax highlighting and a one-click copy button.
 *
 * @param props - Code content and optional title.
 */
function CodeBlock({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in">
      {title && (
        <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{title}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
            title="Copy to clipboard"
          >
            {copied ? (
              <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Copied!</>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> Copy</>
            )}
          </button>
        </div>
      )}
      <pre className="bg-slate-950 text-indigo-200 font-mono text-[11px] p-5 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Single stat card used in the metadata grid.
 *
 * @param props - Icon, label, and value for the stat.
 */
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/30 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">{label}</p>
        <p className="text-sm font-bold text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

/**
 * Client component rendering the full public model detail page.
 * Shows model metadata, version timeline, API usage snippet, and a live CTA.
 *
 * @param props - Model data and auth state.
 * @returns The rendered public model detail view.
 */
export default function PublicModelDetailClient({ model, isAuthenticated }: PublicModelDetailClientProps) {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const versions = model.versions ?? [];
  const latestVersion = versions[versions.length - 1];
  const isLive = hasLiveDeployment(versions);

  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState("");
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleSubscribeAndGenerate = async () => {
    setIsGeneratingKey(true);
    try {
      const res = await smartFetch<{ key: string }>("/users/me/api-keys", {
        method: "POST",
        body: JSON.stringify({
          modelId: model.id,
          name: `${model.name} Marketplace Key`,
        }),
      });
      setGeneratedKey(res.key);
      setIsKeyModalOpen(true);
      toast.success("Subscribed and generated API Key!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to subscribe and generate API key";
      toast.error(msg);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(generatedKey);
      setIsCopied(true);
      toast.success("API key copied to clipboard");
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      toast.error("Failed to copy API key");
    }
  };

  // Build a sample curl snippet using the latest version's example payload
  const examplePayload = latestVersion?.examplePayload
    ? latestVersion.examplePayload
    : `{\n  "features": [12, 65.0, 780.0, 1]\n}`;

  const curlSnippet = `curl -X POST https://api.mlhub.io/v1/models/${model.id}/predict \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${examplePayload.replace(/\n/g, "\n  ")}'`;

  const pythonSnippet = `import requests

response = requests.post(
    "https://api.mlhub.io/v1/models/${model.id}/predict",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json=${examplePayload}
)
print(response.json())`;

  const jsSnippet = `const response = await fetch("https://api.mlhub.io/v1/models/${model.id}/predict", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${examplePayload.trim()})
});
const data = await response.json();
console.log(data);`;

  const [activeTab, setActiveTab] = useState<"overview" | "playground" | "api" | "versions">("overview");
  const [activeTabApi, setActiveTabApi] = useState<"curl" | "python" | "javascript">("curl");

  return (
    <div className="min-h-screen bg-background text-foreground animate-fade-in">

      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-slate-50 via-background to-background dark:from-slate-950 dark:via-background">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle, #6366f1 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />
        {/* Glow orb */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 py-12">
          {/* Breadcrumb */}
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Explore
          </Link>

          <div className="flex flex-col gap-6">
            {/* Title & meta badges */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {/* Live status pill */}
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-mono uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Sandbox
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 font-mono uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    Offline
                  </span>
                )}

                {/* Visibility */}
                {model.isPublic ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                    <Globe className="w-3 h-3" /> Public
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700">
                    <Lock className="w-3 h-3" /> Private
                  </span>
                )}

                {/* Model type */}
                {(model as Model & { type?: string }).type && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${modelTypeColor((model as Model & { type?: string }).type!)}`}>
                    <Brain className="w-3 h-3" />
                    {modelTypeLabel((model as Model & { type?: string }).type!)}
                  </span>
                )}

                {/* Framework badge */}
                {(model as Model & { framework?: string }).framework && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-violet-50 text-violet-755 border-violet-200 dark:bg-violet-950/40 dark:text-violet-305 dark:border-violet-800">
                    <Code2 className="w-3 h-3" />
                    {frameworkLabel((model as Model & { framework?: string }).framework!)}
                  </span>
                )}

                {/* Task Type badge */}
                {(model as Model & { taskType?: string }).taskType && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                    <Tag className="w-3 h-3" />
                    {taskTypeLabel((model as Model & { taskType?: string }).taskType!)}
                  </span>
                )}

                {/* Cost/Credits badge */}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  <Zap className="w-3 h-3 text-emerald-500" />
                  {model.costPerRequest && parseFloat(model.costPerRequest as any) > 0
                    ? `${parseFloat(model.costPerRequest as any).toFixed(2)} Credits / Run`
                    : "Free Sandbox Run"
                  }
                </span>
                {model.marketplaceVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                    <Shield className="w-3 h-3" />
                    Verified Provider
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 pb-4">
                <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight font-mono">
                  {model.name}
                </h1>
                {isAuthenticated && (
                  <button
                    onClick={handleSubscribeAndGenerate}
                    disabled={isGeneratingKey}
                    className="btn-primary h-9 px-4 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md select-none rounded-lg active:scale-95 transition-all text-white border-none shrink-0"
                  >
                    {isGeneratingKey ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Key className="w-3.5 h-3.5" />
                    )}
                    <span>Subscribe & Generate API Key</span>
                  </button>
                )}
              </div>

              {model.description && (
                <p className="text-base text-muted-foreground leading-relaxed max-w-4xl">
                  {model.description}
                </p>
              )}

              {/* Publisher */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <span>Published by <strong className="text-foreground">{model.user?.username ?? model.user?.email?.split("@")[0] ?? "MLHub Community"}</strong></span>
                <span className="text-border">·</span>
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(model.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation (100% width) ────────────────────────────────────── */}
      <div className="border-b border-border bg-card/65 backdrop-blur-md sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex w-full">
          {[
            { id: "overview", label: "Overview", icon: <Info className="w-4 h-4" /> },
            { id: "playground", label: "Interactive Playground", icon: <Play className="w-4 h-4" />, hide: !isLive, badge: "Live" },
            { id: "api", label: "API Reference", icon: <Terminal className="w-4 h-4" /> },
            { id: "versions", label: "Releases", icon: <Package className="w-4 h-4" />, count: versions.length },
          ]
            .filter((tab) => !tab.hide)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/30"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500 text-white px-1.5 py-0.5 rounded animate-pulse">
                    {tab.badge}
                  </span>
                )}
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
        </div>
      </div>

      {/* ── Content Area ────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-10">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left Column (2/3 width) */}
            <div className="lg:col-span-2 space-y-8 animate-fade-in">
              <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono">
                  Description
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {model.description || "No description provided for this model."}
                </p>
              </section>

              {/* Input / Output Schema */}
              {latestVersion && (latestVersion.examplePayload || latestVersion.expectedResult) && (
                <section className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-bold text-foreground uppercase tracking-wider font-mono">
                      Input / Output Schema
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {latestVersion.examplePayload && (
                      <CodeBlock
                        code={(() => {
                          try { return JSON.stringify(JSON.parse(latestVersion.examplePayload!), null, 2); }
                          catch { return latestVersion.examplePayload ?? ""; }
                        })()}
                        title="EXAMPLE INPUT"
                      />
                    )}
                    {latestVersion.expectedResult && (
                      <CodeBlock
                        code={(() => {
                          try { return JSON.stringify(JSON.parse(latestVersion.expectedResult!), null, 2); }
                          catch { return latestVersion.expectedResult ?? ""; }
                        })()}
                        title="EXPECTED OUTPUT"
                      />
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column (1/3 width) */}
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                  Metadata Specifications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  <StatCard
                    icon={<Tag className="w-4 h-4" />}
                    label="Model Type"
                    value={modelTypeLabel((model as any).type ?? "—")}
                  />
                  <StatCard
                    icon={<Code2 className="w-4 h-4" />}
                    label="Framework"
                    value={frameworkLabel((model as any).framework ?? "—")}
                  />
                  <StatCard
                    icon={<Brain className="w-4 h-4" />}
                    label="Task Type"
                    value={taskTypeLabel((model as any).taskType ?? "—")}
                  />
                  <StatCard
                    icon={<Package className="w-4 h-4" />}
                    label="Versions"
                    value={`${versions.length} ${versions.length === 1 ? "release" : "releases"}`}
                  />
                  <StatCard
                    icon={<Clock className="w-4 h-4" />}
                    label="Last Updated"
                    value={formatDate(model.updatedAt)}
                  />
                  <StatCard
                    icon={<Calendar className="w-4 h-4" />}
                    label="Published"
                    value={formatDate(model.createdAt)}
                  />
                </div>
              </div>

              {/* Security trust badge */}
              <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/10 dark:to-teal-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono">
                    Sandbox Security
                  </span>
                </div>
                <ul className="space-y-2">
                  {[
                    "Static bundle analysis",
                    "Sandboxed execution environment",
                    "Containerized inference isolation",
                    "Encrypted artifact transfer",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === "playground" && isLive && (
          <div className="animate-fade-in w-full">
            <ModelPlayground model={model} isAuthenticated={isAuthenticated} />
          </div>
        )}

        {activeTab === "api" && (
          <div className="w-full space-y-6 animate-fade-in">
            {/* Quickstart banner */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">API Reference & Quickstart</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Integrate this containerized sandbox into your software stack with simple REST API calls.</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
                Real-time prediction endpoints are protected by secure access tokens. You can authorize inference queries using either your dashboard JWT tokens or your workspace-level API keys. Ensure headers carry the appropriate keys before sending requests.
              </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
              {/* Code Snippets Column (takes 2/3) */}
              <div className="xl:col-span-2 space-y-4">
                <div className="flex gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-fit border border-border select-none animate-fade-in">
                  {(["curl", "python", "javascript"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTabApi(tab)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTabApi === tab
                          ? "bg-white dark:bg-slate-800 text-foreground shadow-sm border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab === "curl" ? "cURL" : tab === "python" ? "Python" : "JavaScript"}
                    </button>
                  ))}
                </div>

                {activeTabApi === "curl" && (
                  <CodeBlock code={curlSnippet} title="TERMINAL — cURL REQUEST" />
                )}
                {activeTabApi === "python" && (
                  <CodeBlock code={pythonSnippet} title="PYTHON — REQUESTS" />
                )}
                {activeTabApi === "javascript" && (
                  <CodeBlock code={jsSnippet} title="JAVASCRIPT — FETCH" />
                )}
              </div>

              {/* Specs Column (takes 1/3) */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                    Runtime Architecture
                  </span>
                </div>
                <div className="space-y-3.5 select-none">
                  {[
                    { label: "Container Engine", value: "Docker / OCI", icon: <Box className="w-4 h-4" /> },
                    { label: "Serving Stack", value: "FastAPI + Uvicorn", icon: <Cpu className="w-4 h-4" /> },
                    { label: "Scaling capability", value: "Auto-scale on Demand", icon: <Zap className="w-4 h-4" /> },
                    { label: "Response Latency", value: "< 200ms p99 SLA", icon: <Clock className="w-4 h-4" /> },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="flex items-center gap-3.5 p-3 rounded-xl bg-secondary/30 border border-border/40 hover:border-primary/20 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-primary/8 text-primary flex items-center justify-center shrink-0">
                        {icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-wider font-semibold block">{label}</span>
                        <p className="text-xs font-extrabold text-foreground font-mono mt-0.5 truncate">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "versions" && (
          <div className="w-full space-y-6 animate-fade-in">
            <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Release History & Versioning</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Track, audit, and run specific deployment checkpoints of this model.</p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold bg-primary/10 text-primary px-3 py-1 rounded-full font-mono uppercase tracking-wider select-none">
                {versions.length} {versions.length === 1 ? "release" : "releases"}
              </span>
            </div>

            <div className="space-y-4">
              {[...versions].reverse().map((version) => {
                const badge = versionStatusBadge(version.status);
                const isExpanded = expandedVersion === version.id;
                const hasDeployment = version.deployments?.some((d) => d.status === DeploymentStatus.RUNNING);

                // Determine border color based on version build status for premium styling
                let statusBorderClass = "border-l-4 border-l-slate-300 dark:border-l-slate-700";
                if (version.status === VersionStatus.READY) {
                  statusBorderClass = "border-l-4 border-l-emerald-500 dark:border-l-emerald-600";
                } else if (version.status === VersionStatus.BUILDING) {
                  statusBorderClass = "border-l-4 border-l-amber-500 dark:border-l-amber-600";
                } else if (version.status === VersionStatus.FAILED) {
                  statusBorderClass = "border-l-4 border-l-red-500 dark:border-l-red-600";
                }

                return (
                  <div
                    key={version.id}
                    className={`border border-border bg-card rounded-xl overflow-hidden hover:border-primary/30 transition-all ${statusBorderClass}`}
                  >
                    <button
                      onClick={() => setExpandedVersion(isExpanded ? null : version.id)}
                      className="w-full flex items-center justify-between px-6 py-4.5 text-left bg-card hover:bg-accent/45 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                          <Hash className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-foreground font-mono">
                              v{version.versionNumber}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">
                              ({version.id.substring(0, 8)})
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 mt-1 select-none">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider ${badge.className}`}>
                              {badge.label}
                            </span>
                            {hasDeployment && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                Active Sandbox Deployment
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground font-mono font-medium">
                          Released {formatDate(version.createdAt)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-6 pt-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/10 space-y-4 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                          <div className="space-y-1 bg-card border border-border p-3.5 rounded-xl hover:border-primary/10 transition-colors">
                            <div className="flex items-center gap-1.5 text-muted-foreground font-mono tracking-wider font-semibold text-[9px] uppercase">
                              <HardDrive className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>Model File</span>
                            </div>
                            <p className="text-foreground font-mono text-[10px] truncate mt-1.5" title={version.modelFilePath || ""}>
                              {version.modelFilePath ? version.modelFilePath.split("/").pop() : "—"}
                            </p>
                          </div>
                          
                          <div className="space-y-1 bg-card border border-border p-3.5 rounded-xl hover:border-primary/10 transition-colors">
                            <div className="flex items-center gap-1.5 text-muted-foreground font-mono tracking-wider font-semibold text-[9px] uppercase">
                              <Sliders className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>Preprocess Hook</span>
                            </div>
                            <p className="text-foreground font-mono text-[10px] truncate mt-1.5">
                              {version.preprocessFilePath ? "preprocess.py ✓" : "Not provided"}
                            </p>
                          </div>

                          <div className="space-y-1 bg-card border border-border p-3.5 rounded-xl hover:border-primary/10 transition-colors">
                            <div className="flex items-center gap-1.5 text-muted-foreground font-mono tracking-wider font-semibold text-[9px] uppercase">
                              <Wrench className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>Postprocess Hook</span>
                            </div>
                            <p className="text-foreground font-mono text-[10px] truncate mt-1.5">
                              {version.postprocessFilePath ? "postprocess.py ✓" : "Not provided"}
                            </p>
                          </div>

                          <div className="space-y-1 bg-card border border-border p-3.5 rounded-xl hover:border-primary/10 transition-colors">
                            <div className="flex items-center gap-1.5 text-muted-foreground font-mono tracking-wider font-semibold text-[9px] uppercase">
                              <Maximize className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>Scaler File</span>
                            </div>
                            <p className="text-foreground font-mono text-[10px] truncate mt-1.5">
                              {version.scalerFilePath ? "scaler.pkl ✓" : "Not provided"}
                            </p>
                          </div>
                        </div>

                        {version.errorMessage && (
                          <div className="text-[10px] text-red-655 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-3.5 py-2.5 font-mono">
                            Error: {version.errorMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Dialog for displaying the generated API key */}
      <Dialog open={isKeyModalOpen} onOpenChange={setIsKeyModalOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border border-border text-foreground font-mono text-xs">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-sm font-bold text-foreground">API Key Generated successfully</DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground">
              Copy this API Key now. For security reasons, you will not be able to see it again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Secret Token Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-xs text-foreground pr-20 outline-none font-mono font-medium"
                  value={generatedKey}
                  readOnly
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded hover:bg-secondary transition-colors border-none bg-transparent"
                    type="button"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleCopyKey}
                    className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded hover:bg-secondary transition-colors border-none bg-transparent"
                    type="button"
                  >
                    {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <button
              onClick={() => setIsKeyModalOpen(false)}
              className="btn-primary py-1.5 h-9 text-[10px] flex-1 cursor-pointer font-bold rounded-lg border-none"
            >
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
