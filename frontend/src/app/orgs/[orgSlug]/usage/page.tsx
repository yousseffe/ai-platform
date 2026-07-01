"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Coins,
  FolderKanban,
  KeyRound,
  Layers,
  Loader2,
} from "lucide-react";
import { useOrgContext } from "@/hooks/use-org-context";
import { OrgAction, OrgType } from "@/types";
import {
  getOrganizationUsageSummary,
  OrganizationUsageSummary,
} from "@/lib/services/projects.service";
import { toast } from "react-hot-toast";

type UsageMetricCardProps = {
  label: string;
  value: string;
  caption: string;
  icon: React.ReactNode;
  tone: string;
};

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatCredits(value: number) {
  return `${Number(value ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} cr`;
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function UsageMetricCard({
  label,
  value,
  caption,
  icon,
  tone,
}: UsageMetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 truncate text-2xl font-black text-foreground">
            {value}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {caption}
          </p>
        </div>
        <div className={`rounded-lg border p-2 ${tone}`}>{icon}</div>
      </div>
    </div>
  );
}

function MiniBar({
  label,
  value,
  max,
  failed,
}: {
  label: string;
  value: number;
  max: number;
  failed: number;
}) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  const hasFailures = failed > 0;

  return (
    <div className="grid grid-cols-[82px_1fr_64px] items-center gap-3 text-xs">
      <span className="truncate font-medium text-muted-foreground">
        {label}
      </span>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${hasFailures ? "bg-amber-500" : "bg-primary"}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-right font-semibold text-foreground">
        {formatNumber(value)}
      </span>
    </div>
  );
}

/**
 * Organization usage dashboard for consumer-capable workspaces.
 */
export default function OrgUsagePage() {
  const { org, can } = useOrgContext();
  const [summary, setSummary] = useState<OrganizationUsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!org) return;

    const fetchUsage = async () => {
      setIsLoading(true);
      try {
        setSummary(await getOrganizationUsageSummary(org.id));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load usage",
        );
      } finally {
        setIsLoading(false);
      }
    };

    Promise.resolve().then(fetchUsage);
  }, [org]);

  const daily = useMemo(() => summary?.daily.slice(-14) ?? [], [summary]);
  const monthly = useMemo(() => summary?.monthly.slice(-6) ?? [], [summary]);
  const maxDaily = Math.max(...daily.map((item) => item.requests), 0);
  const maxMonthly = Math.max(...monthly.map((item) => item.requests), 0);
  const canUseUsage =
    !!org &&
    (org.type === OrgType.CONSUMER || org.type === OrgType.HYBRID) &&
    can(OrgAction.VIEW_USAGE);
  const canSeeKeyBreakdown =
    summary?.scope === "FULL" || summary?.scope === "OPERATIONAL";

  if (!org) return null;

  if (!canUseUsage) {
    return (
      <div className="mx-auto max-w-4xl rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">
              Usage is not available
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              This area is available for consumer-capable organization
              workspaces.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">
              Usage Tracking
            </h1>
            {summary && (
              <span className="rounded-md border border-border bg-card px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
                {summary.scope.toLowerCase()}
              </span>
            )}
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Project requests, model consumption, API key activity, and spend
            signals for this organization.
          </p>
        </div>
        <Link
          href={`/orgs/${org.slug}/projects`}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          <FolderKanban className="h-3.5 w-3.5" strokeWidth={1.8} />
          Projects
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2
            className="h-6 w-6 animate-spin text-muted-foreground"
            strokeWidth={1.5}
          />
        </div>
      ) : !summary ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold text-foreground">
            Usage could not be loaded
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Refresh the page to try again.
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <UsageMetricCard
              label="Requests"
              value={formatNumber(summary.totals.requests)}
              caption={`${formatNumber(summary.totals.successfulRequests)} successful requests`}
              icon={<Activity className="h-4 w-4" strokeWidth={1.8} />}
              tone="border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300"
            />
            <UsageMetricCard
              label="Credits Used"
              value={formatCredits(summary.totals.creditsCharged)}
              caption="Total organization consumer spend"
              icon={<Coins className="h-4 w-4" strokeWidth={1.8} />}
              tone="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            />
            <UsageMetricCard
              label="Error Rate"
              value={`${summary.totals.errorRate}%`}
              caption={`${formatNumber(summary.totals.failedRequests)} failed requests`}
              icon={<AlertTriangle className="h-4 w-4" strokeWidth={1.8} />}
              tone="border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
            />
            <UsageMetricCard
              label="Last Used"
              value={formatDate(summary.totals.lastUsedAt)}
              caption="Most recent model request"
              icon={<Clock className="h-4 w-4" strokeWidth={1.8} />}
              tone="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    Daily Usage
                  </p>
                  <h2 className="mt-1 text-base font-bold text-foreground">
                    Last 14 days
                  </h2>
                </div>
                <BarChart3 className="h-4 w-4 text-primary" strokeWidth={1.8} />
              </div>
              <div className="mt-5 space-y-3">
                {daily.length > 0 ? (
                  daily.map((item) => (
                    <MiniBar
                      key={item.date}
                      label={new Date(item.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      value={item.requests}
                      max={maxDaily}
                      failed={item.failedRequests}
                    />
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No daily usage recorded yet.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    Monthly Usage
                  </p>
                  <h2 className="mt-1 text-base font-bold text-foreground">
                    Recent months
                  </h2>
                </div>
                <Coins className="h-4 w-4 text-primary" strokeWidth={1.8} />
              </div>
              <div className="mt-5 space-y-3">
                {monthly.length > 0 ? (
                  monthly.map((item) => (
                    <MiniBar
                      key={item.month}
                      label={item.month}
                      value={item.requests}
                      max={maxMonthly}
                      failed={item.failedRequests}
                    />
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No monthly usage recorded yet.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    Projects
                  </p>
                  <h2 className="mt-1 text-base font-bold text-foreground">
                    Usage by project
                  </h2>
                </div>
                <FolderKanban
                  className="h-4 w-4 text-primary"
                  strokeWidth={1.8}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="border-b border-border bg-secondary/40">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Project
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Requests
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Credits
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Errors
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Last Used
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.projects.map((project) => (
                      <tr
                        key={project.id}
                        className="border-b border-border/70 last:border-0"
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">
                          {project.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {formatNumber(project.requests)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {formatCredits(project.creditsCharged)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {project.errorRate}%
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(project.lastUsedAt)}
                        </td>
                      </tr>
                    ))}
                    {summary.projects.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-sm text-muted-foreground"
                        >
                          No project usage recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    Models
                  </p>
                  <h2 className="mt-1 text-base font-bold text-foreground">
                    Usage by model
                  </h2>
                </div>
                <Layers className="h-4 w-4 text-primary" strokeWidth={1.8} />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="border-b border-border bg-secondary/40">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Model
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Requests
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Credits
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Latency
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Errors
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.models.map((model) => (
                      <tr
                        key={model.id}
                        className="border-b border-border/70 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-foreground">
                            {model.name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {model.framework} · {model.type}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {formatNumber(model.requests)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {formatCredits(model.creditsCharged)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {model.averageLatencyMs}ms
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {model.errorRate}%
                        </td>
                      </tr>
                    ))}
                    {summary.models.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-sm text-muted-foreground"
                        >
                          No model usage recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  API Keys
                </p>
                <h2 className="mt-1 text-base font-bold text-foreground">
                  Usage by API key
                </h2>
              </div>
              <KeyRound className="h-4 w-4 text-primary" strokeWidth={1.8} />
            </div>
            {!canSeeKeyBreakdown ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Limited usage visibility
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  API key breakdown is available to organization owners and
                  maintainers.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="border-b border-border bg-secondary/40">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Key
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Project
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Requests
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Credits
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Errors
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                        Last Used
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.apiKeys.map((apiKey) => (
                      <tr
                        key={apiKey.id}
                        className="border-b border-border/70 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-foreground">
                            {apiKey.label}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            {apiKey.keyPrefix}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {apiKey.projectName}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {formatNumber(apiKey.requests)}
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">
                          {formatCredits(apiKey.creditsCharged)}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {apiKey.errorRate}%
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(apiKey.lastUsedAt)}
                        </td>
                      </tr>
                    ))}
                    {summary.apiKeys.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-8 text-center text-sm text-muted-foreground"
                        >
                          No API key usage recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
