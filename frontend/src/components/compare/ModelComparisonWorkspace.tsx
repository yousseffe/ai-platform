"use client";

import React, { useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Clock3,
  Coins,
  Filter,
  GitCompareArrows,
  Loader2,
  RefreshCcw,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  ComparableModel,
  ComparisonSettings,
  ModelComparisonHistoryItem,
  ModelComparisonSession,
} from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  deleteModelComparison,
  getModelComparison,
  listModelComparisonHistory,
  rerunModelComparison,
  runModelComparison,
  updateModelComparison,
} from "@/lib/services/model-comparisons.service";

interface ModelComparisonWorkspaceProps {
  title: string;
  description: string;
  initialModels: ComparableModel[];
  initialHistory: ModelComparisonHistoryItem[];
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
  const [models] = useState(initialModels);
  const [history, setHistory] = useState(initialHistory);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [requestBody, setRequestBody] = useState("");
  const [comparisonTitle, setComparisonTitle] = useState("");
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [modalityFilter, setModalityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sort, setSort] = useState<"popularity" | "price_asc" | "price_desc" | "rating">("popularity");
  const [settings, setSettings] = useState<ComparisonSettings>(DEFAULT_SETTINGS);
  const [activeSession, setActiveSession] = useState<ModelComparisonSession | null>(null);
  const [running, setRunning] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ModelComparisonHistoryItem | null>(null);
  const [savingTitle, setSavingTitle] = useState(false);

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

  const activeResults = activeSession?.results ?? [];
  const insights = activeSession?.summaryInsights;

  const selectedModels = useMemo(
    () => models.filter((model) => selectedModelIds.includes(model.id)),
    [models, selectedModelIds],
  );

  const toggleModel = (modelId: string) => {
    setSelectedModelIds((current) => {
      if (current.includes(modelId)) {
        return current.filter((id) => id !== modelId);
      }
      if (current.length >= 5) {
        toast.error("You can compare up to 5 models at a time.");
        return current;
      }
      return [...current, modelId];
    });
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

  const handleRunComparison = async () => {
    if (selectedModelIds.length < 2) {
      toast.error("Select at least 2 models before running the comparison.");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Enter a prompt to compare the selected models.");
      return;
    }

    let parsedRequestBody: Record<string, unknown> | undefined;
    if (requestBody.trim()) {
      try {
        parsedRequestBody = JSON.parse(requestBody) as Record<string, unknown>;
      } catch {
        toast.error("Advanced request body must be valid JSON.");
        return;
      }
    }

    setRunning(true);
    try {
      const session = await runModelComparison({
        modelIds: selectedModelIds,
        prompt,
        requestBody: parsedRequestBody,
        settings,
        title: comparisonTitle.trim() || undefined,
      });
      setActiveSession(session);
      setComparisonTitle(session.title ?? "");
      toast.success("Comparison finished successfully.");
      await refreshHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to run comparison.");
    } finally {
      setRunning(false);
    }
  };

  const openHistoryItem = async (sessionId: string) => {
    setHistoryLoading(true);
    try {
      const session = await getModelComparison(sessionId);
      setActiveSession(session);
      setComparisonTitle(session.title ?? "");
      setPrompt(session.inputPrompt);
      setSelectedModelIds(
        session.results
          .map((result) => result.modelId)
          .filter((value): value is string => Boolean(value)),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load comparison.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRerun = async (sessionId?: string) => {
    const targetId = sessionId ?? activeSession?.id;
    if (!targetId) {
      return;
    }

    setRunning(true);
    try {
      const session = await rerunModelComparison(targetId);
      setActiveSession(session);
      setComparisonTitle(session.title ?? "");
      toast.success("Comparison rerun completed.");
      await refreshHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rerun comparison.");
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async () => {
    if (!sessionToDelete) {
      return;
    }

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
    if (!activeSession?.id) {
      toast.error("Run a comparison first to save it into history.");
      return;
    }

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

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={title}
        description={description}
        icon={<GitCompareArrows className="w-5 h-5 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refreshHistory()} disabled={historyLoading}>
              {historyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              Refresh History
            </Button>
            <Button size="sm" onClick={() => handleRunComparison()} disabled={running}>
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompareArrows className="w-4 h-4" />}
              Run Comparison
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1.8fr_1fr]">
        <Card className="border border-border/80 bg-card/80 shadow-sm">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Filter className="w-4 h-4 text-primary" />
              Select Models
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search model, provider, category..."
                className="pl-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FilterSelect label="Provider" value={providerFilter} onValueChange={setProviderFilter} options={providerOptions} />
              <FilterSelect label="Category" value={categoryFilter} onValueChange={setCategoryFilter} options={categoryOptions} />
              <FilterSelect label="Modality" value={modalityFilter} onValueChange={setModalityFilter} options={modalityOptions} />
              <FilterSelect label="Status" value={statusFilter} onValueChange={setStatusFilter} options={["ALL", "RUNNING", "INACTIVE"]} />
            </div>

            <FilterSelect
              label="Sort"
              value={sort}
              onValueChange={(value) => setSort(value as typeof sort)}
              options={["popularity", "price_asc", "price_desc", "rating"]}
            />

            <div className="rounded-xl border border-border bg-secondary/10 p-3">
              <p className="text-[11px] font-semibold text-muted-foreground">
                Selected {selectedModelIds.length} / 5
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedModels.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Pick 2 to 5 models.</span>
                ) : (
                  selectedModels.map((model) => (
                    <span
                      key={model.id}
                      className="inline-flex items-center rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-semibold text-primary"
                    >
                      {model.name}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
              {filteredModels.length === 0 ? (
                <EmptyState
                  icon={<Bot />}
                  title="No models match these filters"
                  description="Try clearing one or more filters to widen the marketplace selection."
                />
              ) : (
                filteredModels.map((model) => {
                  const selected = selectedModelIds.includes(model.id);
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => toggleModel(model.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition-all ${
                        selected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:border-primary/30 hover:bg-secondary/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-foreground">{model.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {model.providerName} · {humanize(model.category)} · {humanize(model.modality)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                            model.status === "RUNNING"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {model.status}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <ModelMeta label="Price" value={`${model.priceCredits.toFixed(2)} cr`} />
                        <ModelMeta label="Popularity" value={model.popularity.toString()} />
                        <ModelMeta label="Version" value={model.versionLabel ?? "n/a"} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border border-border/80 bg-card/80 shadow-sm">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-sm font-bold">Prompt and Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Comparison title</label>
                <div className="flex gap-2">
                  <Input
                    value={comparisonTitle}
                    onChange={(event) => setComparisonTitle(event.target.value)}
                    placeholder="Optional title for history"
                  />
                  <Button variant="outline" onClick={() => handleSaveTitle()} disabled={savingTitle || !activeSession}>
                    {savingTitle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Prompt</label>
                <Textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Write one prompt/request and send it to all selected models."
                  rows={7}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Advanced request body (optional JSON)</label>
                <Textarea
                  value={requestBody}
                  onChange={(event) => setRequestBody(event.target.value)}
                  placeholder='{"language":"en","tone":"professional"}'
                  rows={5}
                  className="font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <NumberField
                  label="Temperature"
                  value={settings.temperature ?? 0}
                  step={0.1}
                  onChange={(value) => setSettings((current) => ({ ...current, temperature: value }))}
                />
                <NumberField
                  label="Max Tokens"
                  value={settings.maxTokens ?? 0}
                  step={1}
                  onChange={(value) => setSettings((current) => ({ ...current, maxTokens: value }))}
                />
                <NumberField
                  label="Top P"
                  value={settings.topP ?? 0}
                  step={0.1}
                  onChange={(value) => setSettings((current) => ({ ...current, topP: value }))}
                />
                <ToggleField
                  label="Stream"
                  checked={!!settings.stream}
                  onChange={(value) => setSettings((current) => ({ ...current, stream: value }))}
                />
                <ToggleField
                  label="JSON Mode"
                  checked={!!settings.jsonMode}
                  onChange={(value) => setSettings((current) => ({ ...current, jsonMode: value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-card/80 shadow-sm">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <Sparkles className="w-4 h-4 text-primary" />
                Summary Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {!insights ? (
                <EmptyState
                  icon={<Sparkles />}
                  title="No comparison insights yet"
                  description="Run a comparison and this panel will identify the fastest, cheapest, and recommended model."
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <InsightCard title="Fastest Model" value={insights.fastestModelName} icon={<Clock3 className="w-4 h-4" />} />
                  <InsightCard title="Cheapest Model" value={insights.cheapestModelName} icon={<Coins className="w-4 h-4" />} />
                  <InsightCard title="Best Value" value={insights.bestValueModelName} icon={<Sparkles className="w-4 h-4" />} />
                  <InsightCard title="Lowest Error" value={insights.lowestErrorModelName} icon={<ShieldAlert className="w-4 h-4" />} />
                  <InsightCard title="Recommended" value={insights.recommendedModelName} icon={<CheckCircle2 className="w-4 h-4" />} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-card/80 shadow-sm">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-sm font-bold">Comparison Results</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {running ? (
                <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running the same request across the selected models...
                </div>
              ) : activeResults.length === 0 ? (
                <EmptyState
                  icon={<GitCompareArrows />}
                  title="No results yet"
                  description="Choose a few models, enter one prompt, and run a side-by-side comparison."
                />
              ) : (
                <div className="space-y-4">
                  {activeResults.map((result) => (
                    <div key={result.id} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-primary/8 px-2 py-1 text-[10px] font-bold text-primary">
                              #{result.resultRank ?? "-"}
                            </span>
                            <h3 className="text-sm font-bold text-foreground">{result.modelName}</h3>
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                                result.status === "SUCCESS"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : "bg-red-500/10 text-red-700 dark:text-red-300"
                              }`}
                            >
                              {result.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {result.providerName ?? "Unknown provider"} · {humanize(result.modelType ?? "unknown")} · {result.modelVersion ?? "n/a"}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-5">
                          <MetricPill label="Latency" value={result.latencyMs ? `${result.latencyMs} ms` : "n/a"} />
                          <MetricPill label="Cost" value={`${result.costCredits.toFixed(4)} cr`} />
                          <MetricPill label="Input" value={(result.inputTokens ?? 0).toString()} />
                          <MetricPill label="Output" value={(result.outputTokens ?? 0).toString()} />
                          <MetricPill label="Quality" value={result.qualityScore?.toFixed(1) ?? "0"} />
                        </div>
                      </div>

                      {result.errorMessage ? (
                        <div className="mt-4 rounded-xl border border-red-500/15 bg-red-500/[0.04] p-3 text-xs text-red-700 dark:text-red-300">
                          {result.errorMessage}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-xl border border-border bg-secondary/10 p-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Response Output
                          </p>
                          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-foreground">
                            {result.responseOutput || "No output returned."}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border/80 bg-card/80 shadow-sm">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-sm font-bold">Comparison History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {historyLoading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading comparison history...
              </div>
            ) : history.length === 0 ? (
              <EmptyState
                icon={<Clock3 />}
                title="No history yet"
                description="Completed comparisons are saved here so you can review, save, rerun, or delete them."
              />
            ) : (
              history.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => openHistoryItem(item.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-bold text-foreground">
                        {item.title || "Saved comparison"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {item.inputPrompt}
                      </p>
                    </button>
                    <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground">
                      {item.modelCount} models
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleRerun(item.id)}>
                        <RefreshCcw className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-red-600 hover:text-red-700" onClick={() => setSessionToDelete(item)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

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
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {humanize(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <Input
        type="number"
        value={value}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function ToggleField({
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
      className={`mt-6 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
        checked
          ? "border-primary bg-primary/8 text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}: {checked ? "On" : "Off"}
    </button>
  );
}

function ModelMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/50 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide">{label}</p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}

function InsightCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      </div>
      <p className="mt-3 text-sm font-bold text-foreground">{value || "Not available yet"}</p>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide">{label}</p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}

function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
