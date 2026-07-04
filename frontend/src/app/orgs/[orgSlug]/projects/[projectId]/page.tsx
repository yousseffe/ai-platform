"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useOrgContext } from "@/hooks/use-org-context";
import { OrgAction } from "@/types";
import {
  getProject,
  listApiKeys,
  getProjectApiKeyUsage,
  listProjectApiKeyLogs,
  revokeApiKey,
  Project,
  OrgApiKey,
  ProjectApiKeyUsage,
  ProjectApiKeyLog,
} from "@/lib/services/projects.service";
import {
  Key,
  Plus,
  Loader2,
  ChevronLeft,
  FolderKanban,
  ShieldCheck,
  Coins,
  Activity,
  BarChart3,
  Cpu,
  Zap,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "react-hot-toast";
import ApiKeyRow from "@/components/orgs/ApiKeyRow";
import CreateApiKeyModal from "@/components/orgs/CreateApiKeyModal";

/**
 * Project detail page — shows project info and API keys table.
 * OWNER/MAINTAINER can generate and revoke keys.
 * CONTRIBUTOR can view key prefixes only.
 *
 * @returns The React page component.
 */
export default function ProjectDetailPage() {
  const { org, can } = useOrgContext();
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId ?? "";

  const [project, setProject] = useState<Project | null>(null);
  const [apiKeys, setApiKeys] = useState<OrgApiKey[]>([]);
  const [usage, setUsage] = useState<ProjectApiKeyUsage | null>(null);
  const [logs, setLogs] = useState<ProjectApiKeyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createKeyOpen, setCreateKeyOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!org || !projectId) return;
    setIsLoading(true);
    try {
      const canViewApiKeys = can(OrgAction.VIEW_API_KEYS);
      const canViewProjectUsage = can(OrgAction.VIEW_PROJECT_USAGE);
      const [proj, keys, usageData, logData] = await Promise.all([
        getProject(org.id, projectId),
        canViewApiKeys ? listApiKeys(org.id, projectId) : Promise.resolve([]),
        canViewProjectUsage ? getProjectApiKeyUsage(org.id, projectId) : Promise.resolve(null),
        canViewProjectUsage ? listProjectApiKeyLogs(org.id, projectId) : Promise.resolve([]),
      ]);
      setProject(proj);
      setApiKeys(keys);
      setUsage(usageData);
      setLogs(logData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load project");
    } finally {
      setIsLoading(false);
    }
  }, [org, projectId, can]);

  useEffect(() => {
    Promise.resolve().then(fetchData);
  }, [fetchData]);

  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);

  const handleRevoke = async (keyId: string) => {
    if (!org || !projectId) return;
    try {
      await revokeApiKey(org.id, projectId, keyId);
      toast.success("API key revoked");
      setApiKeys((prev) => prev.map((k) => (k.id === keyId ? { ...k, isActive: false } : k)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke key");
    } finally {
      setRevokeTargetId(null);
    }
  };

  if (!org) return null;

  const canViewApiKeys = can(OrgAction.VIEW_API_KEYS);
  const canViewProjectUsage = can(OrgAction.VIEW_PROJECT_USAGE);
  const activeKeys = apiKeys.filter((key) => key.isActive).length;
  const topApiKey = usage?.apiKeys[0];
  const topModel = usage?.models[0];
  const successRate = usage?.totals.requests
    ? Math.round(((usage.totals.successfulRequests ?? 0) / usage.totals.requests) * 100)
    : 0;
  const metricCards = [
    canViewApiKeys ? {
      label: "Total Keys",
      value: isLoading ? "—" : String(apiKeys.length),
      icon: <Key className="w-4 h-4" strokeWidth={1.8} />,
      tone: "bg-primary/10 text-primary",
    } : null,
    canViewApiKeys ? {
      label: "Active Keys",
      value: isLoading ? "—" : String(activeKeys),
      icon: <ShieldCheck className="w-4 h-4" strokeWidth={1.8} />,
      tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    } : null,
    {
      label: "Total Requests",
      value: isLoading ? "—" : String(usage?.totals.requests ?? 0),
      icon: <Activity className="w-4 h-4" strokeWidth={1.8} />,
      tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      label: "Credits Used",
      value: isLoading ? "—" : (usage?.totals.creditsCharged ?? 0).toLocaleString(),
      icon: <Coins className="w-4 h-4" strokeWidth={1.8} />,
      tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ].filter((card): card is NonNullable<typeof card> => card !== null);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/orgs/${org.slug}/projects`} className="inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1.5 transition-colors hover:border-border hover:bg-card hover:text-foreground">
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
          Projects
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">{project?.name ?? "Loading..."}</span>
      </div>

      <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            <FolderKanban className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              {project?.name ?? "Loading project..."}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {project?.description || "Manage API keys and access for this project workspace."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canViewApiKeys && <div className="hidden sm:flex h-9 items-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-muted-foreground">
            {activeKeys} active
          </div>}
          {can(OrgAction.MANAGE_API_KEYS) && (
            <Button size="sm" onClick={() => setCreateKeyOpen(true)}>
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              Generate API Key
            </Button>
          )}
        </div>
      </div>

      {canViewProjectUsage && <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{card.label}</p>
                <p className="mt-3 text-2xl font-black text-foreground">{card.value}</p>
              </div>
              <div className={`rounded-2xl p-2.5 ${card.tone}`}>{card.icon}</div>
            </div>
          </div>
        ))}
      </section>}

      {canViewProjectUsage && <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Usage Intelligence</p>
          <h2 className="mt-2 text-lg font-bold text-foreground">API key consumption</h2>
          <div className="mt-5 overflow-hidden rounded-lg border border-border bg-background/60">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Key</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Requests</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Credits</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Last Used</th>
                </tr>
              </thead>
              <tbody>
                {(usage?.apiKeys ?? []).map((key) => (
                  <tr key={key.id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">{key.label}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{key.keyPrefix}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">{key.requests}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-foreground">{key.creditsCharged.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}
                    </td>
                  </tr>
                ))}
                {!isLoading && (usage?.apiKeys.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No API key usage recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Highlights</p>
          <h2 className="mt-2 text-lg font-bold text-foreground">What is using credits</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-primary">
                <Key className="w-4 h-4" strokeWidth={1.7} />
                <p className="text-xs font-bold uppercase tracking-[0.14em]">Top API Key</p>
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{topApiKey?.label ?? "No usage yet"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {topApiKey ? `${topApiKey.creditsCharged.toLocaleString()} credits across ${topApiKey.requests} calls` : "Run predictions with a project key to populate this."}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-primary">
                <BarChart3 className="w-4 h-4" strokeWidth={1.7} />
                <p className="text-xs font-bold uppercase tracking-[0.14em]">Top Model</p>
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{topModel?.name ?? "No model calls yet"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {topModel ? `${topModel.creditsCharged.toLocaleString()} credits across ${topModel.requests} calls` : "Model calls will appear here after successful predictions."}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {topModel ? `${topModel.framework} · ${topModel.type} · ${Number(topModel.costPerRequest ?? 0).toLocaleString()} credits per request` : "Per-model pricing appears once requests are logged."}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-primary">
                <Zap className="w-4 h-4" strokeWidth={1.7} />
                <p className="text-xs font-bold uppercase tracking-[0.14em]">Delivery Health</p>
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{successRate}% success rate</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {usage ? `${usage.totals.successfulRequests} successful and ${usage.totals.failedRequests} failed requests.` : "Health metrics will appear after traffic starts flowing."}
              </p>
            </div>
          </div>
        </div>
      </section>}

      {canViewProjectUsage && <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Model Economics</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">Which models are consuming credits</h2>
          </div>
          <div className="text-xs text-muted-foreground">
            {usage?.models.length ?? 0} model{(usage?.models.length ?? 0) !== 1 ? "s" : ""} with tracked usage
          </div>
        </div>
        <div className="grid gap-4 border-b border-border px-5 py-5 lg:grid-cols-3 sm:px-6">
          <div className="rounded-lg border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-primary">
              <Cpu className="w-4 h-4" strokeWidth={1.7} />
              <p className="text-xs font-bold uppercase tracking-[0.14em]">Most Used Model</p>
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">{topModel?.name ?? "No model calls yet"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {topModel ? `${topModel.requests} calls at ${Number(topModel.costPerRequest).toLocaleString()} credits each` : "Start sending project traffic to compare model demand."}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-primary">
              <Coins className="w-4 h-4" strokeWidth={1.7} />
              <p className="text-xs font-bold uppercase tracking-[0.14em]">Average Spend / Call</p>
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">
              {usage?.totals.requests ? (usage.totals.creditsCharged / usage.totals.requests).toFixed(2) : "0.00"} credits
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Helps explain how quickly this project draws from your organization balance.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background/60 p-4">
            <div className="flex items-center gap-2 text-primary">
              <Gauge className="w-4 h-4" strokeWidth={1.7} />
              <p className="text-xs font-bold uppercase tracking-[0.14em]">Average Latency</p>
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">
              {usage?.models.length ? Math.round(usage.models.reduce((sum, model) => sum + model.averageLatencyMs, 0) / usage.models.length) : 0} ms
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Based on tracked model calls in this project workspace.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Model</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pricing</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Requests</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Credits Used</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Success</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Avg Latency</th>
              </tr>
            </thead>
            <tbody>
              {(usage?.models ?? []).map((model) => (
                <tr key={model.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{model.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{model.framework} · {model.type}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{Number(model.costPerRequest ?? 0).toLocaleString()} credits / request</td>
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">{model.requests}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">{Number(model.creditsCharged ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{model.successfulRequests} success / {model.failedRequests} failed</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{model.averageLatencyMs}ms</td>
                </tr>
              ))}
              {!isLoading && (usage?.models.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No model consumption data recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>}

      {canViewProjectUsage && <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Call Logs</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">Recent model calls</h2>
          </div>
          <div className="text-xs text-muted-foreground">
            {logs.length} recent call{logs.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Model</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">API Key</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Credits</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Latency</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">{log.model?.name ?? "Unknown model"}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{log.apiKeyLabel ?? "Project key"}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{log.apiKeyPrefix ?? log.apiKey ?? "Hidden"}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">{Number(log.creditsCharged ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{log.responseTimeMs}ms</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                      log.status === "SUCCESS"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                        : "border-destructive/20 bg-destructive/10 text-destructive"
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No model calls recorded for this project yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>}

      {canViewApiKeys && <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Credentials</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">API Keys</h2>
          </div>
          <div className="text-xs text-muted-foreground">
            {apiKeys.length > 0 ? `${apiKeys.length} key${apiKeys.length !== 1 ? "s" : ""} in this project` : "No keys generated yet"}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" strokeWidth={1.5} />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background/70 px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-primary/10 text-primary">
                <Key className="w-7 h-7" strokeWidth={1.6} />
              </div>
              <h3 className="mt-5 text-lg font-bold text-foreground">No API keys yet</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                {can(OrgAction.MANAGE_API_KEYS)
                  ? "Generate a key when this project is ready to make authenticated prediction requests."
                  : "No API keys have been created for this project."}
              </p>
              {can(OrgAction.MANAGE_API_KEYS) && (
                <Button size="sm" className="mt-5" onClick={() => setCreateKeyOpen(true)}>
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  Generate First Key
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-background/60">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Label & Model</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Key</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Consumption Limits</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Last Used</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.map((key) => (
                      <ApiKeyRow
                        key={key.id}
                        orgId={org.id}
                        apiKey={key}
                        onRevoke={setRevokeTargetId}
                        onQuotaUpdated={(updated) =>
                          setApiKeys((prev) => prev.map((k) => (k.id === updated.id ? updated : k)))
                        }
                        canRevoke={can(OrgAction.MANAGE_API_KEYS)}
                        canManageQuota={can(OrgAction.MANAGE_API_KEYS)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>}

      {org && project && (
        <CreateApiKeyModal orgId={org.id} projectId={project.id} open={createKeyOpen} onClose={() => setCreateKeyOpen(false)} onCreated={fetchData} />
      )}

      <ConfirmDialog
        open={!!revokeTargetId}
        onOpenChange={(open) => !open && setRevokeTargetId(null)}
        title="Revoke API key"
        description="Apps using this key will lose access immediately. This can't be undone."
        confirmLabel="Revoke key"
        onConfirm={async () => {
          if (revokeTargetId) await handleRevoke(revokeTargetId);
        }}
      />
    </div>
  );
}
