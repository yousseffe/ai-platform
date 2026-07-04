"use client";

import React, { useState, useCallback, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Layers,
  Cpu,
  Check,
  X,
  SlidersHorizontal,
  ArrowRight,
  Tag,
  Sparkles,
  Activity,
  Package,
  Globe,
  Zap,
  ChevronRight,
  ChevronLeft,
  User,
  Loader2,
  AlertCircle,
  Image,
} from "lucide-react";
import { DeploymentStatus, ModelType, Framework, TaskType } from "@/types";
import type { SearchModelHit, FacetBucket, SearchResult } from "@/types";
import { searchModels } from "@/lib/actions/models.actions";

// ─── Display maps ──────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  TABULAR:  { label: "Tabular & Analytics",   color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30",  border: "border-emerald-200 dark:border-emerald-800/40", icon: Layers },
  NLP:      { label: "Natural Language",       color: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950/30",     border: "border-amber-200 dark:border-amber-800/40",   icon: Globe },
  VISION:   { label: "Computer Vision",        color: "text-blue-700 dark:text-blue-400",     bg: "bg-blue-50 dark:bg-blue-950/30",       border: "border-blue-200 dark:border-blue-800/40",     icon: Cpu },
  LLM_GGUF: { label: "Generative AI & LLMs",   color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30",   border: "border-violet-200 dark:border-violet-800/40", icon: Sparkles },
  DIFFUSION: { label: "Stable Diffusion",      color: "text-pink-700 dark:text-pink-400",     bg: "bg-pink-50 dark:bg-pink-950/30",       border: "border-pink-200 dark:border-pink-800/40",     icon: Image },
  AUDIO:    { label: "Audio Intelligence",     color: "text-cyan-700 dark:text-cyan-400",     bg: "bg-cyan-50 dark:bg-cyan-950/30",       border: "border-cyan-200 dark:border-cyan-800/40",     icon: Activity },
  EMBEDDING: { label: "Embeddings",            color: "text-slate-700 dark:text-slate-300",   bg: "bg-slate-50 dark:bg-slate-900/40",     border: "border-slate-200 dark:border-slate-700/50",   icon: Package },
};

const TYPE_ACCENT: Record<string, string> = {
  TABULAR:  "from-emerald-500 to-teal-500",
  NLP:      "from-amber-500 to-orange-500",
  VISION:   "from-blue-500 to-cyan-500",
  LLM_GGUF: "from-violet-500 to-purple-500",
  DIFFUSION: "from-pink-500 to-rose-500",
  AUDIO:    "from-cyan-500 to-sky-500",
  EMBEDDING: "from-slate-500 to-zinc-500",
};

const DEFAULT_TYPE_META = {
  label: "Other Models",
  color: "text-slate-700 dark:text-slate-300",
  bg: "bg-slate-50 dark:bg-slate-900/40",
  border: "border-slate-200 dark:border-slate-700/50",
  icon: Package,
};

const FRAMEWORK_LABELS: Record<string, string> = {
  SKLEARN: "Scikit-Learn", PYTORCH: "PyTorch", TENSORFLOW: "TensorFlow",
  ONNX: "ONNX Runtime", LLAMA_CPP: "Llama.cpp", VLLM: "vLLM", CUSTOM: "Custom",
};

const TASK_LABELS: Record<string, string> = {
  CLASSIFICATION: "Classification", REGRESSION: "Regression", GENERATION: "Generation",
  OBJECT_DETECTION: "Object Detection", SEGMENTATION: "Segmentation",
  EMBEDDING: "Embeddings", CHAT: "Chat", OTHER: "Other",
};

const AVAILABLE_TYPES      = Object.values(ModelType);
const AVAILABLE_FRAMEWORKS = Object.values(Framework);
const AVAILABLE_TASKS      = Object.values(TaskType);

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * A single checkbox row inside a filter section, showing optional facet counts.
 */
function FilterRow({
  label,
  selected,
  count,
  onToggle,
}: {
  label: string;
  selected: boolean;
  count?: number;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-sm text-left transition-colors group cursor-pointer hover:bg-accent/60"
    >
      <div
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
          selected
            ? "bg-primary border-primary text-white"
            : "bg-card border-border group-hover:border-primary/40"
        }`}
      >
        {selected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
      </div>
      <span className={`flex-1 ${selected ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"}`}>
        {label}
      </span>
      {count !== undefined && (
        <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted px-1 rounded">
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * Individual model card rendered in the results grid.
 */
function ModelCard({ model }: { model: SearchModelHit }) {
  const accent   = TYPE_ACCENT[model.type] || "from-slate-500 to-slate-600";
  const meta     = TYPE_META[model.type] ?? null;
  const TypeIcon = meta?.icon ?? Package;
  const publisherName = model.publisherEmail
    ? model.publisherEmail.split("@")[0]
    : "community";

  return (
    <Link
      href={`/explore/${model.id}`}
      className="group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 hover:border-primary/30"
    >
      {/* Top gradient accent bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${accent} opacity-80 group-hover:opacity-100 transition-opacity`} />

      <div className="p-5 flex flex-col flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-sm shrink-0`}>
            <TypeIcon className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            {model.marketplaceVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500/30">
                Verified
              </span>
            )}
            {model.hasLiveDeployment && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-muted-foreground bg-muted border border-border">
              {model.versionCount > 0 ? `v${model.versionCount}` : "—"}
            </span>
          </div>
        </div>

        {/* Model name */}
        <h3 className="text-sm font-bold text-foreground truncate mb-1 group-hover:text-primary transition-colors">
          {model.name}
        </h3>

        {/* Publisher & Rating Row */}
        <div className="flex items-center justify-between mb-3 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3 h-3 text-muted-foreground shrink-0 text-muted-foreground/80" />
            <span className="truncate">
              {model.organizationName ? model.organizationName : `@${publisherName}`}
            </span>
          </div>
          {model.reviewCount !== undefined && model.reviewCount > 0 && (
            <div className="flex items-center gap-0.5 text-amber-500 shrink-0">
              <span>★</span>
              <span className="font-bold text-foreground">{Number(model.averageRating).toFixed(1)}</span>
              <span className="text-[10px] text-muted-foreground">({model.reviewCount})</span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1 mb-4">
          {model.description || "No description provided for this model."}
        </p>

        {/* Taxonomy tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {meta && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${meta.bg} ${meta.color} ${meta.border}`}>
              <meta.icon className="w-3 h-3" />
              {meta.label}
            </span>
          )}
          {model.framework && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
              {FRAMEWORK_LABELS[model.framework] || model.framework}
            </span>
          )}
          {model.taskType && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40">
              {TASK_LABELS[model.taskType] || model.taskType}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
            <Activity className="w-3 h-3" />
            <span>{model.versionCount} build{model.versionCount !== 1 ? "s" : ""}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
            View Sandbox
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * Explore page client component.
 * Renders the search bar, filter sidebar (with live facet counts from OpenSearch),
 * a model results grid, and pagination controls.
 * All search and filtering is powered by the backend OpenSearch query DSL.
 */
export default function MarketplaceExploreClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filter state — initialized from URL params so deep links work
  const [searchQuery,        setSearchQuery]        = useState(searchParams.get("q") || "");
  const [selectedTypes,      setSelectedTypes]      = useState<string[]>(
    searchParams.get("type") ? [searchParams.get("type")!] : []
  );
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [selectedTasks,      setSelectedTasks]      = useState<string[]>([]);
  const [currentPage,        setCurrentPage]        = useState(1);

  // Search results
  const [results,      setResults]      = useState<SearchResult | null>(null);
  const [searchError,  setSearchError]  = useState<string | null>(null);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Fires the actual OpenSearch query as a server action transition.
   * Debounced for the text query to avoid hammering on every keystroke.
   */
  const executeSearch = useCallback(
    (
      query: string,
      types: string[],
      frameworks: string[],
      tasks: string[],
      page: number,
    ) => {
      startTransition(async () => {
        setSearchError(null);
        const result = await searchModels({
          q: query.trim() || undefined,
          type: types[0] ?? undefined,
          framework: frameworks[0] ?? undefined,
          taskType: tasks[0] ?? undefined,
          page,
          limit: PAGE_SIZE,
        });

        if (result === null) {
          setSearchError("Search is temporarily unavailable. OpenSearch may be starting up.");
          setResults(null);
        } else {
          setResults(result);
        }
      });
    },
    [],
  );

  /** Triggered on any filter/page change — immediate (no debounce). */
  const triggerImmediateSearch = useCallback(
    (
      query: string,
      types: string[],
      frameworks: string[],
      tasks: string[],
      page: number,
    ) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      executeSearch(query, types, frameworks, tasks, page);
    },
    [executeSearch],
  );

  /** Triggered by the text input — debounced to avoid hammering on every keystroke. */
  const triggerDebouncedSearch = useCallback(
    (query: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        executeSearch(query, selectedTypes, selectedFrameworks, selectedTasks, 1);
        setCurrentPage(1);
      }, SEARCH_DEBOUNCE_MS);
    },
    [executeSearch, selectedTypes, selectedFrameworks, selectedTasks],
  );

  // Run initial search on mount
  useEffect(() => {
    triggerImmediateSearch(searchQuery, selectedTypes, selectedFrameworks, selectedTasks, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Event handlers ─────────────────────────────────────────────────────────

  const handleQueryChange = (value: string) => {
    setSearchQuery(value);
    triggerDebouncedSearch(value);
  };

  const toggleType = (value: string) => {
    const next = selectedTypes.includes(value) ? [] : [value];
    setSelectedTypes(next);
    setCurrentPage(1);
    triggerImmediateSearch(searchQuery, next, selectedFrameworks, selectedTasks, 1);
  };

  const toggleFramework = (value: string) => {
    const next = selectedFrameworks.includes(value)
      ? selectedFrameworks.filter((f) => f !== value)
      : [...selectedFrameworks, value];
    setSelectedFrameworks(next);
    setCurrentPage(1);
    triggerImmediateSearch(searchQuery, selectedTypes, next, selectedTasks, 1);
  };

  const toggleTask = (value: string) => {
    const next = selectedTasks.includes(value)
      ? selectedTasks.filter((t) => t !== value)
      : [...selectedTasks, value];
    setSelectedTasks(next);
    setCurrentPage(1);
    triggerImmediateSearch(searchQuery, selectedTypes, selectedFrameworks, next, 1);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTypes([]);
    setSelectedFrameworks([]);
    setSelectedTasks([]);
    setCurrentPage(1);
    triggerImmediateSearch("", [], [], [], 1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    triggerImmediateSearch(searchQuery, selectedTypes, selectedFrameworks, selectedTasks, page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Derived state ──────────────────────────────────────────────────────────

  const hasActiveFilters =
    searchQuery.trim() ||
    selectedTypes.length > 0 ||
    selectedFrameworks.length > 0 ||
    selectedTasks.length > 0;

  const facets = results?.facets;
  const totalPages = results ? Math.ceil(results.total / PAGE_SIZE) : 0;

  /**
   * Returns the facet count for a given key from a facet bucket array.
   * Returns undefined when no aggregation data is loaded yet.
   */
  const getFacetCount = (
    buckets: FacetBucket[] | undefined,
    key: string,
  ): number | undefined => {
    if (!buckets) return undefined;
    return buckets.find((b) => b.key === key)?.doc_count;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full text-foreground">

      {/* ── Hero Search Bar Section ──────────────────────────────────────── */}
      <div className="w-full border-b border-border bg-gradient-to-b from-card/80 to-background relative overflow-hidden py-10 px-6 md:px-12 mb-0">
        {/* Subtle grid decoration */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.018)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.018)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
        {/* Glow blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-40 bg-primary/6 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground font-medium">Explore Models</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
            Explore the Model Registry
          </h1>
          <p className="text-sm text-muted-foreground mb-7 max-w-xl leading-relaxed">
            Browse, filter, and deploy serverless containerized ML inference endpoints — from tabular models to large language models.
          </p>

          {/* Large Search Bar */}
          <div className="relative group">
            {isPending
              ? <Loader2 className="w-5 h-5 text-primary absolute left-4 top-1/2 -translate-y-1/2 animate-spin" />
              : <Search className="w-5 h-5 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
            }
            <input
              type="text"
              placeholder="Search models by name, framework, or description…"
              value={searchQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="w-full pl-12 pr-5 py-4 bg-card border border-border rounded-2xl text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => handleQueryChange("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Category Pills */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs text-muted-foreground font-medium mr-1">Quick filter:</span>
            {AVAILABLE_TYPES.map((type) => {
              const meta = TYPE_META[type] ?? { ...DEFAULT_TYPE_META, label: type };
              const Icon = meta.icon;
              const active = selectedTypes.includes(type);
              const count = getFacetCount(facets?.types, type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                    active
                      ? `${meta.bg} ${meta.color} ${meta.border} shadow-sm`
                      : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {meta.label}
                  {count !== undefined && (
                    <span className="opacity-60 font-mono text-[9px]">({count})</span>
                  )}
                  {active && <X className="w-3 h-3 ml-0.5 opacity-70" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Content: Sidebar + Grid ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Filter Sidebar ─────────────────────────────────────────────── */}
          <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-20">
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Filters</span>
                  {isPending && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />}
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>

              <div className="p-4 space-y-6">
                {/* Category Section */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-2 flex items-center gap-1.5">
                    <Layers className="w-3 h-3" /> Category
                  </p>
                  <div className="space-y-0.5">
                    {AVAILABLE_TYPES.map((type) => (
                      <FilterRow
                        key={type}
                        label={TYPE_META[type]?.label || type}
                        selected={selectedTypes.includes(type)}
                        count={getFacetCount(facets?.types, type)}
                        onToggle={() => toggleType(type)}
                      />
                    ))}
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Framework Section */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-2 flex items-center gap-1.5">
                    <Cpu className="w-3 h-3" /> Framework
                  </p>
                  <div className="space-y-0.5">
                    {AVAILABLE_FRAMEWORKS.map((fw) => (
                      <FilterRow
                        key={fw}
                        label={FRAMEWORK_LABELS[fw] || fw}
                        selected={selectedFrameworks.includes(fw)}
                        count={getFacetCount(facets?.frameworks, fw)}
                        onToggle={() => toggleFramework(fw)}
                      />
                    ))}
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Task Type Section */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-2 flex items-center gap-1.5">
                    <Tag className="w-3 h-3" /> Task Type
                  </p>
                  <div className="space-y-0.5 max-h-52 overflow-y-auto pr-0.5">
                    {AVAILABLE_TASKS.map((task) => (
                      <FilterRow
                        key={task}
                        label={TASK_LABELS[task] || task}
                        selected={selectedTasks.includes(task)}
                        count={getFacetCount(facets?.taskTypes, task)}
                        onToggle={() => toggleTask(task)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Results Column ──────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Results Stat Bar */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {isPending ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…
                    </span>
                  ) : (
                    <>
                      <span className="font-bold text-foreground text-base">
                        {results?.total ?? 0}
                      </span>{" "}
                      model{(results?.total ?? 0) !== 1 ? "s" : ""} found
                    </>
                  )}
                </span>
                {hasActiveFilters && !isPending && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    Filtered
                  </span>
                )}
              </div>
              <Link href="/" className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Back to Home
              </Link>
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mb-5">
                {selectedTypes.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    {TYPE_META[t]?.label || t}
                    <button onClick={() => toggleType(t)} className="hover:opacity-70 cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {selectedFrameworks.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40">
                    {FRAMEWORK_LABELS[f] || f}
                    <button onClick={() => toggleFramework(f)} className="hover:opacity-70 cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {selectedTasks.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800/40">
                    {TASK_LABELS[t] || t}
                    <button onClick={() => toggleTask(t)} className="hover:opacity-70 cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {searchQuery.trim() && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                    &ldquo;{searchQuery}&rdquo;
                    <button onClick={() => handleQueryChange("")} className="hover:opacity-70 cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
            )}

            {/* Error State */}
            {searchError && (
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/40 mb-5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Search Unavailable</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">{searchError}</p>
                </div>
              </div>
            )}

            {/* Loading skeleton */}
            {isPending && !results && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
                    <div className="h-1 w-full bg-muted" />
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-muted" />
                        <div className="w-12 h-5 rounded-md bg-muted" />
                      </div>
                      <div className="h-4 w-3/4 rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                      <div className="h-8 w-full rounded bg-muted" />
                      <div className="flex gap-1.5">
                        <div className="h-5 w-16 rounded-md bg-muted" />
                        <div className="h-5 w-16 rounded-md bg-muted" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isPending && results && results.hits.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center py-24 px-6 rounded-2xl border border-dashed border-border bg-muted/10">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Package className="w-7 h-7 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">No models match your search</h3>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
                  Try different keywords or remove some filters. OpenSearch supports fuzzy matching — try partial names too.
                </p>
                <button onClick={clearFilters} className="btn-primary text-sm font-semibold">
                  Clear All Filters
                </button>
              </div>
            )}

            {/* Results Grid */}
            {results && results.hits.length > 0 && (
              <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 transition-opacity duration-200 ${isPending ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                {results.hits.map((model) => (
                  <ModelCard key={model.id} model={model} />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>

                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      disabled={isPending}
                      className={`w-9 h-9 rounded-xl border text-sm font-medium transition-all ${
                        currentPage === pageNum
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {totalPages > 7 && (
                  <span className="text-sm text-muted-foreground px-1">… {totalPages}</span>
                )}

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages || isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Bottom CTA */}
            {results && results.hits.length > 0 && (
              <div className="mt-12 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-purple-600/5 p-8 flex flex-col md:flex-row items-center justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">Ready to publish your own model?</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                    Upload PyTorch, Scikit-Learn, or GGUF files. We containerize, scan, and deploy prediction endpoints automatically.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="btn-primary text-sm font-semibold shrink-0 flex items-center gap-1.5 py-2.5 px-5"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
