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
} from "lucide-react";
import { Model, ModelVersion } from "@/types";
import { DeploymentStatus, Framework, ModelType, TaskType, VersionStatus } from "@/types/enums";

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
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
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

  const [activeTab, setActiveTab] = useState<"curl" | "python">("curl");

  return (
    <div className="min-h-screen bg-background">

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

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
            {/* Left: Title & meta badges */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {/* Live status pill */}
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-mono uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Live
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
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight font-mono">
                {model.name}
              </h1>

              {model.description && (
                <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
                  {model.description}
                </p>
              )}

              {/* Publisher */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <span>Published by <strong className="text-foreground">{model.user?.username ?? model.user?.email?.split("@")[0] ?? "MLHub Community"}</strong></span>
                <span className="text-border">·</span>
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(model.createdAt)}</span>
              </div>
            </div>

            {/* Right: CTA card */}
            <div className="lg:w-72 shrink-0">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg shadow-black/5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Zap className="w-4 h-4 text-primary" />
                  Deploy & Run Instantly
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Register an account to deploy this model to a sandboxed inference endpoint in seconds.
                </p>

                {isAuthenticated ? (
                  <Link
                    href={`/models/${model.id}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all hover:shadow-md hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Play className="w-4 h-4" /> Open in Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/register"
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all hover:shadow-md hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Sparkles className="w-4 h-4" /> Get Started Free
                    </Link>
                    <Link
                      href="/login"
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
                    >
                      Sign In
                    </Link>
                  </>
                )}

                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground justify-center font-mono">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  Scanned · Containerized · Secure
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Body ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* ── Left Column (2/3 width) ───────────────────────────────── */}
        <div className="lg:col-span-2 space-y-10">

          {/* API Usage Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              <h2 className="text-base font-extrabold text-foreground font-mono uppercase tracking-wider">
                API Usage
              </h2>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-fit border border-border">
              {(["curl", "python"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab
                      ? "bg-white dark:bg-slate-800 text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "curl" ? "cURL" : "Python"}
                </button>
              ))}
            </div>

            {activeTab === "curl" ? (
              <CodeBlock code={curlSnippet} title="TERMINAL — cURL REQUEST" />
            ) : (
              <CodeBlock code={pythonSnippet} title="PYTHON — requests" />
            )}
          </section>

          {/* Example Payload & Expected Result */}
          {latestVersion && (latestVersion.examplePayload || latestVersion.expectedResult) && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-primary" />
                <h2 className="text-base font-extrabold text-foreground font-mono uppercase tracking-wider">
                  Input / Output Schema
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Version History */}
          {versions.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <h2 className="text-base font-extrabold text-foreground font-mono uppercase tracking-wider">
                  Version History
                </h2>
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">
                  {versions.length} {versions.length === 1 ? "release" : "releases"}
                </span>
              </div>

              <div className="space-y-3">
                {[...versions].reverse().map((version) => {
                  const badge = versionStatusBadge(version.status);
                  const isExpanded = expandedVersion === version.id;
                  const hasDeployment = version.deployments?.some((d) => d.status === DeploymentStatus.RUNNING);

                  return (
                    <div
                      key={version.id}
                      className="border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors"
                    >
                      <button
                        onClick={() => setExpandedVersion(isExpanded ? null : version.id)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left bg-card hover:bg-accent/40 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                            <Hash className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-foreground font-mono">
                              v{version.versionNumber}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider ${badge.className}`}>
                                {badge.label}
                              </span>
                              {hasDeployment && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                  Live
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {formatDate(version.createdAt)}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-5 pt-3 border-t border-border bg-slate-50/50 dark:bg-slate-900/20 space-y-3 animate-in fade-in duration-200">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Model File</span>
                              <p className="text-foreground font-mono text-[10px] bg-card border border-border rounded-lg px-2.5 py-1.5 truncate">
                                {version.modelFilePath ? version.modelFilePath.split("/").pop() : "—"}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Preprocess</span>
                              <p className="text-foreground font-mono text-[10px] bg-card border border-border rounded-lg px-2.5 py-1.5 truncate">
                                {version.preprocessFilePath ? "preprocess.py ✓" : "Not provided"}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Postprocess</span>
                              <p className="text-foreground font-mono text-[10px] bg-card border border-border rounded-lg px-2.5 py-1.5 truncate">
                                {version.postprocessFilePath ? "postprocess.py ✓" : "Not provided"}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Scaler</span>
                              <p className="text-foreground font-mono text-[10px] bg-card border border-border rounded-lg px-2.5 py-1.5 truncate">
                                {version.scalerFilePath ? "scaler.pkl ✓" : "Not provided"}
                              </p>
                            </div>
                          </div>
                          {version.errorMessage && (
                            <div className="text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2 font-mono">
                              Error: {version.errorMessage}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* ── Right Column (1/3 width) ─────────────────────────────── */}
        <div className="space-y-6">

          {/* Model Metadata Card */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-extrabold text-foreground font-mono uppercase tracking-wider">
                Model Metadata
              </h3>
            </div>
            <div className="space-y-2.5">
              <StatCard
                icon={<Tag className="w-4 h-4" />}
                label="Model Type"
                value={modelTypeLabel((model as Model & { type?: string }).type ?? "—")}
              />
              <StatCard
                icon={<Code2 className="w-4 h-4" />}
                label="Framework"
                value={frameworkLabel((model as Model & { framework?: string }).framework ?? "—")}
              />
              <StatCard
                icon={<Brain className="w-4 h-4" />}
                label="Task Type"
                value={taskTypeLabel((model as Model & { taskType?: string }).taskType ?? "—")}
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

          {/* Platform Trust Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono">
                Platform Security
              </span>
            </div>
            <ul className="space-y-2">
              {[
                "Static bundle analysis",
                "Sandboxed execution environment",
                "Containerized inference isolation",
                "Encrypted artifact transfer",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Infrastructure Info */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              <span className="text-xs font-extrabold text-foreground uppercase tracking-wider font-mono">
                Inference Runtime
              </span>
            </div>
            <ul className="space-y-2">
              {[
                { label: "Container", value: "Docker / OCI" },
                { label: "Serving", value: "FastAPI + Uvicorn" },
                { label: "Scaling", value: "Auto-scale on demand" },
                { label: "SLA", value: "< 200ms p99 latency" },
              ].map(({ label, value }) => (
                <li key={label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">{label}</span>
                  <span className="font-bold text-foreground font-mono text-[11px]">{value}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* External links */}
          <div className="space-y-2">
            <Link
              href="/explore"
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/30 transition-all text-sm font-semibold text-muted-foreground hover:text-foreground group"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Browse More Models
              </span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
