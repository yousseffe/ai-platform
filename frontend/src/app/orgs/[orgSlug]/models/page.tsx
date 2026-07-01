"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Coins,
  Layers,
  Loader2,
  Plus,
  Server,
  ShieldCheck,
} from "lucide-react";
import { useOrgContext } from "@/hooks/use-org-context";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { DeploymentStatus, Model, OrgAction, VersionStatus } from "@/types";
import { toast } from "react-hot-toast";

/**
 * Organization models registry page.
 *
 * @returns Models registered by members of the current organization.
 */
export default function OrgModelsPage() {
  const { org, can } = useOrgContext();
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!org) return;

    let active = true;

    Promise.resolve().then(async () => {
      setIsLoading(true);
      try {
        const data = await smartFetch<Model[]>(`/organizations/${org.id}/models`, {
          headers: { "X-Workspace-Id": org.id },
          cache: "no-store",
        });
        if (active) {
          setModels(data);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load organization models");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      active = false;
    };
  }, [org]);

  if (!org) return null;

  const readyModels = models.filter((model) =>
    model.versions?.some((version) => version.status === VersionStatus.READY)
  ).length;
  const liveDeployments = models.reduce((count, model) => {
    return count + (model.versions ?? []).reduce((versionCount, version) => {
      return versionCount + (version.deployments ?? []).filter((deployment) => deployment.status === DeploymentStatus.RUNNING).length;
    }, 0);
  }, 0);
  const totalVersions = models.reduce((count, model) => count + (model.versions?.length ?? 0), 0);
  const totalEarnings = models.reduce((sum, model) => sum + (Number(model.totalEarnings) || 0), 0);
  const canGovernReleases = can(OrgAction.DEPLOY_MODEL) || can(OrgAction.EDIT_SETTINGS);

  const metrics = [
    {
      label: "Published Models",
      value: models.length.toLocaleString(),
      caption: "Registered by org members",
      icon: <Layers className="h-4 w-4" strokeWidth={1.8} />,
      tone: "text-primary bg-primary/10 border-primary/20",
    },
    {
      label: "Ready Versions",
      value: readyModels.toLocaleString(),
      caption: `${totalVersions.toLocaleString()} total versions`,
      icon: <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />,
      tone: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Live Deployments",
      value: liveDeployments.toLocaleString(),
      caption: "Running inference endpoints",
      icon: <Activity className="h-4 w-4" strokeWidth={1.8} />,
      tone: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Provider Revenue",
      value: `${totalEarnings.toLocaleString()} EGP`,
      caption: "Tracked across listed models",
      icon: <Coins className="h-4 w-4" strokeWidth={1.8} />,
      tone: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Provider Models</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Publish, validate, and monitor models owned by this provider organization.
          </p>
        </div>
        {(can(OrgAction.UPLOAD_MODEL) || canGovernReleases) && (
          <div className="flex flex-wrap gap-2">
            {canGovernReleases && (
              <>
            <Link
              href={`/orgs/${org.slug}/models/analytics`}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/60"
            >
              Analytics
            </Link>
            <Link
              href={`/orgs/${org.slug}/models/versions`}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/60"
            >
              Versions
            </Link>
              </>
            )}
            {can(OrgAction.UPLOAD_MODEL) && (
            <Link
              href={`/orgs/${org.slug}/models/upload`}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              Upload Model
            </Link>
            )}
          </div>
        )}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{metric.label}</p>
                <p className="mt-3 text-2xl font-black text-foreground">{metric.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{metric.caption}</p>
              </div>
              <div className={`rounded-lg border p-2 ${metric.tone}`}>
                {metric.icon}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Registry Operations</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">Model catalog and deployment readiness</h2>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground">
            <Server className="h-3.5 w-3.5" strokeWidth={1.7} />
            Provider workspace: {org.name}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" strokeWidth={1.5} />
          </div>
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Layers className="w-6 h-6" strokeWidth={1.6} />
            </div>
            <h3 className="mt-5 text-base font-bold text-foreground">No provider models yet</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Upload a model while this organization is selected in the workspace switcher. It will appear here for the team to validate, deploy, and monetize.
            </p>
            {can(OrgAction.UPLOAD_MODEL) && (
              <Link
                href={`/orgs/${org.slug}/models/upload`}
                className="mt-5 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                Upload First Model
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Model</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Framework</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Versions</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Live</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => {
                  const latestVersion = model.versions?.[0];
                  const isReady = latestVersion?.status === VersionStatus.READY;
                  const liveCount = (model.versions ?? []).reduce(
                    (count, version) => count + (version.deployments ?? []).filter((deployment) => deployment.status === DeploymentStatus.RUNNING).length,
                    0
                  );

                  return (
                    <tr key={model.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center text-primary">
                            <Server className="w-4 h-4" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{model.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-xs">{model.description || "No description"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{model.framework ?? "CUSTOM"}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{model.versions?.length ?? 0}</td>
                      <td className="px-5 py-4 text-xs font-semibold text-foreground">{liveCount}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-1 rounded-md border ${
                          isReady
                            ? "text-emerald-600 border-emerald-500/20 bg-emerald-500/10"
                            : "text-muted-foreground border-border bg-secondary/30"
                        }`}>
                          {isReady ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {latestVersion?.status ?? "DRAFT"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/orgs/${org.slug}/models/${model.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                          Open
                          <ArrowRight className="h-3 w-3" strokeWidth={1.8} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
