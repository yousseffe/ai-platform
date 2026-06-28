"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  GitPullRequestArrow,
  Loader2,
  PlayCircle,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useOrgContext } from "@/hooks/use-org-context";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { reviewModelVersion } from "@/lib/services/models.service";
import { Model, ModelVersion, OrgAction, VersionReviewStatus, VersionStatus } from "@/types";
import { Button } from "@/components/ui/button";

interface VersionRow {
  model: Model;
  version: ModelVersion;
}

function reviewClass(status?: VersionReviewStatus) {
  if (status === VersionReviewStatus.APPROVED) return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
  if (status === VersionReviewStatus.DECLINED) return "border-red-500/20 bg-red-500/10 text-red-700";
  if (status === VersionReviewStatus.PENDING) return "border-amber-500/20 bg-amber-500/10 text-amber-700";
  return "border-border bg-secondary/30 text-muted-foreground";
}

/**
 * Organization-wide provider version management queue.
 */
export default function OrgModelVersionsPage() {
  const { org, can } = useOrgContext();
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyVersionId, setBusyVersionId] = useState<string | null>(null);
  const canReview = can(OrgAction.DEPLOY_MODEL) || can(OrgAction.EDIT_SETTINGS);

  const fetchModels = async () => {
    if (!org || !canReview) return;
    setIsLoading(true);
    try {
      setModels(await smartFetch<Model[]>(`/organizations/${org.id}/models`, {
        headers: { "X-Workspace-Id": org.id },
        cache: "no-store",
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load versions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(fetchModels);
  }, [org?.id, canReview]);

  const rows = useMemo<VersionRow[]>(() => {
    return models
      .flatMap((model) => (model.versions ?? []).map((version) => ({ model, version })))
      .sort((a, b) => new Date(b.version.createdAt).getTime() - new Date(a.version.createdAt).getTime());
  }, [models]);

  const handleDecision = async (versionId: string, decision: "approve" | "decline") => {
    setBusyVersionId(versionId);
    try {
      await reviewModelVersion(versionId, decision);
      toast.success(decision === "approve" ? "Version approved for production build" : "Version declined");
      await fetchModels();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Version decision failed");
    } finally {
      setBusyVersionId(null);
    }
  };

  if (!org) return null;

  if (!canReview) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-base font-bold text-foreground">Owner or maintainer access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Version production control is limited to organization governance roles.
        </p>
      </div>
    );
  }

  const pendingCount = rows.filter((row) => row.version.reviewStatus === VersionReviewStatus.PENDING).length;
  const productionCount = rows.filter((row) => row.version.status === VersionStatus.READY).length;
  const declinedCount = rows.filter((row) => row.version.reviewStatus === VersionReviewStatus.DECLINED).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link href={`/orgs/${org.slug}/models`} className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Provider models
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Versions and Production Control</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Organization-wide release queue for approving, declining, and monitoring provider model versions.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Pending</p>
            <p className="mt-1 text-lg font-black text-foreground">{pendingCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Production</p>
            <p className="mt-1 text-lg font-black text-foreground">{productionCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Declined</p>
            <p className="mt-1 text-lg font-black text-foreground">{declinedCount}</p>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <GitPullRequestArrow className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Release queue</h2>
          </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No versions submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Model / Version</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Uploader</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Review</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Build</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Reviewer</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ model, version }) => (
                  <tr key={version.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-foreground">{model.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">v{version.versionNumber} · {new Date(version.createdAt).toLocaleString()}</p>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {version.uploadedBy?.email || model.user?.email || "Unknown"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${reviewClass(version.reviewStatus)}`}>
                        {version.reviewStatus === VersionReviewStatus.PENDING && <Clock3 className="h-3 w-3" />}
                        {version.reviewStatus === VersionReviewStatus.APPROVED && <CheckCircle2 className="h-3 w-3" />}
                        {version.reviewStatus === VersionReviewStatus.DECLINED && <XCircle className="h-3 w-3" />}
                        {version.reviewStatus || VersionReviewStatus.NOT_REQUIRED}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
                        {version.status === VersionStatus.READY && <ShieldCheck className="h-3 w-3 text-emerald-600" />}
                        {version.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {version.reviewedBy?.email || "Not reviewed"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/orgs/${org.slug}/models/${model.id}`}
                          className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Review
                        </Link>
                        {canReview && version.reviewStatus === VersionReviewStatus.PENDING && (
                          <>
                            <Button size="sm" onClick={() => handleDecision(version.id, "approve")} disabled={busyVersionId === version.id} className="bg-emerald-600 text-white hover:bg-emerald-700">
                              <PlayCircle className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDecision(version.id, "decline")} disabled={busyVersionId === version.id}>
                              Decline
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
