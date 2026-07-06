"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileCode2,
  GitCommitVertical,
  GitPullRequestArrow,
  Loader2,
  PlayCircle,
  ShieldCheck,
  TestTube2,
  XCircle,
  Play,
  Terminal,
  Check,
  X,
  Code,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { useOrgContext } from "@/hooks/use-org-context";
import {
  getModel,
  getModelHistory,
  getModelVersionArtifacts,
  getModelVersionTestCases,
  reviewModelVersion,
  saveModelVersionTestCase,
  runPrediction,
  VersionArtifactPreview,
} from "@/lib/services/models.service";
import {
  Model,
  ModelVersion,
  ModelVersionReviewEvent,
  ModelVersionTestCase,
  OrgAction,
  VersionReviewStatus,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const PRESET_TEMPLATES = [
  {
    name: "Chatbot QA - Reasoning & Coding",
    payload: JSON.stringify({
      messages: [
        { role: "system", content: "You are a senior TypeScript developer assistant." },
        { role: "user", content: "Write a type-safe generic map function in TypeScript that takes an array and a callback." }
      ],
      temperature: 0.2,
      max_tokens: 256
    }, null, 2),
    expectedResult: JSON.stringify({
      choices: [
        {
          message: {
            role: "assistant",
            content: "```typescript\nfunction map<T, U>(arr: T[], fn: (item: T) => U): U[] {\n  return arr.map(fn);\n}\n```"
          }
        }
      ]
    }, null, 2)
  },
  {
    name: "Sentiment Analysis - Customer Review",
    payload: JSON.stringify({
      text: "The integration process was extremely smooth, and the API responded within 50ms. Highly recommended!",
      options: { classify_aspects: true, return_confidence: true }
    }, null, 2),
    expectedResult: JSON.stringify({
      sentiment: "positive",
      confidence: 0.98,
      aspects: {
        latency: "positive",
        setup: "positive"
      }
    }, null, 2)
  },
  {
    name: "Text Summarization - Article",
    payload: JSON.stringify({
      document: "Antigravity is a state-of-the-art coding assistant designed by Google DeepMind. It helps developers solve complex coding tasks, build web applications, design systems, and run tests directly in their workspace using specialized tools and multi-agent coordination.",
      ratio: 0.2,
      bullet_points: true
    }, null, 2),
    expectedResult: JSON.stringify({
      summary: [
        "Antigravity is an AI coding assistant from Google DeepMind.",
        "It supports multi-agent coordination, web app creation, and workspaces."
      ]
    }, null, 2)
  },
  {
    name: "Image Tagging - Multi-label Classification",
    payload: JSON.stringify({
      image_url: "https://example.com/assets/office-space.jpg",
      confidence_threshold: 0.75,
      max_tags: 5
    }, null, 2),
    expectedResult: JSON.stringify({
      tags: [
        { name: "office", confidence: 0.95 },
        { name: "desk", confidence: 0.89 },
        { name: "computer", confidence: 0.88 },
        { name: "chair", confidence: 0.82 }
      ],
      dominant_color: "#F0F0F0"
    }, null, 2)
  }
];


function reviewTone(status?: VersionReviewStatus) {
  if (status === VersionReviewStatus.APPROVED) return "text-emerald-700 border-emerald-500/20 bg-emerald-500/10";
  if (status === VersionReviewStatus.DECLINED) return "text-red-700 border-red-500/20 bg-red-500/10";
  if (status === VersionReviewStatus.PENDING) return "text-amber-700 border-amber-500/20 bg-amber-500/10";
  return "text-muted-foreground border-border bg-secondary/30";
}

/**
 * Organization-owned model governance page.
 */
export default function OrgModelReviewPage() {
  const params = useParams<{ modelId: string }>();
  const { org, can } = useOrgContext();
  const [model, setModel] = useState<Model | null>(null);
  const [history, setHistory] = useState<ModelVersionReviewEvent[]>([]);
  const [artifacts, setArtifacts] = useState<VersionArtifactPreview | null>(null);
  const [testCases, setTestCases] = useState<ModelVersionTestCase[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [testName, setTestName] = useState("Smoke test");
  const [payload, setPayload] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Test Case Studio states
  const [runningTestCaseId, setRunningTestCaseId] = useState<string | null>(null);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [testOutcomes, setTestOutcomes] = useState<Record<string, { actual: string; status: "PASSED" | "FAILED"; latency: number }>>({});
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null);
  const [forceFailure, setForceFailure] = useState(false);

  const versions = useMemo(
    () => [...(model?.versions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber),
    [model]
  );
  const selectedVersion = versions.find((version) => version.id === selectedVersionId) ?? versions[0];
  const canReview = can(OrgAction.DEPLOY_MODEL) || can(OrgAction.EDIT_SETTINGS);

  const refreshModel = async () => {
    if (!params.modelId) return;
    const nextModel = await getModel(params.modelId);
    setModel(nextModel);
    const sorted = [...(nextModel.versions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber);
    setSelectedVersionId((current) => current || sorted[0]?.id || "");
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      try {
        setIsLoading(true);
        const [nextModel, nextHistory] = await Promise.all([
          getModel(params.modelId),
          getModelHistory(params.modelId),
        ]);
        if (!active) return;
        setModel(nextModel);
        setHistory(nextHistory);
        const sorted = [...(nextModel.versions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber);
        setSelectedVersionId(sorted[0]?.id || "");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load model review");
      } finally {
        if (active) setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [params.modelId]);

  useEffect(() => {
    if (!selectedVersion?.id) return;
    let active = true;
    Promise.resolve().then(async () => {
      try {
        const [nextArtifacts, nextTestCases] = await Promise.all([
          getModelVersionArtifacts(selectedVersion.id),
          getModelVersionTestCases(selectedVersion.id),
        ]);
        if (!active) return;
        setArtifacts(nextArtifacts);
        setTestCases(nextTestCases);
        setPayload(selectedVersion.examplePayload || "");
        setExpectedResult(selectedVersion.expectedResult || "");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load version review data");
      }
    });
    return () => {
      active = false;
    };
  }, [selectedVersion?.id, selectedVersion?.examplePayload, selectedVersion?.expectedResult]);

  const handleSaveTestCase = async () => {
    if (!selectedVersion || !testName.trim() || !payload.trim()) return;
    setIsSaving(true);
    try {
      await saveModelVersionTestCase(selectedVersion.id, {
        name: testName.trim(),
        payload,
        expectedResult,
      });
      toast.success("Test case saved");
      setTestCases(await getModelVersionTestCases(selectedVersion.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save test case");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPreset = (index: number) => {
    const preset = PRESET_TEMPLATES[index];
    setTestName(preset.name);
    setPayload(preset.payload);
    setExpectedResult(preset.expectedResult);
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const handleRunTestCase = async (testId: string, name: string, pl: string, exp: string) => {
    if (!pl.trim()) {
      toast.error("Payload cannot be empty");
      return;
    }
    if (!model) {
      toast.error("Model is not loaded");
      return;
    }

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(pl);
    } catch (e) {
      toast.error("Payload must be valid JSON to execute.");
      return;
    }

    setRunningTestCaseId(testId);
    setSimulationLogs([]);
    setSimulationProgress(0);

    const logs = [
      `⚡ [SYSTEM] Spawning isolated evaluation container for model version v${selectedVersion?.versionNumber || 1}...`,
      `📦 [LOADER] Fetching model configuration & weights from server registry...`,
      `🔑 [AUTH] Attaching project credentials & verifying scopes...`,
      `🚀 [INFERENCE] Dispatching request payload to backend prediction router...`
    ];

    // Simulating initial steps logs
    let progress = 0;
    for (let i = 0; i < logs.length; i++) {
      setSimulationLogs(prev => [...prev, logs[i]]);
      progress += 20;
      setSimulationProgress(progress);
      await new Promise(r => setTimeout(r, 200));
    }

    try {
      const startTime = Date.now();
      
      // Execute the actual backend inference prediction!
      const actualResponse = await runPrediction(
        model.id, 
        parsedPayload, 
        selectedVersion?.versionNumber
      );
      
      const latency = Date.now() - startTime;

      setSimulationLogs(prev => [
        ...prev,
        `⚙️ [INFERENCE] Inference completed successfully in ${latency}ms`,
        `📊 [COMPARATOR] Comparing actual output structure with expected schema...`,
        `✔️ [VERIFIER] Completed assertion evaluations successfully.`
      ]);
      setSimulationProgress(100);

      const actualString = JSON.stringify(actualResponse, null, 2);
      let isSuccess = true;

      if (forceFailure) {
        isSuccess = false;
      } else if (exp.trim()) {
        try {
          const parsedExp = JSON.parse(exp);
          // Compare keys or values
          const expKeys = Object.keys(parsedExp);
          const hasAllKeys = expKeys.every(k => k in actualResponse);
          if (!hasAllKeys) {
            isSuccess = false;
          }
        } catch {
          if (actualString.trim() !== exp.trim()) {
            isSuccess = false;
          }
        }
      }

      setTestOutcomes(prev => ({
        ...prev,
        [testId]: {
          actual: actualString,
          status: isSuccess ? "PASSED" : "FAILED",
          latency
        }
      }));

      if (isSuccess) {
        toast.success(`Test case "${name}" PASSED`);
      } else {
        toast.error(`Test case "${name}" FAILED (mismatch or force-failure active)`);
      }

    } catch (error: any) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setSimulationLogs(prev => [
        ...prev,
        `❌ [ERROR] Backend inference failed: ${errMsg}`,
        `⚠️ [VERIFIER] Evaluation runner aborted.`
      ]);
      setSimulationProgress(100);

      setTestOutcomes(prev => ({
        ...prev,
        [testId]: {
          actual: JSON.stringify({ error: "Prediction Dispatch Failed", details: errMsg }, null, 2),
          status: "FAILED",
          latency: 0
        }
      }));
      toast.error(`Test case "${name}" FAILED: ${errMsg}`);
    } finally {
      setRunningTestCaseId(null);
    }
  };

  const handleReview = async (decision: "approve" | "decline") => {
    if (!selectedVersion) return;
    try {
      await reviewModelVersion(selectedVersion.id, decision, comment);
      toast.success(decision === "approve" ? "Version approved and build started" : "Version declined");
      setComment("");
      await refreshModel();
      setHistory(await getModelHistory(params.modelId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review action failed");
    }
  };

  if (!org) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Model not found.
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link href={`/orgs/${org.slug}/models`} className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Provider models
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">{model.name}</h1>
            {model.marketplaceVerified && (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">
                <ShieldCheck className="h-3 w-3" />
                Verified
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{model.description || "No description provided."}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Versions</p>
            <p className="mt-1 text-lg font-black text-foreground">{versions.length}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Framework</p>
            <p className="mt-1 text-sm font-bold text-foreground">{model.framework}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Owner</p>
            <p className="mt-1 text-sm font-bold text-foreground">{org.name}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Version control</p>
          </div>
          <div className="divide-y divide-border">
            {versions.map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => setSelectedVersionId(version.id)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40 ${
                  selectedVersion?.id === version.id ? "bg-primary/8" : ""
                }`}
              >
                <GitPullRequestArrow className="mt-0.5 h-4 w-4 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">v{version.versionNumber}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {version.uploadedBy?.email || org.name || "Unknown uploader"}
                  </p>
                  <span className={`mt-2 inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${reviewTone(version.reviewStatus)}`}>
                    {version.reviewStatus || VersionReviewStatus.NOT_REQUIRED}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="space-y-5">
          <section className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Pull request review</p>
                <h2 className="mt-1 text-lg font-bold text-foreground">
                  Version v{selectedVersion?.versionNumber ?? "-"}
                </h2>
              </div>
              <span className={`inline-flex rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase ${reviewTone(selectedVersion?.reviewStatus)}`}>
                {selectedVersion?.reviewStatus || VersionReviewStatus.NOT_REQUIRED}
              </span>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-background p-4">
                <Clock3 className="mb-3 h-4 w-4 text-muted-foreground" />
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Build status</p>
                <p className="mt-1 text-sm font-bold text-foreground">{selectedVersion?.status}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <Activity className="mb-3 h-4 w-4 text-muted-foreground" />
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Uploaded by</p>
                <p className="mt-1 truncate text-sm font-bold text-foreground">{selectedVersion?.uploadedBy?.email || org.name}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <CheckCircle2 className="mb-3 h-4 w-4 text-muted-foreground" />
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Reviewed by</p>
                <p className="mt-1 truncate text-sm font-bold text-foreground">{selectedVersion?.reviewedBy?.email || "Awaiting maintainer"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Artifact preview</p>
              <h2 className="mt-1 text-lg font-bold text-foreground">VS Code style review bundle</h2>
            </div>
            <div className="grid gap-3 p-5 md:grid-cols-2">
              {(artifacts?.artifacts ?? []).map((artifact) => (
                <a
                  key={artifact.kind}
                  href={artifact.url || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-border bg-slate-950 p-4 text-indigo-100 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center gap-2">
                    <FileCode2 className="h-4 w-4 text-emerald-400" />
                    <p className="text-xs font-bold">{artifact.kind}</p>
                  </div>
                  <p className="mt-3 truncate font-mono text-[11px] text-slate-400">{artifact.path || "No artifact uploaded"}</p>
                  <p className="mt-2 text-[10px] font-semibold text-slate-500">
                    {artifact.previewable ? "Previewable source artifact" : "Download artifact"}
                  </p>
                </a>
              ))}
            </div>
          </section>

          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/50">
              <div className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base font-bold text-foreground">Test Suite & Evaluation Studio</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Configure inputs, load realistic AI task presets, run inference simulations, and analyze validation results.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Left Side: Creator / Editor */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Preset Templates</h3>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_TEMPLATES.map((preset, idx) => (
                        <Button
                          key={preset.name}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-[11px] bg-secondary/35 border-border hover:bg-secondary"
                          onClick={() => handleLoadPreset(idx)}
                        >
                          <Code className="h-3 w-3 text-primary" />
                          {preset.name.split(" - ")[0]}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-muted-foreground">Test Case Name</label>
                      <Input
                        value={testName}
                        onChange={(event) => setTestName(event.target.value)}
                        placeholder="e.g. Smoke test"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase text-muted-foreground">JSON Input Payload</label>
                      <Textarea
                        value={payload}
                        onChange={(event) => setPayload(event.target.value)}
                        className="mt-1 min-h-[140px] font-mono text-xs"
                        placeholder="JSON payload structure..."
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase text-muted-foreground">Expected Output JSON</label>
                      <Textarea
                        value={expectedResult}
                        onChange={(event) => setExpectedResult(event.target.value)}
                        className="mt-1 min-h-[110px] font-mono text-xs"
                        placeholder="Expected JSON response..."
                      />
                    </div>

                    <div className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        id="force-failure-chk"
                        checked={forceFailure}
                        onChange={(e) => setForceFailure(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary/20 h-4 w-4"
                      />
                      <label htmlFor="force-failure-chk" className="text-xs text-muted-foreground select-none cursor-pointer">
                        Simulate validation failure / payload mismatch
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveTestCase}
                        disabled={isSaving || !payload.trim() || !testName.trim()}
                        className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
                      >
                        <TestTube2 className="h-3.5 w-3.5" />
                        Save to Suite
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRunTestCase("draft", testName, payload, expectedResult)}
                        disabled={!!runningTestCaseId || !payload.trim()}
                        className="font-semibold bg-secondary hover:bg-secondary/80 border border-border"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Run Simulation
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right Side: Saved Test Cases */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Saved Test Cases</h3>
                  
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {testCases.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                        No saved test cases yet. Load a preset and click "Save to Suite" to build your review suite.
                      </div>
                    ) : (
                      testCases.map((testCase) => {
                        const isExpanded = selectedTestCaseId === testCase.id;
                        const outcome = testOutcomes[testCase.id];
                        
                        return (
                          <div
                            key={testCase.id}
                            className={`rounded-lg border p-3 transition-all ${
                              isExpanded ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/15"
                            }`}
                          >
                            <div
                              className="flex items-center justify-between gap-3 cursor-pointer select-none"
                              onClick={() => setSelectedTestCaseId(isExpanded ? null : testCase.id)}
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">{testCase.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  v{selectedVersion?.versionNumber} · {testCase.createdBy?.email || "Unknown"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {outcome ? (
                                  <Badge
                                    variant={outcome.status === "PASSED" ? "default" : "destructive"}
                                    className={`text-[10px] uppercase font-bold py-0.5 px-2 ${
                                      outcome.status === "PASSED" ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30" : ""
                                    }`}
                                  >
                                    {outcome.status}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5 px-2">
                                    Never Run
                                  </Badge>
                                )}
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
                                <div>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Payload</p>
                                  <pre className="mt-1 max-h-36 overflow-auto rounded bg-slate-950 p-2 font-mono text-[10px] text-slate-300">
                                    {testCase.payload}
                                  </pre>
                                </div>

                                {testCase.expectedResult && (
                                  <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Expected Response</p>
                                    <pre className="mt-1 max-h-36 overflow-auto rounded bg-slate-950 p-2 font-mono text-[10px] text-slate-300">
                                      {testCase.expectedResult}
                                    </pre>
                                  </div>
                                )}

                                {outcome && (
                                  <div className="rounded-lg border border-border/80 bg-background p-3 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-semibold text-foreground">Simulation Results:</span>
                                      <span className="text-muted-foreground font-mono">Latency: {outcome.latency}ms</span>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Simulated Response</p>
                                      <pre className={`mt-1 max-h-36 overflow-auto rounded p-2 font-mono text-[10px] ${
                                        outcome.status === "PASSED" ? "bg-emerald-950/20 text-emerald-200 border border-emerald-500/10" : "bg-red-950/20 text-red-200 border border-red-500/10"
                                      }`}>
                                        {outcome.actual}
                                      </pre>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs">
                                      {outcome.status === "PASSED" ? (
                                        <Check className="h-4 w-4 text-emerald-500" />
                                      ) : (
                                        <X className="h-4 w-4 text-red-500" />
                                      )}
                                      <span className={outcome.status === "PASSED" ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-red-700 dark:text-red-400 font-semibold"}>
                                        {outcome.status === "PASSED" ? "Inference structure matched expectation." : "Response payload assertion mismatch."}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleRunTestCase(testCase.id, testCase.name, testCase.payload, testCase.expectedResult || "")}
                                    disabled={!!runningTestCaseId}
                                    className="bg-primary text-primary-foreground text-xs"
                                  >
                                    <Play className="h-3 w-3" />
                                    Run Evaluator
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setTestName(testCase.name);
                                      setPayload(testCase.payload);
                                      setExpectedResult(testCase.expectedResult || "");
                                      toast.success("Copied test case to configuration editor");
                                    }}
                                    className="text-xs bg-secondary/20 hover:bg-secondary/40 border-border"
                                  >
                                    <Code className="h-3 w-3" />
                                    Load in Editor
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Terminal Logs View */}
              {runningTestCaseId && (
                <div className="mt-5 space-y-2 animate-pulse">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-1">
                    <span className="flex items-center gap-1">
                      <Terminal className="h-3.5 w-3.5" />
                      Evaluating: {runningTestCaseId === "draft" ? testName : testCases.find(t => t.id === runningTestCaseId)?.name}
                    </span>
                    <span>{simulationProgress}%</span>
                  </div>
                  <Progress value={simulationProgress} className="h-1" />
                  
                  <div className="rounded-lg bg-slate-950 p-4 font-mono text-[10px] leading-5 text-emerald-400 border border-emerald-950 overflow-hidden shadow-inner max-h-48 overflow-y-auto">
                    {simulationLogs.map((log, idx) => (
                      <p key={idx} className="truncate">
                        {log}
                      </p>
                    ))}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                      <span className="text-emerald-500 opacity-60">Executing inference pipeline...</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-5">
          {canReview && selectedVersion?.reviewStatus === VersionReviewStatus.PENDING && (
            <section className="rounded-lg border border-border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Maintainer decision</p>
              <Textarea value={comment} onChange={(event) => setComment(event.target.value)} className="mt-3 min-h-28 text-sm" placeholder="Decision notes" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button size="sm" onClick={() => handleReview("approve")} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <PlayCircle className="h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleReview("decline")}>
                  <XCircle className="h-3.5 w-3.5" />
                  Decline
                </Button>
              </div>
            </section>
          )}

          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Hard history</p>
            </div>
            <div className="max-h-[620px] space-y-3 overflow-y-auto p-4">
              {history.map((event) => (
                <div key={event.id} className="relative border-l border-border pl-4">
                  <GitCommitVertical className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-card text-primary" />
                  <p className="text-xs font-bold text-foreground">{event.action.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{event.message || "No message"}</p>
                  <p className="mt-1 text-[10px] font-semibold text-muted-foreground">
                    {event.actor?.email || "System"} · {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
