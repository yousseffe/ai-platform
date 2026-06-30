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
} from "lucide-react";
import { useOrgContext } from "@/hooks/use-org-context";
import {
  getModel,
  getModelHistory,
  getModelVersionArtifacts,
  getModelVersionTestCases,
  reviewModelVersion,
  saveModelVersionTestCase,
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

          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Test plan</p>
              <h2 className="mt-1 text-lg font-bold text-foreground">Saved reviewer test cases</h2>
            </div>
            <div className="grid gap-5 p-5 lg:grid-cols-2">
              <div className="space-y-3">
                <Input value={testName} onChange={(event) => setTestName(event.target.value)} placeholder="Test case name" />
                <Textarea value={payload} onChange={(event) => setPayload(event.target.value)} className="min-h-40 font-mono text-xs" placeholder="JSON payload" />
                <Textarea value={expectedResult} onChange={(event) => setExpectedResult(event.target.value)} className="min-h-32 font-mono text-xs" placeholder="Expected result JSON" />
                <Button size="sm" onClick={handleSaveTestCase} disabled={isSaving || !payload.trim()}>
                  <TestTube2 className="h-3.5 w-3.5" />
                  Save test case
                </Button>
              </div>
              <div className="space-y-2">
                {testCases.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                    No saved test cases yet.
                  </div>
                ) : (
                  testCases.map((testCase) => (
                    <div key={testCase.id} className="rounded-lg border border-border bg-background p-3">
                      <p className="text-sm font-bold text-foreground">{testCase.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {testCase.createdBy?.email || "Unknown"} · {new Date(testCase.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
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
