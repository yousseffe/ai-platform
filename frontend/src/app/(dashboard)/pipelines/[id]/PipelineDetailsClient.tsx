"use client";

import React, { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  GitBranch,
  ListTree,
  Play,
  ScrollText,
  Settings2,
  Sparkles,
  Trash2,
  Workflow,
  Wrench,
  XCircle,
  Edit2,
  Pencil,
  Globe,
  Copy,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Maximize2,
  Minus,
  Plus,
  Minimize2,
  HelpCircle,
  Code,
} from "lucide-react";
import {
  MapperRule,
  Pipeline,
  PipelineEdge,
  PipelinePinPolicy,
  PipelineRun,
  PipelineRunStatus,
  PipelineStatus,
  PipelineStep,
  PipelineStepRun,
  PipelineStepRunStatus,
  PipelineType,
} from "@/types";
import { cn } from "@/lib/utils";
import { getPipelineRun } from "@/lib/actions/pipelines.actions";
import { groupByStage, isPipelineRunTransient, stepNamespacePath } from "@/lib/utils/pipelines";
import { usePipelineBuilder } from "@/hooks/use-pipeline-builder";
import { usePipelineRuns } from "@/hooks/use-pipeline-runs";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddPipelineStepDialog } from "@/components/pipelines/AddPipelineStepDialog";
import { EditPipelineStepDialog } from "@/components/pipelines/EditPipelineStepDialog";
import { MapperEdgeDialog } from "@/components/pipelines/MapperEdgeDialog";
import { PipelineFlowDiagram } from "@/components/pipelines/PipelineFlowDiagram";

interface ReadyVersionOption {
  modelVersionId: string;
  label: string;
}

interface PipelineDetailsClientProps {
  pipeline: Pipeline;
  runs: PipelineRun[];
  edges: PipelineEdge[];
  readyVersionOptions: ReadyVersionOption[];
}

const PIPELINE_TYPE_LABELS: Record<PipelineType, string> = {
  [PipelineType.SEQUENTIAL_CHAIN]: "Sequential",
  [PipelineType.CONTEXT_AUGMENTED]: "Context-Augmented",
  [PipelineType.PARALLEL]: "Parallel",
};

const BOUNDARY_LABEL = "Pipeline Boundary";

function formatDateTime(value?: string | null) {
  if (!value) return "Not available";
  return new Date(value).toLocaleString();
}

function formatLatency(value?: number | null) {
  return value != null ? `${value} ms` : "Pending";
}

function formatCredits(value?: number | null) {
  return `${Number(value ?? 0).toFixed(2)} credits`;
}

function parseJsonSample(sample?: string | null): unknown | null {
  if (!sample) return null;
  try {
    return JSON.parse(sample);
  } catch {
    return sample;
  }
}

function prettifyJson(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function getPreviewKeys(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.keys(value as Record<string, unknown>).slice(0, 6);
}

function getPipelineStatusTone(status: PipelineStatus) {
  if (status === PipelineStatus.VALIDATED) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === PipelineStatus.ARCHIVED) {
    return "border-slate-400/25 bg-slate-500/10 text-slate-700 dark:text-slate-300";
  }
  return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function getRunStatusTone(status: PipelineRunStatus) {
  if (status === PipelineRunStatus.SUCCESS) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === PipelineRunStatus.FAILED) {
    return "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300";
  }
  if (status === PipelineRunStatus.PARTIAL) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300";
}

function getRunStatusDot(status: PipelineRunStatus) {
  if (status === PipelineRunStatus.SUCCESS) return "bg-emerald-500";
  if (status === PipelineRunStatus.FAILED) return "bg-red-500";
  if (status === PipelineRunStatus.PARTIAL) return "bg-amber-500";
  return "bg-sky-500";
}

function getStepRunStatusDot(status: PipelineStepRunStatus) {
  if (status === PipelineStepRunStatus.SUCCESS) return "bg-emerald-500";
  if (status === PipelineStepRunStatus.FAILED) return "bg-red-500";
  if (status === PipelineStepRunStatus.SKIPPED) return "bg-slate-400";
  return "bg-sky-500";
}

function stepTitle(step: Pick<PipelineStep, "order" | "label" | "role">) {
  return step.label ?? step.role ?? `Stage ${step.order + 1}`;
}

function edgeStepLabel(step: Pick<PipelineStep, "id" | "order" | "label" | "role"> | null) {
  if (!step) return BOUNDARY_LABEL;
  return step.label ?? step.role ?? `Stage ${step.order + 1}`;
}

function mapperRuleSummary(rule: MapperRule) {
  if (rule.op === "default") {
    return {
      from: JSON.stringify(rule.value),
      to: rule.to,
      op: "default",
    };
  }

  if (rule.op === "template") {
    return {
      from: rule.template,
      to: rule.to,
      op: "template",
    };
  }

  return {
    from: rule.op === "cast" ? `${rule.from} as ${rule.as}` : rule.from,
    to: rule.to,
    op: rule.op,
  };
}

function buildStepNamespaceSummary(steps: PipelineStep[]) {
  const stageSizeByOrder = new Map(groupByStage(steps).map((stage) => [stage[0].order, stage.length]));
  return steps.map((step) => ({
    id: step.id,
    label: stepTitle(step),
    namespace: stepNamespacePath(step, stageSizeByOrder.get(step.order) ?? 1),
  }));
}

function groupEdgesByTarget(edges: PipelineEdge[]) {
  const groups = new Map<string, PipelineEdge[]>();
  for (const edge of edges) {
    const key = edge.toStep?.id ?? "__output__";
    const bucket = groups.get(key) ?? [];
    bucket.push(edge);
    groups.set(key, bucket);
  }
  return [...groups.entries()];
}

export function PipelineDetailsClient({ pipeline, runs, edges, readyVersionOptions }: PipelineDetailsClientProps) {
  const builder = usePipelineBuilder(pipeline.id);
  const runHook = usePipelineRuns(pipeline.id, runs);

  const steps = useMemo(() => [...(pipeline.steps ?? [])].sort((a, b) => a.order - b.order), [pipeline.steps]);
  const stages = useMemo(() => groupByStage(steps), [steps]);
  const runsSorted = useMemo(
    () => [...runs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [runs],
  );
  const edgeGroups = useMemo(() => groupEdgesByTarget(edges), [edges]);
  const namespaceSummary = useMemo(() => buildStepNamespaceSummary(steps), [steps]);
  const latestSuccessfulRun = useMemo(
    () => runsSorted.find((run) => run.status === PipelineRunStatus.SUCCESS && run.output),
    [runsSorted],
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [runInputJson, setRunInputJson] = useState(() =>
    runsSorted[0]?.input ? JSON.stringify(runsSorted[0].input, null, 2) : "{\n  \n}",
  );
  const [selectedRunId, setSelectedRunId] = useState<string | null>(runsSorted[0]?.id ?? null);
  const [selectedRun, setSelectedRun] = useState<PipelineRun | null>(runsSorted[0] ?? null);
  const [loadedRunId, setLoadedRunId] = useState<string | null>(runsSorted[0]?.id ?? null);

  const firstStepInputSample = parseJsonSample(steps[0]?.modelVersion?.examplePayload);
  const finalOutputSample = parseJsonSample(steps[steps.length - 1]?.modelVersion?.expectedResult) ?? latestSuccessfulRun?.output ?? null;

  const totalRuleCount = edges.reduce((acc, edge) => acc + edge.spec.rules.length, 0);
  const successRuns = runsSorted.filter((run) => run.status === PipelineRunStatus.SUCCESS).length;
  const failedRuns = runsSorted.filter((run) => run.status === PipelineRunStatus.FAILED).length;
  const transientRuns = runsSorted.filter((run) => isPipelineRunTransient(run.status)).length;
  const totalCredits = runsSorted.reduce((acc, run) => acc + Number(run.totalCost ?? 0), 0);
  const avgLatency =
    runsSorted.filter((run) => run.totalLatencyMs != null).reduce((acc, run) => acc + Number(run.totalLatencyMs ?? 0), 0) /
      Math.max(runsSorted.filter((run) => run.totalLatencyMs != null).length, 1);

  const pipelineManifest = useMemo(
    () => ({
      id: pipeline.id,
      name: pipeline.name,
      status: pipeline.status,
      type: pipeline.type,
      version: pipeline.version,
      visibility: pipeline.isPublic ? "public" : "private",
      createdAt: pipeline.createdAt,
      updatedAt: pipeline.updatedAt,
      steps: steps.map((step) => ({
        id: step.id,
        stage: step.order,
        label: step.label,
        role: step.role,
        pinPolicy: step.pinPolicy,
        maxRetries: step.maxRetries,
        timeoutMs: step.timeoutMs,
        modelVersion: step.modelVersion
          ? {
              id: step.modelVersion.id,
              modelName: step.modelVersion.model?.name,
              versionNumber: step.modelVersion.versionNumber,
            }
          : null,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        from: edge.fromStep?.id ?? null,
        to: edge.toStep?.id ?? null,
        status: edge.status,
        autoGenerated: edge.autoGenerated,
        rules: edge.spec.rules,
      })),
    }),
    [edges, pipeline, steps],
  );

  const effectiveSelectedRunId =
    selectedRunId && runsSorted.some((run) => run.id === selectedRunId)
      ? selectedRunId
      : (runsSorted[0]?.id ?? null);

  useEffect(() => {
    if (!effectiveSelectedRunId) {
      return;
    }

    let cancelled = false;

    getPipelineRun(effectiveSelectedRunId)
      .then((data) => {
        if (cancelled) return;
        setSelectedRun(data);
        setLoadedRunId(effectiveSelectedRunId);
      })
      .catch(() => {
        if (cancelled) return;
        setSelectedRun(null);
        setLoadedRunId(effectiveSelectedRunId);
      })

    return () => {
      cancelled = true;
    };
  }, [effectiveSelectedRunId, runsSorted]);

  const handleRunNow = async () => {
    const ok = await runHook.handleTriggerRun(runInputJson);
    if (ok) {
      setShowRunDialog(false);
    }
  };

  const selectedRunSummary = runsSorted.find((run) => run.id === effectiveSelectedRunId) ?? null;
  const selectedRunData =
    effectiveSelectedRunId == null
      ? null
      : selectedRun?.id === effectiveSelectedRunId
        ? selectedRun
        : selectedRunSummary;
  const selectedRunLoading = effectiveSelectedRunId != null && loadedRunId !== effectiveSelectedRunId;

  const [zoom, setZoom] = useState(100);
  const [layoutMode, setLayoutMode] = useState("vertical");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(pipeline.name);

  return (
    <div className="relative w-full space-y-6 pb-10">
      {/* Upper header row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between select-none">
        <div className="flex flex-wrap items-center gap-3">
          {isEditingName ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (tempName.trim() && tempName.trim() !== pipeline.name) {
                  await builder.handleRenamePipeline(tempName.trim());
                }
                setIsEditingName(false);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="text-2xl font-black text-foreground bg-transparent border-b border-primary outline-none px-1 py-0.5"
                autoFocus
                onBlur={async () => {
                  if (tempName.trim() && tempName.trim() !== pipeline.name) {
                    await builder.handleRenamePipeline(tempName.trim());
                  }
                  setIsEditingName(false);
                }}
              />
            </form>
          ) : (
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              {pipeline.name}
              <button
                onClick={() => {
                  setTempName(pipeline.name);
                  setIsEditingName(true);
                }}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </h1>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider capitalize", getPipelineStatusTone(pipeline.status))}>
              {pipeline.status}
            </span>
            <span className="rounded-full bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/50 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:text-zinc-300">
              v{pipeline.version}
            </span>
            <span className="rounded-full bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/50 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:text-zinc-300">
              {PIPELINE_TYPE_LABELS[pipeline.type]}
            </span>
            <span className="rounded-full bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/50 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:text-zinc-300">
              {stages.length} Stage{stages.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button
            onClick={() => builder.handleUpdateVisibility(!pipeline.isPublic)}
            disabled={builder.isSubmitting}
            variant="outline"
            className="h-9 px-4 text-xs font-bold gap-1.5 cursor-pointer border-slate-200 dark:border-zinc-800 hover:bg-secondary/50 rounded-xl shadow-xs"
          >
            <Globe className={cn("w-3.5 h-3.5", pipeline.isPublic ? "text-emerald-500" : "text-amber-500")} />
            <span className={pipeline.isPublic ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
              {pipeline.isPublic ? "Public Marketplace" : "Private Registry"}
            </span>
          </Button>
          
          <Button
            variant="outline"
            className="h-9 px-4 text-xs font-bold gap-1.5 cursor-pointer border-slate-200 dark:border-zinc-800 hover:bg-secondary/50 rounded-xl shadow-xs"
            onClick={builder.handleValidate}
            disabled={builder.isSubmitting}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
            Validate
          </Button>

          <Button
            variant="outline"
            className="h-9 px-4 text-xs font-bold gap-1.5 cursor-pointer border-red-200 dark:border-red-900/30 hover:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl shadow-xs"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={builder.isSubmitting}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {builder.error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {builder.error}
        </div>
      )}

      {/* Main Tabs Container */}
      <Tabs defaultValue="builder" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1 select-none">
          <TabsList className="flex w-full sm:w-fit border-b border-border bg-transparent p-0 rounded-none h-10 gap-6 justify-start overflow-x-auto" variant="line">
            <TabsTrigger
              value="builder"
              className="flex items-center gap-2 cursor-pointer pb-2 pt-0 rounded-none bg-transparent"
            >
              <Workflow className="w-3.5 h-3.5" />
              Builder
            </TabsTrigger>
            <TabsTrigger
              value="configuration"
              className="flex items-center gap-2 cursor-pointer pb-2 pt-0 rounded-none bg-transparent"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Configuration
            </TabsTrigger>
            <TabsTrigger
              value="runs"
              className="flex items-center gap-2 cursor-pointer pb-2 pt-0 rounded-none bg-transparent"
            >
              <Play className="w-3.5 h-3.5" />
              Runs
            </TabsTrigger>
            <TabsTrigger
              value="versions"
              className="flex items-center gap-2 cursor-pointer pb-2 pt-0 rounded-none bg-transparent"
            >
              <GitBranch className="w-3.5 h-3.5" />
              Versions
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="flex items-center gap-2 cursor-pointer pb-2 pt-0 rounded-none bg-transparent"
            >
              <ScrollText className="w-3.5 h-3.5" />
              Logs
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center gap-2 cursor-pointer pb-2 pt-0 rounded-none bg-transparent"
            >
              <Wrench className="w-3.5 h-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Auto-save <span className="text-muted-foreground/80">Just now</span>
            </div>
            
            <div className="flex items-center">
              <Button
                onClick={() => setShowRunDialog(true)}
                disabled={runHook.isTriggering || pipeline.status !== PipelineStatus.VALIDATED}
                className="h-9 rounded-l-xl rounded-r-none px-4 text-xs font-bold gap-1.5 btn-primary border-r border-primary-foreground/10"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Pipeline
              </Button>
              <Button
                disabled={runHook.isTriggering || pipeline.status !== PipelineStatus.VALIDATED}
                className="h-9 rounded-r-xl rounded-l-none px-2.5 btn-primary"
                size="icon"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── Builder Tab Content ── */}
        <TabsContent value="builder" className="mt-0 outline-none space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1fr_360px] items-start">
            
            {/* Center Area */}
            <div className="space-y-6">
              {/* Flow canvas */}
              {/* Flow canvas */}
              <div className="relative rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                {steps.length > 0 && (
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-secondary/35 dark:bg-zinc-800/40 rounded-lg p-1 border border-border/50 text-xs">
                      <button
                        onClick={() => setZoom(100)}
                        className="p-1 hover:bg-secondary dark:hover:bg-zinc-700/50 rounded cursor-pointer"
                        title="Reset Zoom"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <div className="w-px h-3.5 bg-border/80 mx-1" />
                      <button
                        onClick={() => setZoom((z) => Math.max(z - 10, 50))}
                        className="p-1 hover:bg-secondary dark:hover:bg-zinc-700/50 rounded cursor-pointer"
                        title="Zoom Out"
                      >
                        <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <span className="px-2 font-semibold text-foreground/80 w-10 text-center">{zoom}%</span>
                      <button
                        onClick={() => setZoom((z) => Math.min(z + 10, 150))}
                        className="p-1 hover:bg-secondary dark:hover:bg-zinc-700/50 rounded cursor-pointer"
                        title="Zoom In"
                      >
                        <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <div className="w-px h-3.5 bg-border/80 mx-1" />
                      <button
                        onClick={() => setZoom(100)}
                        className="p-1 hover:bg-secondary dark:hover:bg-zinc-700/50 rounded cursor-pointer"
                        title="Reset Zoom"
                      >
                        <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>

                    <div className="flex items-center text-xs">
                      <Select value={layoutMode} onValueChange={(val) => setLayoutMode(val)}>
                        <SelectTrigger className="h-8 text-xs bg-secondary/35 dark:bg-zinc-800/40 border-border/50 font-semibold gap-1.5 px-3">
                          <GitBranch className="w-3.5 h-3.5 rotate-90 text-muted-foreground" />
                          Layout: <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vertical">Vertical DAG</SelectItem>
                          <SelectItem value="horizontal">Horizontal DAG</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-border/60 bg-slate-50/40 dark:bg-zinc-900/30 p-6 min-h-[340px] flex items-center justify-center relative overflow-hidden bg-[radial-gradient(#e2e8f0_1.2px,transparent_1.2px)] dark:bg-[radial-gradient(#27272a_1.2px,transparent_1.2px)] [background-size:16px_16px]">
                  <div
                    style={steps.length > 0 ? { transform: `scale(${zoom / 100})`, transformOrigin: "center center" } : undefined}
                    className={cn(steps.length > 0 && "transition-transform duration-150")}
                  >
                    <PipelineFlowDiagram
                      steps={steps}
                      pipelineType={pipeline.type}
                      layoutMode={layoutMode}
                      readyVersionOptions={readyVersionOptions}
                      isSubmitting={builder.isSubmitting}
                      onAddStep={builder.handleAddStep}
                      onUpdateStep={builder.handleUpdateStep}
                      onRemoveStep={builder.handleRemoveStep}
                    />
                  </div>
                </div>
              </div>

              {/* Mappers */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      Mappers
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </h3>
                    <p className="text-xs text-muted-foreground">Map data between steps. Field-level transforms at each edge.</p>
                  </div>
                  <MapperEdgeDialog steps={steps} isSubmitting={builder.isSubmitting} onUpsert={builder.handleUpsertEdge} trigger={
                    <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer">
                      + Add Mapper
                    </button>
                  } />
                </div>

                {edges.length === 0 ? (
                  <div className="border border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center gap-2 bg-slate-50/10 dark:bg-zinc-900/5">
                    <ScrollText className="w-6 h-6 text-muted-foreground/60" />
                    <p className="text-xs font-semibold text-foreground">No mappers defined</p>
                    <p className="text-[10px] text-muted-foreground max-w-[200px]">Payloads pass straight from step to step.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/60 text-muted-foreground/80 font-bold uppercase tracking-wider text-[10px]">
                          <th className="pb-2 font-medium">Source</th>
                          <th className="pb-2 font-medium">Destination</th>
                          <th className="pb-2 font-medium">Transformation</th>
                          <th className="pb-2 font-medium text-right pr-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {edges.flatMap(edge => 
                          edge.spec.rules.map((rule, idx) => {
                            const summary = mapperRuleSummary(rule);
                            return (
                              <tr key={`${edge.id}-${idx}`} className="text-xs">
                                <td className="py-2.5 pr-2 font-mono text-[10.5px] text-muted-foreground">
                                  {edgeStepLabel(edge.fromStep)}.{summary.from}
                                </td>
                                <td className="py-2.5 pr-2 font-mono text-[10.5px] text-foreground">
                                  {edgeStepLabel(edge.toStep)}.{summary.to}
                                </td>
                                <td className="py-2.5">
                                  <span className="inline-flex items-center rounded-md bg-secondary/60 px-1.5 py-0.5 text-[9.5px] font-semibold text-foreground/80 capitalize border border-border/30 font-mono">
                                    {summary.op}
                                  </span>
                                </td>
                                {idx === 0 && (
                                  <td rowSpan={edge.spec.rules.length} className="py-2.5 text-right align-middle pr-2 border-l border-border/35 pl-3">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <MapperEdgeDialog
                                        steps={steps}
                                        isSubmitting={builder.isSubmitting}
                                        onUpsert={builder.handleUpsertEdge}
                                        initialEdge={edge}
                                        trigger={
                                          <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer border border-border/50 bg-card transition-colors">
                                            <Pencil className="w-3.5 h-3.5" />
                                          </button>
                                        }
                                      />
                                      <button
                                        onClick={() => builder.handleRemoveEdge(edge.id)}
                                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer border border-border/50 bg-card transition-colors"
                                        title="Delete Mapper"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Column */}
            <div className="space-y-6">
              
              {/* Pipeline Overview */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-foreground">Pipeline Overview</h3>
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-muted-foreground font-medium">Created</span>
                    <span className="text-foreground font-medium text-right">
                      {formatDateTime(pipeline.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-muted-foreground font-medium">Last updated</span>
                    <span className="text-foreground font-medium text-right">
                      {formatDateTime(pipeline.updatedAt)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-muted-foreground font-medium">Owner</span>
                    <span className="text-foreground font-medium text-right">
                      {pipeline.user?.username || pipeline.user?.email || "Ahmed Amr (Personal)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stages List */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Stages</h3>
                  <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                    {stages.length} Stage{stages.length === 1 ? "" : "s"}
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </span>
                </div>
                
                <div className="space-y-2">
                  {stages.map((stage, idx) => (
                    <div key={idx} className="flex items-center justify-between border border-border/60 bg-secondary/15 dark:bg-zinc-800/10 rounded-xl p-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center font-bold text-[10px] text-muted-foreground border border-border/40">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-foreground">
                          {stage[0].label || stage[0].role || `Stage ${idx + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center p-1 hover:bg-secondary/40 rounded">
                            <MoreHorizontal className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {stage.map((step, sIdx) => (
                              <React.Fragment key={step.id}>
                                {stage.length > 1 && (
                                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground pt-1.5">
                                    {step.label || step.role || `Step ${step.order}`}
                                  </DropdownMenuLabel>
                                )}
                                <EditPipelineStepDialog
                                  step={step}
                                  stageSteps={stage}
                                  readyVersionOptions={readyVersionOptions}
                                  isSubmitting={builder.isSubmitting}
                                  onUpdateStep={builder.handleUpdateStep}
                                  trigger={
                                    <button className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-accent rounded select-none cursor-pointer border-none bg-transparent">
                                      <Pencil className="w-3 h-3 text-muted-foreground" />
                                      Configure {stage.length > 1 ? "step" : "stage"}
                                    </button>
                                  }
                                />
                                <DropdownMenuItem
                                  variant="destructive"
                                  className="cursor-pointer"
                                  onClick={() => builder.handleRemoveStep(step.id)}
                                >
                                  <Trash2 className="w-3 h-3 mr-2" />
                                  Delete {stage.length > 1 ? "step" : "stage"}
                                </DropdownMenuItem>
                                {sIdx < stage.length - 1 && <DropdownMenuSeparator />}
                              </React.Fragment>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Bottom execution footer */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">Recent Runs</h3>
                <p className="text-xs text-muted-foreground">View the latest pipeline executions.</p>
              </div>
              <button type="button" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer">
                View all runs <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {runsSorted.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">No execution history yet.</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {runsSorted.slice(0, 4).map((run) => (
                  <div key={run.id} className="rounded-xl border border-border/60 bg-secondary/5 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", getRunStatusDot(run.status))} />
                        <span className="text-xs font-bold capitalize text-foreground">{run.status}</span>
                      </div>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[9px] font-bold", getRunStatusTone(run.status))}>
                        v{run.pipelineVersion}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{formatDateTime(run.createdAt)}</p>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-[10px]">
                      <div>
                        <p className="text-[9px] font-semibold text-muted-foreground/80 uppercase">Latency</p>
                        <p className="font-semibold text-foreground mt-0.5">{formatLatency(run.totalLatencyMs)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-semibold text-muted-foreground/80 uppercase">Cost</p>
                        <p className="font-semibold text-foreground mt-0.5">{formatCredits(run.totalCost)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Configuration Tab Content ── */}
        <TabsContent value="configuration" className="mt-0 outline-none space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.95fr)]">
            <div className="space-y-6">
              <SectionCard
                eyebrow="Manifest"
                title="Pipeline configuration snapshot"
                description="Raw config derived from the saved pipeline object, its steps, and mapper edges."
              >
                <JsonPreview data={pipelineManifest} />
              </SectionCard>

              <SectionCard
                eyebrow="Runtime matrix"
                title="Per-step configuration"
                description="Every model node with the exact retries, pinning, and namespace context currently saved."
              >
                {steps.length === 0 ? (
                  <EmptyHint title="No step configuration yet" description="Create a model step first to populate runtime settings." />
                ) : (
                  <div className="space-y-3">
                    {steps.map((step) => {
                      const namespace = namespaceSummary.find((item) => item.id === step.id)?.namespace ?? `steps.${step.order}`;
                      return (
                        <div key={step.id} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{stepTitle(step)}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Stage {step.order + 1} · {step.modelVersion?.model?.name ?? "Unbound model"} · version{" "}
                                {step.modelVersion?.versionNumber ?? "n/a"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
                                {step.pinPolicy === PipelinePinPolicy.PINNED ? "Pinned version" : "Latest ready"}
                              </span>
                              <span className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
                                {step.maxRetries} retr{step.maxRetries === 1 ? "y" : "ies"}
                              </span>
                              {step.role && (
                                <span className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
                                  role: {step.role}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <ConfigStat label="Mapper namespace" value={namespace} />
                            <ConfigStat label="Timeout" value={step.timeoutMs != null ? `${step.timeoutMs} ms` : "Backend default"} />
                            <ConfigStat label="Model version ID" value={step.modelVersion?.id ?? "No model version"} />
                            <ConfigStat label="Updated at" value={formatDateTime(step.updatedAt)} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard
                eyebrow="Input contract"
                title="First step request sample"
                description="Taken from the bound model version example payload."
              >
                <JsonPreview data={firstStepInputSample} emptyLabel="No example payload found on the first bound model." />
              </SectionCard>

              <SectionCard
                eyebrow="Output contract"
                title="Expected output snapshot"
                description="Using the last step expected result when available, otherwise the latest successful run output."
              >
                <JsonPreview data={finalOutputSample} emptyLabel="No expected output or successful run output is available yet." />
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        {/* ── Runs & Logs Tab Content ── */}
        <TabsContent value="runs" className="mt-0 outline-none space-y-6">
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <SectionCard
              eyebrow="Recent runs"
              title="Execution history"
              description="Pick a run to inspect its real step-by-step trace."
              actions={
                <Button
                  onClick={() => setShowRunDialog(true)}
                  disabled={runHook.isTriggering || pipeline.status !== PipelineStatus.VALIDATED}
                  size="sm"
                  className="cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  Run now
                </Button>
              }
            >
              {runsSorted.length === 0 ? (
                <EmptyHint title="No execution history yet" description="Run the pipeline once and the logs tab will populate automatically." />
              ) : (
                <div className="space-y-3">
                  {runsSorted.map((run) => (
                    <button
                      key={run.id}
                      type="button"
                      onClick={() => setSelectedRunId(run.id)}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition cursor-pointer",
                        effectiveSelectedRunId === run.id
                          ? "border-primary/35 bg-primary/8 shadow-[0_12px_30px_-24px_rgba(59,130,246,0.7)]"
                          : "border-border/70 bg-background/65 hover:border-primary/20 hover:bg-primary/5",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2.5 w-2.5 rounded-full", getRunStatusDot(run.status), isPipelineRunTransient(run.status) && "animate-pulse")} />
                          <span className="text-sm font-semibold capitalize text-foreground">{run.status}</span>
                        </div>
                        <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getRunStatusTone(run.status))}>
                          v{run.pipelineVersion}
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">{formatDateTime(run.createdAt)}</p>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <MiniStat label="Latency" value={formatLatency(run.totalLatencyMs)} />
                        <MiniStat label="Cost" value={formatCredits(run.totalCost)} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              eyebrow="Trace console"
              title="Logs and payloads"
              description="Real execution data from the selected run, including mapped input and model output per step."
            >
              {!effectiveSelectedRunId ? (
                <EmptyHint title="Select a run" description="Choose a run from the left to inspect its logs and payloads." />
              ) : selectedRunLoading && !selectedRunData ? (
                <div className="rounded-2xl border border-border/70 bg-background/65 px-4 py-10 text-center text-sm text-muted-foreground animate-pulse">
                  Loading run trace...
                </div>
              ) : selectedRunData ? (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard
                      icon={<Activity className="w-4 h-4" />}
                      label="Run status"
                      value={selectedRunData.status}
                      subtext={selectedRunData.errorMessage || "No top-level run error reported."}
                    />
                    <MetricCard
                      icon={<Clock3 className="w-4 h-4" />}
                      label="Observed latency"
                      value={formatLatency(selectedRunData.totalLatencyMs)}
                      subtext={formatDateTime(selectedRunData.createdAt)}
                    />
                    <MetricCard
                      icon={<ScrollText className="w-4 h-4" />}
                      label="Trace depth"
                      value={`${selectedRunData.stepRuns?.length ?? 0} step log${selectedRunData.stepRuns?.length === 1 ? "" : "s"}`}
                      subtext={formatCredits(selectedRunData.totalCost)}
                    />
                  </div>

                  {selectedRunData.errorMessage && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                      {selectedRunData.errorMessage}
                    </div>
                  )}

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-4">
                      <JsonPanel title="Run input" data={selectedRunData.input} />
                      <JsonPanel
                        title="Run output"
                        data={selectedRunData.output}
                        emptyLabel={isPipelineRunTransient(selectedRunData.status) ? "Output pending while the run is still executing." : "No final output was persisted for this run."}
                      />
                    </div>

                    <div className="space-y-4">
                      {selectedRunData.stepRuns && selectedRunData.stepRuns.length > 0 ? (
                        selectedRunData.stepRuns.map((stepRun) => <StepLogCard key={stepRun.id} stepRun={stepRun} />)
                      ) : (
                        <EmptyHint
                          title="No per-step logs returned"
                          description="This run summary exists, but the backend did not include step-level trace rows for it."
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyHint title="Run trace unavailable" description="The selected run could not be loaded right now." />
              )}
            </SectionCard>
          </div>
        </TabsContent>

        {/* ── Versions Tab Content ── */}
        <TabsContent value="versions" className="mt-0 outline-none">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Pipeline Version History</h3>
              <p className="text-xs text-muted-foreground">Historical records of this pipeline&apos;s configuration snapshots.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground/80 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-medium">Version</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Created Date</th>
                    <th className="pb-3 font-medium">Author</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  <tr className="text-xs">
                    <td className="py-3.5 pr-2 font-mono text-[10.5px] text-foreground">v{pipeline.version}</td>
                    <td className="py-3.5 pr-2">
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 pr-2 text-muted-foreground">{formatDateTime(pipeline.createdAt)}</td>
                    <td className="py-3.5 pr-2 text-foreground font-medium">Ahmed Amr (Personal)</td>
                    <td className="py-3.5">
                      <button className="text-xs font-bold text-primary hover:underline cursor-pointer">Rollback</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── Logs Tab Content ── */}
        <TabsContent value="logs" className="mt-0 outline-none">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Workspace Event Logs</h3>
              <p className="text-xs text-muted-foreground">Recent authoring, validation, and execution events.</p>
            </div>

            <div className="rounded-xl border border-border/60 bg-slate-950 p-4 font-mono text-xs text-zinc-300 space-y-2.5 max-h-[400px] overflow-y-auto">
              <p className="text-muted-foreground text-[10.5px]">[{formatDateTime(pipeline.updatedAt)}] <span className="text-emerald-500 font-bold">SUCCESS</span> Pipeline validated successfully.</p>
              <p className="text-muted-foreground text-[10.5px]">[{formatDateTime(pipeline.createdAt)}] <span className="text-blue-500 font-bold">INFO</span> Pipeline workspace created.</p>
            </div>
          </div>
        </TabsContent>

        {/* ── Settings Tab Content ── */}
        <TabsContent value="settings" className="mt-0 outline-none space-y-6">
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Pipeline Settings</h3>
              <p className="text-xs text-muted-foreground">Manage pipeline configuration, deployment visibility, and deletion.</p>
            </div>

            <div className="border-t border-border/60 pt-6 space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rename Pipeline</Label>
                <input
                  type="text"
                  defaultValue={pipeline.name}
                  disabled
                  className="w-full h-9 rounded-lg border border-border bg-input/20 px-3 text-xs text-foreground outline-none font-medium shadow-inner disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pipeline Visibility</Label>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => builder.handleUpdateVisibility(!pipeline.isPublic)}
                    disabled={builder.isSubmitting}
                    variant="outline"
                    className="h-9 px-4 text-xs font-bold gap-1.5 cursor-pointer border-slate-200 dark:border-zinc-800 rounded-xl"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    {pipeline.isPublic ? "Switch to Private Registry" : "Publish to Public Marketplace"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-red-600 dark:text-red-400">Danger Zone</h3>
              <p className="text-xs text-muted-foreground">Irreversible actions concerning this orchestration pipeline.</p>
            </div>
            
            <div className="border-t border-red-500/10 pt-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">Delete this Pipeline</p>
                <p className="text-[11px] text-muted-foreground">Once deleted, all steps, mappers, and runs are permanently removed.</p>
              </div>
              <Button
                variant="destructive"
                className="h-9 px-4 text-xs font-bold rounded-xl cursor-pointer"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={builder.isSubmitting}
              >
                Delete Pipeline
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Run Pipeline</DialogTitle>
            <DialogDescription>
              Submit a real JSON payload to the first stage. The trace will appear in the Runs & Logs tab.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              rows={14}
              value={runInputJson}
              onChange={(event) => setRunInputJson(event.target.value)}
              className="font-mono text-xs bg-background/70"
              placeholder='{\n  "message": "hello world"\n}'
            />
            {runHook.error && <p className="text-sm text-destructive">{runHook.error}</p>}
            {pipeline.status !== PipelineStatus.VALIDATED && (
              <p className="text-sm text-muted-foreground">Validate the pipeline first before triggering a run.</p>
            )}
          </div>

          <DialogFooter className="flex sm:flex-row gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowRunDialog(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleRunNow}
              disabled={runHook.isTriggering || pipeline.status !== PipelineStatus.VALIDATED}
            >
              {runHook.isTriggering ? "Starting..." : "Run pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete this pipeline"
        description={`Permanently delete "${pipeline.name}" and all its steps, mappers, and run history. This can't be undone.`}
        confirmLabel="Delete pipeline"
        onConfirm={builder.handleDeletePipeline}
      />
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-[30px] border border-border/70 bg-card/90 shadow-[0_18px_65px_-45px_rgba(15,23,42,0.45)]", className)}>
      <div className="border-b border-border/60 bg-[linear-gradient(180deg,rgba(59,130,246,0.04),transparent)] px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{eyebrow}</p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function MetricCard({ icon, label, value, subtext }: { icon: ReactNode; label: string; value: string; subtext: string }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-background/70 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-primary">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10">
          {icon}
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtext}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function StatusPillRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "good" | "warn" | "danger" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "warn"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : tone === "danger"
          ? "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300"
          : "border-border/70 bg-background/70 text-foreground/80";

  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3", toneClass)}>
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</p>
        <p className="mt-1 text-sm leading-6">{value}</p>
      </div>
    </div>
  );
}

function StepModelCard({
  step,
  stageSteps,
  readyVersionOptions,
  isSubmitting,
  onUpdateStep,
  onRemoveStep,
}: {
  step: PipelineStep;
  stageSteps: PipelineStep[];
  readyVersionOptions: ReadyVersionOption[];
  isSubmitting: boolean;
  onUpdateStep: (
    stepId: string,
    input: {
      modelVersionId: string;
      label?: string;
      role?: string;
      pinPolicy?: string;
      maxRetries?: number;
    },
  ) => Promise<boolean>;
  onRemoveStep: (stepId: string) => Promise<void>;
}) {
  const inputPreview = parseJsonSample(step.modelVersion?.examplePayload);
  const outputPreview = parseJsonSample(step.modelVersion?.expectedResult);
  const inputKeys = getPreviewKeys(inputPreview);
  const outputKeys = getPreviewKeys(outputPreview);

  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,250,252,0.6))] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_20px_45px_-35px_rgba(59,130,246,0.65)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(15,23,42,0.5))]">
      <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_55%)]" />
      <div className="absolute right-4 top-4 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
        <EditPipelineStepDialog
          step={step}
          stageSteps={stageSteps}
          readyVersionOptions={readyVersionOptions}
          isSubmitting={isSubmitting}
          onUpdateStep={onUpdateStep}
          trigger={
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-card/90 text-muted-foreground transition hover:text-primary cursor-pointer"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          }
        />
        <button
          type="button"
          onClick={() => onRemoveStep(step.id)}
          disabled={isSubmitting}
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-500/15 bg-red-500/10 text-red-600 transition hover:bg-red-500/15 cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="relative space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{stepTitle(step)}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Stage {step.order + 1}
              {step.role ? ` · role ${step.role}` : ""}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground/85">
              {step.modelVersion?.model?.name ?? "No model bound"}{" "}
              <span className="text-muted-foreground">
                {step.modelVersion ? `· v${step.modelVersion.versionNumber}` : ""}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
            {step.pinPolicy === PipelinePinPolicy.PINNED ? "Pinned version" : "Latest ready"}
          </span>
          <span className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
            {step.maxRetries} retr{step.maxRetries === 1 ? "y" : "ies"}
          </span>
          <span className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
            {step.timeoutMs != null ? `${step.timeoutMs} ms timeout` : "Default timeout"}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <PreviewChip title="Input keys" values={inputKeys} emptyLabel="No sample input" />
          <PreviewChip title="Output keys" values={outputKeys} emptyLabel="No sample output" />
        </div>
      </div>
    </div>
  );
}

function PreviewChip({ title, values, emptyLabel }: { title: string; values: string[]; emptyLabel: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.length === 0 ? (
          <span className="text-xs text-muted-foreground">{emptyLabel}</span>
        ) : (
          values.map((value) => (
            <span key={value} className="rounded-full border border-border/70 bg-card px-2 py-1 text-[11px] font-medium text-foreground/75">
              {value}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function MapperCard({
  edge,
  steps,
  isSubmitting,
  onUpsertEdge,
  onRemoveEdge,
}: {
  edge: PipelineEdge;
  steps: PipelineStep[];
  isSubmitting: boolean;
  onUpsertEdge: (
    fromStepId: string | undefined,
    toStepId: string | undefined,
    spec: { rules: MapperRule[] },
  ) => Promise<boolean>;
  onRemoveEdge: (edgeId: string) => Promise<void>;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[22px] border border-border/70 bg-card/80 p-4 transition hover:border-primary/25 hover:shadow-[0_20px_45px_-35px_rgba(59,130,246,0.6)]">
      <div className="absolute right-4 top-4 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
        <MapperEdgeDialog steps={steps} isSubmitting={isSubmitting} onUpsert={onUpsertEdge} initialEdge={edge} />
        <button
          type="button"
          onClick={() => onRemoveEdge(edge.id)}
          disabled={isSubmitting}
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-500/15 bg-red-500/10 text-red-600 transition hover:bg-red-500/15 cursor-pointer disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="pr-20">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
            {edgeStepLabel(edge.fromStep)}
          </span>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
            {edgeStepLabel(edge.toStep)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
            {edge.spec.rules.length === 0 ? "Pass-through mapper" : `${edge.spec.rules.length} rule${edge.spec.rules.length === 1 ? "" : "s"}`}
          </span>
          <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
            {edge.autoGenerated ? "Auto-generated" : "Manual"}
          </span>
          <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground/75 capitalize">
            {edge.status}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {edge.spec.rules.length > 0 ? (
          edge.spec.rules.map((rule, index) => {
            const summary = mapperRuleSummary(rule);
            return (
              <div key={`${edge.id}-${index}`} className="rounded-2xl border border-border/70 bg-background/70 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 font-semibold capitalize text-primary">
                    {summary.op}
                  </span>
                  <code className="text-muted-foreground">{summary.from}</code>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  <code className="text-foreground">{summary.to}</code>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/55 px-3 py-3 text-sm text-muted-foreground">
            No rules stored here. This edge forwards the payload unchanged.
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground break-all">{value}</p>
    </div>
  );
}

function JsonPreview({ data, emptyLabel }: { data: unknown; emptyLabel?: string }) {
  if (data == null) {
    return <EmptyHint title="No JSON snapshot" description={emptyLabel || "No structured data is available for this block yet."} compact />;
  }

  return (
    <pre className="max-h-[540px] overflow-auto rounded-[22px] border border-border/70 bg-slate-950 p-4 text-xs leading-6 text-slate-200 shadow-inner">
      {prettifyJson(data)}
    </pre>
  );
}

function JsonPanel({ title, data, emptyLabel }: { title: string; data: unknown; emptyLabel?: string }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-background/65 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <div className="mt-3">
        <JsonPreview data={data} emptyLabel={emptyLabel} />
      </div>
    </div>
  );
}

function StepLogCard({ stepRun }: { stepRun: PipelineStepRun }) {
  return (
    <div className="rounded-[24px] border border-border/70 bg-background/65 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("h-2.5 w-2.5 rounded-full", getStepRunStatusDot(stepRun.status), stepRun.status === PipelineStepRunStatus.RUNNING && "animate-pulse")} />
            <p className="text-sm font-semibold text-foreground">
              {stepRun.step?.label || stepRun.step?.role || `Stage ${stepRun.order + 1}`}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(stepRun.createdAt)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground/75 capitalize">
            {stepRun.status}
          </span>
          <span className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
            {formatLatency(stepRun.responseTimeMs)}
          </span>
          <span className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
            {formatCredits(stepRun.cost)}
          </span>
        </div>
      </div>

      {stepRun.errorMessage && (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {stepRun.errorMessage}
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <JsonPanel title="Mapped input" data={stepRun.mappedInput} emptyLabel="No mapped input persisted for this step." />
        <JsonPanel title="Step output" data={stepRun.output} emptyLabel="No output persisted for this step." />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function EmptyHint({
  title,
  description,
  compact = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-dashed border-border/70 bg-background/55 text-center",
        compact ? "px-4 py-6" : "px-5 py-10",
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-card text-muted-foreground">
        <XCircle className="w-5 h-5" />
      </div>
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function ComponentItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center justify-between border border-border/50 bg-background hover:bg-secondary/20 rounded-xl p-3 transition-colors cursor-grab select-none">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center border border-border/40">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground truncate">{title}</p>
          <p className="text-[10px] text-muted-foreground truncate">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground/60">
        <MoreHorizontal className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}
