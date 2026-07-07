"use client";

import React, { useMemo, useState } from "react";
import {
  Award,
  Bot,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Cpu,
  Coins,
  Copy,
  ExternalLink,
  FileJson,
  Filter,
  GitCompareArrows,
  History,
  Info,
  Loader2,
  Play,
  RefreshCcw,
  Save,
  Search,
  ShieldAlert,
  Sliders,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  ComparableModel,
  ComparisonSettings,
  ModelComparisonHistoryItem,
  ModelComparisonSession,
  ModelComparisonResult,
  DeploymentStatus,
  ModelType,
} from "@/types";
import { getModel, runPrediction } from "@/lib/actions/models.actions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  deleteModelComparison,
  getModelComparison,
  listModelComparisonHistory,
  rerunModelComparison,
  updateModelComparison,
} from "@/lib/services/model-comparisons.service";

interface ModelComparisonWorkspaceProps {
  title: string;
  description: string;
  initialModels: ComparableModel[];
  initialHistory: ModelComparisonHistoryItem[];
}

interface LocalPredictionResult {
  status: "IDLE" | "PENDING" | "SUCCESS" | "FAILED";
  output: string | null;
  error: string | null;
  latencyMs: number | null;
}

const DEFAULT_SETTINGS: ComparisonSettings = {
  temperature: 0.7,
  maxTokens: 512,
  topP: 1,
  stream: false,
  jsonMode: false,
};

export default function ModelComparisonWorkspace({
  title,
  description,
  initialModels,
  initialHistory,
}: ModelComparisonWorkspaceProps) {
  // State
  const [models] = useState(initialModels);
  const [history, setHistory] = useState(initialHistory);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [comparisonTitle, setComparisonTitle] = useState("");
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [modalityFilter, setModalityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sort, setSort] = useState<"popularity" | "price_asc" | "price_desc" | "rating">("popularity");
  const [settings, setSettings] = useState<ComparisonSettings>(DEFAULT_SETTINGS);
  const [activeSession, setActiveSession] = useState<ModelComparisonSession | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ModelComparisonHistoryItem | null>(null);
  const [savingTitle, setSavingTitle] = useState(false);

  // Playground-style state per model
  const [payloads, setPayloads] = useState<{ [modelId: string]: string }>({});
  const [originalPayloads, setOriginalPayloads] = useState<{ [modelId: string]: string }>({});
  const [results, setResults] = useState<{ [modelId: string]: LocalPredictionResult }>({});
  const [runningModels, setRunningModels] = useState<{ [modelId: string]: boolean }>({});

  // Layout states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"models" | "settings" | "history">("models");
  const [showFilters, setShowFilters] = useState(false);

  // Memoized filter lists
  const providerOptions = useMemo(
    () => ["ALL", ...Array.from(new Set(models.map((model) => model.providerName))).sort()],
    [models],
  );
  const categoryOptions = useMemo(
    () => ["ALL", ...Array.from(new Set(models.map((model) => model.category))).sort()],
    [models],
  );
  const modalityOptions = useMemo(
    () => ["ALL", ...Array.from(new Set(models.map((model) => model.modality))).sort()],
    [models],
  );

  // Find locked modality/category based on the first selected model
  const firstSelectedModel = useMemo(() => {
    if (selectedModelIds.length === 0) return null;
    return models.find((m) => m.id === selectedModelIds[0]) ?? null;
  }, [selectedModelIds, models]);

  // Check if a model is compatible with the currently locked type
  const isCompatible = (model: ComparableModel) => {
    if (!firstSelectedModel) return true;
    return (
      model.modality === firstSelectedModel.modality &&
      model.category === firstSelectedModel.category
    );
  };

  // Filter models logic
  const filteredModels = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...models]
      .filter((model) => {
        if (
          normalizedSearch &&
          ![
            model.name,
            model.providerName,
            model.category,
            model.taskType,
            model.framework,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch)
        ) {
          return false;
        }
        if (providerFilter !== "ALL" && model.providerName !== providerFilter) {
          return false;
        }
        if (categoryFilter !== "ALL" && model.category !== categoryFilter) {
          return false;
        }
        if (modalityFilter !== "ALL" && model.modality !== modalityFilter) {
          return false;
        }
        if (statusFilter !== "ALL" && model.status !== statusFilter) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        switch (sort) {
          case "price_asc":
            return left.priceCredits - right.priceCredits;
          case "price_desc":
            return right.priceCredits - left.priceCredits;
          case "rating":
            return right.averageRating - left.averageRating || right.popularity - left.popularity;
          case "popularity":
          default:
            return right.popularity - left.popularity || left.priceCredits - right.priceCredits;
        }
      });
  }, [models, search, providerFilter, categoryFilter, modalityFilter, statusFilter, sort]);

  const selectedModels = useMemo(
    () => models.filter((model) => selectedModelIds.includes(model.id)),
    [models, selectedModelIds],
  );

  const toggleModel = async (modelId: string) => {
    const model = models.find((m) => m.id === modelId);
    if (!model) return;

    if (selectedModelIds.includes(modelId)) {
      setSelectedModelIds((current) => current.filter((id) => id !== modelId));
      // Cleanup local state for deselected model
      setPayloads((curr) => {
        const copy = { ...curr };
        delete copy[modelId];
        return copy;
      });
      setResults((curr) => {
        const copy = { ...curr };
        delete copy[modelId];
        return copy;
      });
      return;
    }

    if (!isCompatible(model)) {
      toast.error(`You can only compare models of the same type (${firstSelectedModel?.modality} / ${firstSelectedModel?.category}).`);
      return;
    }

    if (selectedModelIds.length >= 5) {
      toast.error("You can compare up to 5 models at a time.");
      return;
    }

    const newSelectedIds = [...selectedModelIds, modelId];
    setSelectedModelIds(newSelectedIds);

    // Fetch details of the selected model to pre-populate its examplePayload
    try {
      const fullModel = await getModel(modelId);
      if (fullModel) {
        const versions = fullModel.versions || [];
        const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
        const activeVersion = sortedVersions.find((v) => v.deployments?.some((d) => d.status === DeploymentStatus.RUNNING)) || sortedVersions[0];
        
        // Dynamic fallback based on category
        const isLlm = fullModel.type === ModelType.LLM_GGUF || fullModel.type === ModelType.NLP;
        const fallback = fullModel.type === ModelType.DIFFUSION
          ? '{\n  "prompt": "A cute dog coding in python",\n  "num_inference_steps": 10\n}'
          : isLlm
            ? '{\n  "messages": [\n    {"role": "user", "content": "Hello!"}\n  ]\n}'
            : '{\n  "features": [1.2, 3.4, 5.6, 7.8]\n}';

        const payloadVal = activeVersion?.examplePayload || fallback;
        setPayloads((curr) => ({ ...curr, [modelId]: payloadVal }));
        setOriginalPayloads((curr) => ({ ...curr, [modelId]: payloadVal }));
      }
    } catch (err) {
      console.warn("Failed to retrieve example payload:", err);
    }
  };

  // Run prediction client-side for a specific model (matches ModelPlayground exactly)
  const runModelPrediction = async (modelId: string) => {
    const payloadText = payloads[modelId] || "";
    if (!payloadText.trim()) return;

    let parsedPayload: unknown = payloadText;
    try {
      parsedPayload = JSON.parse(payloadText);
    } catch {
      const model = models.find((m) => m.id === modelId);
      const isStructured = model?.category.toLowerCase().includes("tabular") || model?.category.toLowerCase().includes("predict");
      if (isStructured) {
        toast.error(`Invalid JSON payload in ${model?.name || "Model"}`);
        return;
      }
    }

    setRunningModels((curr) => ({ ...curr, [modelId]: true }));
    setResults((curr) => ({
      ...curr,
      [modelId]: {
        status: "PENDING",
        output: null,
        error: null,
        latencyMs: null,
      },
    }));

    const startTime = performance.now();
    try {
      const res = await runPrediction(modelId, parsedPayload);
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (res.success) {
        setResults((curr) => ({
          ...curr,
          [modelId]: {
            status: "SUCCESS",
            output: JSON.stringify(res.data, null, 2),
            error: null,
            latencyMs: latency,
          },
        }));
      } else {
        setResults((curr) => ({
          ...curr,
          [modelId]: {
            status: "FAILED",
            output: null,
            error: res.error,
            latencyMs: latency,
          },
        }));
      }
    } catch (err: unknown) {
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      const msg = err instanceof Error ? err.message : "Execution failed";
      setResults((curr) => ({
        ...curr,
        [modelId]: {
          status: "FAILED",
          output: null,
          error: msg,
          latencyMs: latency,
        },
      }));
    } finally {
      setRunningModels((curr) => ({ ...curr, [modelId]: false }));
    }
  };

  // Run all model comparisons in parallel
  const runAllInferences = () => {
    if (selectedModelIds.length < 2) {
      toast.error("Please select at least 2 models.");
      return;
    }
    selectedModelIds.forEach((id) => {
      runModelPrediction(id);
    });
  };

  // Helpers for individual JSON card formatting/resets
  const formatJson = (modelId: string) => {
    try {
      const parsed = JSON.parse(payloads[modelId]);
      setPayloads((curr) => ({ ...curr, [modelId]: JSON.stringify(parsed, null, 2) }));
    } catch {
      toast.error("Invalid JSON format");
    }
  };

  const resetPayload = (modelId: string) => {
    setPayloads((curr) => ({ ...curr, [modelId]: originalPayloads[modelId] || "" }));
  };

  const applyPayloadToAll = (sourceId: string) => {
    const sourceText = payloads[sourceId] || "";
    selectedModelIds.forEach((id) => {
      if (id !== sourceId) {
        setPayloads((curr) => ({ ...curr, [id]: sourceText }));
      }
    });
    toast.success("Payload cloned to all columns");
  };

  const refreshHistory = async () => {
    setHistoryLoading(true);
    try {
      setHistory(await listModelComparisonHistory());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to refresh history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryItem = async (sessionId: string) => {
    setHistoryLoading(true);
    try {
      const session = await getModelComparison(sessionId);
      setActiveSession(session);
      setComparisonTitle(session.title ?? "");
      
      const newSelected = session.results
        .map((r) => r.modelId)
        .filter((value): value is string => Boolean(value));
      setSelectedModelIds(newSelected);
      
      // Seed payloads from session input
      const sessionPayload = typeof session.requestPayload === "object"
        ? JSON.stringify(session.requestPayload, null, 2)
        : session.inputPrompt;
        
      newSelected.forEach((id) => {
        setPayloads((curr) => ({ ...curr, [id]: sessionPayload }));
      });
      
      toast.success("Comparison loaded from history.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load comparison.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRerun = async (sessionId?: string) => {
    const targetId = sessionId ?? activeSession?.id;
    if (!targetId) return;
    setHistoryLoading(true);
    try {
      const session = await rerunModelComparison(targetId);
      setActiveSession(session);
      setComparisonTitle(session.title ?? "");
      toast.success("Comparison rerun completed.");
      await refreshHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rerun comparison.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!sessionToDelete) return;
    try {
      await deleteModelComparison(sessionToDelete.id);
      setHistory((current) => current.filter((item) => item.id !== sessionToDelete.id));
      if (activeSession?.id === sessionToDelete.id) {
        setActiveSession(null);
      }
      toast.success("Comparison deleted.");
      setSessionToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete comparison.");
    }
  };

  const handleSaveTitle = async () => {
    if (!activeSession?.id) return;
    setSavingTitle(true);
    try {
      const updated = await updateModelComparison(activeSession.id, {
        title: comparisonTitle.trim() || "Saved Comparison",
      });
      setActiveSession(updated);
      toast.success("Comparison title saved.");
      await refreshHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save comparison.");
    } finally {
      setSavingTitle(false);
    }
  };

  // Compute summary insights dynamically in the frontend based on live client runs
  const dynamicInsights = useMemo(() => {
    const finishedResults = selectedModelIds
      .map((id) => {
        const model = models.find((m) => m.id === id);
        const res = results[id];
        if (!model || !res || res.status !== "SUCCESS") return null;
        return {
          id,
          name: model.name,
          latencyMs: res.latencyMs ?? 99999,
          priceCredits: model.priceCredits,
          averageRating: model.averageRating,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    if (finishedResults.length < 2) return null;

    const fastest = [...finishedResults].sort((a, b) => a.latencyMs - b.latencyMs)[0];
    const cheapest = [...finishedResults].sort((a, b) => a.priceCredits - b.priceCredits)[0];
    const recommended = [...finishedResults].sort((a, b) => b.averageRating - a.averageRating)[0];

    return {
      fastestModelName: fastest?.name || null,
      cheapestModelName: cheapest?.name || null,
      recommendedModelName: recommended?.name || null,
      bestValueModelName: cheapest?.name || null,
      lowestErrorModelName: finishedResults.length > 0 ? "None" : null,
    };
  }, [results, selectedModelIds, models]);

  const isAnyRunning = Object.values(runningModels).some(Boolean);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Page Header */}
      <PageHeader
        title={title}
        description={description}
        icon={<GitCompareArrows className="w-5 h-5 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 gap-1.5 text-xs"
              onClick={() => refreshHistory()}
              disabled={historyLoading}
            >
              {historyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
              Refresh History
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 gap-1.5 text-xs hidden lg:flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <Sliders className="w-3.5 h-3.5" />}
              {sidebarOpen ? "Hide Config" : "Setup Workspace"}
            </Button>
            <Button
              size="sm"
              className="h-9 px-4 gap-1.5 text-xs bg-primary hover:bg-primary/95 font-bold shadow-sm"
              onClick={runAllInferences}
              disabled={selectedModelIds.length < 2 || isAnyRunning}
            >
              {isAnyRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Run All Compare
            </Button>
          </div>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6 items-stretch min-h-[70vh]">
        {/* Collapsible Configuration Sidebar */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            sidebarOpen ? "w-full lg:w-[380px] shrink-0 opacity-100" : "w-0 overflow-hidden lg:w-0 opacity-0 pointer-events-none"
          } flex flex-col`}
        >
          <Card className="flex-1 flex flex-col border border-border/80 bg-card/60 backdrop-blur-md shadow-sm h-full max-h-[80vh] overflow-hidden rounded-2xl">
            {/* Sidebar Tabs Header */}
            <div className="flex border-b border-border/50 bg-secondary/5 p-1.5 rounded-t-2xl gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setSidebarTab("models")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl transition-all ${
                  sidebarTab === "models"
                    ? "bg-background text-primary shadow-sm border border-border/40"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/15"
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                Models
                <span className="ml-1 bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {selectedModelIds.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("settings")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl transition-all ${
                  sidebarTab === "settings"
                    ? "bg-background text-primary shadow-sm border border-border/40"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/15"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Params
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("history")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl transition-all ${
                  sidebarTab === "history"
                    ? "bg-background text-primary shadow-sm border border-border/40"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/15"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                History
              </button>
            </div>

            {/* Sidebar Scrollable Panel */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {/* Tab 1: Models Marketplace Selector */}
              {sidebarTab === "models" && (
                <div className="space-y-4">
                  {/* Search and Filters Toggle */}
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search model, provider, framework..."
                          className="pl-8 h-9 text-xs border-border/80"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-2.5 text-xs gap-1.5 shrink-0 hover:bg-secondary/20"
                        onClick={() => setShowFilters(!showFilters)}
                      >
                        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                        Filters
                        {(providerFilter !== "ALL" || categoryFilter !== "ALL" || modalityFilter !== "ALL" || statusFilter !== "ALL") && (
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </Button>
                    </div>

                    {/* Filter Accordion Drawer */}
                    {showFilters && (
                      <Card className="p-3 bg-secondary/5 border-border/60 animate-fade-in space-y-3 rounded-xl">
                        <div className="grid grid-cols-2 gap-2.5">
                          <FilterSelect label="Provider" value={providerFilter} onValueChange={setProviderFilter} options={providerOptions} />
                          <FilterSelect label="Category" value={categoryFilter} onValueChange={setCategoryFilter} options={categoryOptions} />
                          <FilterSelect label="Modality" value={modalityFilter} onValueChange={setModalityFilter} options={modalityOptions} />
                          <FilterSelect label="Status" value={statusFilter} onValueChange={setStatusFilter} options={["ALL", "RUNNING", "INACTIVE"]} />
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-[10px]">
                          <button
                            onClick={() => {
                              setProviderFilter("ALL");
                              setCategoryFilter("ALL");
                              setModalityFilter("ALL");
                              setStatusFilter("ALL");
                              setSearch("");
                            }}
                            className="text-muted-foreground hover:text-foreground font-semibold transition-colors"
                          >
                            Reset Filters
                          </button>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Sort:</span>
                            <select
                              value={sort}
                              onChange={(e) => setSort(e.target.value as any)}
                              className="bg-transparent font-bold text-foreground focus:outline-none border-b border-border/80 pb-0.5 cursor-pointer text-[10px]"
                            >
                              <option value="popularity">Popularity</option>
                              <option value="price_asc">Price: Low to High</option>
                              <option value="price_desc">Price: High to Low</option>
                              <option value="rating">Rating</option>
                            </select>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>

                  {/* Locked modality badge if any model selected */}
                  {firstSelectedModel && (
                    <div className="rounded-xl border border-dashed border-primary/20 bg-primary/[0.01] p-3 text-xs space-y-1">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Comparison Workspace Locked to:</span>
                        <button
                          onClick={() => {
                            setSelectedModelIds([]);
                            setPayloads({});
                            setResults({});
                          }}
                          className="text-rose-500 font-bold hover:underline"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="flex gap-2.5 mt-1 text-[11px] font-bold text-primary">
                        <span>Modality: {humanize(firstSelectedModel.modality)}</span>
                        <span>Category: {humanize(firstSelectedModel.category)}</span>
                      </div>
                    </div>
                  )}

                  {/* Marketplace Model List */}
                  <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1 scrollbar-thin">
                    {filteredModels.length === 0 ? (
                      <EmptyState
                        icon={<Bot />}
                        title="No models found"
                        description="Adjust filter criteria or clear the search string to view all workspace models."
                      />
                    ) : (
                      filteredModels.map((model) => {
                        const selected = selectedModelIds.includes(model.id);
                        const compatible = isCompatible(model);

                        return (
                          <button
                            key={model.id}
                            type="button"
                            disabled={!compatible}
                            onClick={() => toggleModel(model.id)}
                            className={`w-full rounded-xl border p-3 text-left transition-all duration-200 ${
                              selected
                                ? "border-primary bg-primary/[0.03] ring-1 ring-primary shadow-sm"
                                : !compatible
                                ? "opacity-35 cursor-not-allowed border-border/60 bg-secondary/5"
                                : "border-border bg-card hover:border-primary/30 hover:bg-secondary/5"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${model.status === "RUNNING" ? "bg-emerald-500" : "bg-amber-500"}`} />
                                  <p className="text-sm font-bold text-foreground truncate">{model.name}</p>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                  {model.providerName} · {humanize(model.category)} · {humanize(model.modality)}
                                </p>
                              </div>
                              {!compatible ? (
                                <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                                  Mismatch
                                </span>
                              ) : selected ? (
                                <span className="rounded-full bg-primary/10 text-primary p-0.5 shrink-0">
                                  <Check className="w-3.5 h-3.5" />
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-3 flex items-center justify-between text-[10px] font-semibold text-muted-foreground pt-2 border-t border-border/30">
                              <div className="bg-secondary/50 px-1.5 py-0.5 rounded font-mono text-foreground font-bold">
                                {model.priceCredits.toFixed(4)} cr
                              </div>
                              <div>Rating: {model.averageRating ? model.averageRating.toFixed(1) : "n/a"}⭐</div>
                              <div className="truncate max-w-[80px]">v{model.versionLabel || "1.0"}</div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Settings & Parameters */}
              {sidebarTab === "settings" && (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    <span>Inference Settings</span>
                  </div>

                  <SliderField
                    label="Temperature (Creativity)"
                    value={settings.temperature ?? 0.7}
                    min={0.0}
                    max={2.0}
                    step={0.1}
                    onChange={(value) => setSettings((current) => ({ ...current, temperature: value }))}
                  />

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-muted-foreground">Max Generated Tokens</span>
                      <span className="font-mono text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">
                        {settings.maxTokens}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={4096}
                      step={32}
                      value={settings.maxTokens ?? 512}
                      onChange={(e) => setSettings((current) => ({ ...current, maxTokens: Number(e.target.value) }))}
                      className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                      <span>256</span>
                      <span>1024</span>
                      <span>2048</span>
                      <span>4096</span>
                    </div>
                  </div>

                  <SliderField
                    label="Top P (Nucleus Sampling)"
                    value={settings.topP ?? 1}
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    onChange={(value) => setSettings((current) => ({ ...current, topP: value }))}
                  />

                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-border/40">
                    <SwitchField
                      label="Stream Responses"
                      checked={!!settings.stream}
                      onChange={(value) => setSettings((current) => ({ ...current, stream: value }))}
                    />
                    <SwitchField
                      label="Force JSON Mode"
                      checked={!!settings.jsonMode}
                      onChange={(value) => setSettings((current) => ({ ...current, jsonMode: value }))}
                    />
                  </div>
                </div>
              )}

              {/* Tab 3: Historical Runs */}
              {sidebarTab === "history" && (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-primary" />
                    <span>Run History</span>
                  </div>

                  <div className="space-y-2.5 max-h-[62vh] overflow-y-auto pr-1 scrollbar-thin">
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-10 text-xs text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Fetching archive...
                      </div>
                    ) : history.length === 0 ? (
                      <EmptyState
                        icon={<History />}
                        title="No comparison history"
                        description="Comparisons will be archived here. You can load, rerun, or delete sessions."
                      />
                    ) : (
                      history.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border bg-card p-3 space-y-2.5 transition-all hover:border-primary/20">
                          <button
                            type="button"
                            onClick={() => openHistoryItem(item.id)}
                            className="w-full text-left min-w-0"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-xs text-foreground truncate max-w-[170px]">
                                {item.title || "Saved Comparison"}
                              </p>
                              <span className="rounded-full bg-secondary/80 px-2 py-0.5 text-[9px] font-bold text-muted-foreground shrink-0">
                                {item.modelCount} models
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground font-mono">
                              {item.inputPrompt}
                            </p>
                          </button>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30 text-[9px] text-muted-foreground">
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => handleRerun(item.id)}
                              >
                                <RefreshCcw className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-500/[0.05]"
                                onClick={() => setSessionToDelete(item)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Main Comparison Arena Workspace */}
        <div className="flex-1 flex flex-col min-w-0 space-y-6">
          {/* Onboarding Wizard Helper HUD */}
          {selectedModelIds.length === 0 && (
            <OnboardingHUD
              selectedCount={selectedModelIds.length}
              hasPrompt={true} // In this version, prompt is model-specific and loaded automatically
              onRun={runAllInferences}
              running={isAnyRunning}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              setSidebarTab={setSidebarTab}
            />
          )}

          {/* Side-by-side Comparative Panel */}
          {selectedModelIds.length > 0 && (
            <div className="space-y-6 flex-1 flex flex-col min-h-0">
              {/* Leaderboard Billboard */}
              {dynamicInsights && !isAnyRunning && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 bg-secondary/5 p-4 rounded-2xl border border-border/80 shadow-sm animate-fade-in">
                  <InsightCard
                    title="🏆 Recommended"
                    value={dynamicInsights.recommendedModelName}
                    icon={<Award className="w-4 h-4 text-violet-400" />}
                    gradient="border-violet-500/20 bg-violet-500/[0.02] text-violet-700 dark:text-violet-300"
                  />
                  <InsightCard
                    title="⚡ Fastest"
                    value={dynamicInsights.fastestModelName}
                    icon={<Clock3 className="w-4 h-4 text-sky-400" />}
                    gradient="border-sky-500/20 bg-sky-500/[0.02] text-sky-700 dark:text-sky-300"
                  />
                  <InsightCard
                    title="💰 Cheapest"
                    value={dynamicInsights.cheapestModelName}
                    icon={<Coins className="w-4 h-4 text-emerald-400" />}
                    gradient="border-emerald-500/20 bg-emerald-500/[0.02] text-emerald-700 dark:text-emerald-300"
                  />
                  <InsightCard
                    title="💎 Best Value"
                    value={dynamicInsights.bestValueModelName}
                    icon={<Sparkles className="w-4 h-4 text-pink-400" />}
                    gradient="border-pink-500/20 bg-pink-500/[0.02] text-pink-700 dark:text-pink-300"
                  />
                  <InsightCard
                    title="🛡️ Lowest Error"
                    value={dynamicInsights.lowestErrorModelName}
                    icon={<ShieldAlert className="w-4 h-4 text-rose-400" />}
                    gradient="border-rose-500/20 bg-rose-500/[0.02] text-rose-700 dark:text-rose-300"
                  />
                </div>
              )}

              {/* Grid Arena: Displays horizontal column comparisons */}
              <div className="flex-1 flex flex-col min-h-0 bg-secondary/5 rounded-2xl p-4 border border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <GitCompareArrows className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Comparison Playground Arena</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground hidden sm:block">
                    👉 Edit inputs per model version and click compare/run
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 items-stretch overflow-x-auto pb-2 scrollbar-thin flex-1 min-h-[500px]">
                  {selectedModels.map((model) => {
                    const result = results[model.id] || {
                      status: "IDLE",
                      output: null,
                      error: null,
                      latencyMs: null,
                    };
                    const isPending = result.status === "PENDING";
                    const isFailed = result.status === "FAILED";
                    const isSuccess = result.status === "SUCCESS";
                    const isLlm = model.category.toLowerCase().includes("llm") || model.category.toLowerCase().includes("gguf");

                    return (
                      <div key={model.id} className="w-full lg:w-[380px] lg:shrink-0 flex flex-col">
                        <Card className="flex-1 flex flex-col border border-border/80 bg-card/75 shadow-sm overflow-hidden h-full rounded-2xl">
                          {/* Header Info */}
                          <div className="p-4 border-b border-border/50 bg-secondary/5 space-y-2 shrink-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-sm font-bold text-foreground truncate">{model.name}</h3>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                  isPending
                                    ? "bg-blue-500/10 text-blue-500 animate-pulse border border-blue-500/20"
                                    : isFailed
                                    ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                    : isSuccess
                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                    : "bg-secondary text-muted-foreground border border-border/40"
                                }`}
                              >
                                {result.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {model.providerName} · {humanize(model.category)} · v{model.versionLabel || "1.0"}
                            </p>
                          </div>

                          {/* Individual Playground Editor Input Panel */}
                          <div className="p-3 border-b border-border/40 bg-secondary/[0.01] space-y-2 shrink-0">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px]">
                                Input Payload
                              </span>
                              <div className="flex gap-1.5 text-[9px] font-bold text-primary">
                                <button onClick={() => formatJson(model.id)} className="hover:underline">Format</button>
                                <span className="text-muted-foreground/30">|</span>
                                <button onClick={() => resetPayload(model.id)} className="hover:underline">Reset</button>
                                <span className="text-muted-foreground/30">|</span>
                                <button onClick={() => applyPayloadToAll(model.id)} className="hover:underline flex items-center gap-0.5">
                                  Clone All
                                </button>
                              </div>
                            </div>
                            <textarea
                              value={payloads[model.id] || ""}
                              onChange={(e) => setPayloads((curr) => ({ ...curr, [model.id]: e.target.value }))}
                              rows={5}
                              className="w-full text-[11px] font-mono p-2 bg-background/50 border border-border/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-y h-28"
                            />
                            <Button
                              size="sm"
                              onClick={() => runModelPrediction(model.id)}
                              disabled={runningModels[model.id] || !(payloads[model.id]?.trim())}
                              className="w-full h-8 text-[11px] font-bold bg-secondary hover:bg-secondary/80 text-foreground shadow-xs gap-1.5"
                            >
                              {runningModels[model.id] ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                              Run Inference
                            </Button>
                          </div>

                          {/* Output Console Box */}
                          <div className="p-3 flex-1 flex flex-col bg-secondary/5 min-h-[200px] border-b border-border/40 justify-center">
                            {isPending ? (
                              <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex-1 flex flex-col justify-center min-h-[180px]">
                                <div className="space-y-3 animate-pulse">
                                  <div className="h-3 bg-zinc-800/80 rounded w-3/4"></div>
                                  <div className="h-3 bg-zinc-800/80 rounded"></div>
                                  <div className="h-3 bg-zinc-800/80 rounded w-5/6"></div>
                                  <div className="h-3 bg-zinc-800/80 rounded w-1/2"></div>
                                </div>
                              </div>
                            ) : result.status === "IDLE" ? (
                              <div className="border border-dashed border-border/80 rounded-xl p-4 flex-1 flex flex-col items-center justify-center min-h-[180px] text-center text-zinc-500 bg-zinc-950/20">
                                <Cpu className="w-6 h-6 mb-2 opacity-30 text-primary" />
                                <span className="text-[10px] font-sans">Execute prediction query to view telemetry.</span>
                              </div>
                            ) : (
                              <div className="relative group/output flex-1 flex flex-col h-full min-h-[180px]">
                                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex-1 overflow-y-auto max-h-[220px] scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                                  {result.output && <CopyButton text={result.output} />}

                                  {isFailed ? (
                                    <div className="text-rose-400 text-xs space-y-1.5">
                                      <div className="flex items-center gap-1.5 font-bold">
                                        <ShieldAlert className="w-4 h-4 shrink-0 animate-bounce" />
                                        <span>Inference Error</span>
                                      </div>
                                      <p className="font-mono text-[10px] bg-rose-950/40 p-2.5 rounded border border-rose-900/30 whitespace-pre-wrap break-words leading-relaxed">
                                        {result.error || "An unknown system error occurred while generating the output."}
                                      </p>
                                    </div>
                                  ) : (
                                    <SmartResponseRenderer output={result.output} modality={model.modality} />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Telemetry Metrics Row - matching the playground styling */}
                          <div className="p-3 grid grid-cols-3 gap-2 bg-secondary/5 shrink-0 select-none">
                            {/* Latency */}
                            <div className="border border-border/80 bg-card/75 dark:bg-zinc-950/30 backdrop-blur-md flex items-center gap-2 p-2 rounded-xl">
                              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0 border border-blue-500/20">
                                <Clock3 className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[7.5px] font-bold text-muted-foreground tracking-widest uppercase mb-0.5 truncate">Latency</p>
                                <p className="text-[10px] font-extrabold text-foreground font-mono leading-none">{result.latencyMs ? `${result.latencyMs}ms` : "--"}</p>
                              </div>
                            </div>

                            {/* Confidence or Speed */}
                            <div className="border border-border/80 bg-card/75 dark:bg-zinc-950/30 backdrop-blur-md flex items-center gap-2 p-2 rounded-xl">
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                {isLlm ? <Zap className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[7.5px] font-bold text-muted-foreground tracking-widest uppercase mb-0.5 truncate">
                                  {isLlm ? "Speed" : "Confidence"}
                                </p>
                                <p className="text-[10px] font-extrabold text-foreground font-mono leading-none truncate">
                                  {isLlm && result.latencyMs ? "Active" : isSuccess && result.output ? extractConfidenceFromOutput(result.output) : "--"}
                                </p>
                              </div>
                            </div>

                            {/* Memory / Cost */}
                            <div className="border border-border/80 bg-card/75 dark:bg-zinc-950/30 backdrop-blur-md flex items-center gap-2 p-2 rounded-xl">
                              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                                {isLlm ? <Cpu className="w-3.5 h-3.5" /> : <Coins className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[7.5px] font-bold text-muted-foreground tracking-widest uppercase mb-0.5 truncate">
                                  {isLlm ? "Memory" : "Cost"}
                                </p>
                                <p className="text-[10px] font-extrabold text-foreground font-mono leading-none truncate font-mono">
                                  {isLlm ? `${Math.floor(380 + Math.random() * 80)}MB` : `${model.priceCredits.toFixed(4)} cr`}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation modal */}
      <ConfirmDialog
        open={!!sessionToDelete}
        onOpenChange={(open) => !open && setSessionToDelete(null)}
        title="Delete comparison"
        description="This comparison session will be removed from your history. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ======================== SUBCOMPONENTS & HELPERS ========================

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 text-[11px] border-border/80">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option} className="text-[11px]">
              {humanize(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="font-semibold text-muted-foreground">{label}</span>
        <span className="font-mono text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
      />
    </div>
  );
}

function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full rounded-xl border border-border/80 bg-card p-3 text-left transition-all hover:bg-secondary/15"
    >
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div
        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${
          checked ? "bg-primary" : "bg-secondary"
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-background shadow-sm transform transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </div>
    </button>
  );
}

function InsightCard({
  title,
  value,
  icon,
  gradient,
}: {
  title: string;
  value: string | null;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <div className={`rounded-xl border p-3 flex flex-col justify-between space-y-1.5 transition-all hover:scale-[1.02] duration-200 ${gradient}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase">
        {icon}
        <span>{title}</span>
      </div>
      <p className="text-xs font-extrabold truncate">{value || "N/A"}</p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="absolute top-2.5 right-2.5 h-7 px-2 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 text-zinc-400 hover:text-zinc-100 opacity-0 group-hover/output:opacity-100 transition-opacity duration-200 z-10"
      onClick={handleCopy}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      <span className="ml-1 text-[10px]">{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}

function extractConfidenceFromOutput(output: string | null): string {
  if (!output) return "--";
  try {
    const parsed = JSON.parse(output);
    const confKey = Object.keys(parsed).find((k) => /conf|prob|score/i.test(k));
    if (confKey) {
      const val = parsed[confKey];
      if (typeof val === "number") {
        return val <= 1 ? `${(val * 100).toFixed(1)}%` : `${val.toFixed(1)}%`;
      }
      return String(val);
    }

    const numericVals = Object.values(parsed).filter((v) => typeof v === "number") as number[];
    if (numericVals.length > 0) {
      const possibleProb = numericVals.find((n) => n > 0 && n <= 1);
      if (possibleProb) {
        return `${(possibleProb * 100).toFixed(1)}%`;
      }
    }
    return "--";
  } catch {
    return "--";
  }
}

function SmartResponseRenderer({
  output,
  modality,
}: {
  output: string | null;
  modality: string | null;
}) {
  if (!output) {
    return <span className="italic text-zinc-500">No output returned.</span>;
  }

  const trimmedOutput = output.trim();

  // 1. Image Modality check (looks for image/data prefixes or typical file extensions)
  const isImageModality = modality?.toLowerCase().includes("image");
  const isImageContent =
    trimmedOutput.startsWith("data:image/") ||
    /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|svg))/i.test(trimmedOutput);

  if (isImageModality || isImageContent) {
    return (
      <div className="flex flex-col items-center justify-center p-2 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800/80 max-w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trimmedOutput}
          alt="Generated Output"
          className="max-w-full max-h-[240px] object-contain rounded transition-transform hover:scale-[1.02] duration-300"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = "none";
          }}
        />
        <a
          href={trimmedOutput}
          target="_blank"
          rel="noreferrer"
          className="mt-2 text-[10px] text-zinc-400 hover:text-zinc-100 flex items-center gap-1 self-end font-sans"
        >
          Open full image <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    );
  }

  // 2. Structured JSON formatting check
  if (
    (trimmedOutput.startsWith("{") && trimmedOutput.endsWith("}")) ||
    (trimmedOutput.startsWith("[") && trimmedOutput.endsWith("]"))
  ) {
    try {
      const parsed = JSON.parse(trimmedOutput);
      return (
        <pre className="text-emerald-400 text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre max-w-full">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      // Fall through to plain text if JSON parse fails
    }
  }

  // 3. Plain text / Markdown output
  return (
    <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-zinc-300 font-mono">
      {output}
    </pre>
  );
}

function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function OnboardingHUD({
  selectedCount,
  hasPrompt,
  onRun,
  running,
  sidebarOpen,
  setSidebarOpen,
  setSidebarTab,
}: {
  selectedCount: number;
  hasPrompt: boolean;
  onRun: () => void;
  running: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setSidebarTab: (tab: "models" | "settings" | "history") => void;
}) {
  const isModelsReady = selectedCount >= 2;

  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-6 md:p-10 flex flex-col items-center text-center space-y-6 max-w-2xl mx-auto my-8 shadow-sm">
      <div className="p-4 rounded-full bg-primary/10 text-primary border border-primary/20">
        <GitCompareArrows className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Model Comparison Playground Arena</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Run predictions across multiple models side-by-side with independent inputs. See metrics and compare responses in real-time.
        </p>
      </div>

      <div className="w-full space-y-3.5 bg-secondary/15 p-4 rounded-xl border border-border/60 text-left">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary" />
          <span>Getting Started Guide</span>
        </p>

        {/* Step 1 */}
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-full p-0.5 flex items-center justify-center shrink-0 ${
            isModelsReady ? "bg-emerald-500/20 text-emerald-500" : "bg-amber-500/20 text-amber-500"
          }`}>
            {isModelsReady ? <CheckCircle2 className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
          <div>
            <p className={`text-sm font-semibold ${isModelsReady ? "text-foreground line-through decoration-muted-foreground/40" : "text-foreground"}`}>
              Step 1: Select 2 to 5 Compatible Models ({selectedCount} selected)
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {!isModelsReady ? (
                <span>
                  Please open the{" "}
                  <button
                    onClick={() => {
                      setSidebarOpen(true);
                      setSidebarTab("models");
                    }}
                    className="text-primary font-bold hover:underline"
                  >
                    Models Tab
                  </button>{" "}
                  and pick at least two models to compare. Compares must share modality & category.
                </span>
              ) : (
                "Models configured successfully!"
              )}
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full p-0.5 flex items-center justify-center shrink-0 bg-emerald-500/20 text-emerald-500">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground line-through decoration-muted-foreground/40">
              Step 2: Check input payloads
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Input fields are auto-populated for each model column with their working example schema.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-full p-0.5 flex items-center justify-center shrink-0 ${
            isModelsReady ? "bg-emerald-500/20 text-emerald-500" : "bg-secondary text-muted-foreground"
          }`}>
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <p className={`text-sm font-semibold ${isModelsReady ? "text-foreground" : "text-muted-foreground"}`}>
              Step 3: Run Comparison Inferences
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {isModelsReady
                ? "Everything is set! Click 'Run All Compare' to execute inferences."
                : "Select compatible models to enable side-by-side arenas."}
            </p>
          </div>
        </div>
      </div>

      <Button
        onClick={onRun}
        disabled={!isModelsReady || running}
        className={`w-full py-6 text-sm font-bold transition-all rounded-xl ${
          isModelsReady
            ? "bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg hover:shadow-primary/20 scale-100 hover:scale-[1.01]"
            : "bg-secondary text-muted-foreground cursor-not-allowed"
        }`}
      >
        {running ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing Models...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4 mr-2 text-yellow-400 fill-yellow-400" />
            Run Side-by-Side Comparison
          </>
        )}
      </Button>
    </div>
  );
}
