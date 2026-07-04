"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";

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

  const fetchUsage = useCallback(async () => {
    if (!org) return;
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
  }, [org]);

  useEffect(() => {
    Promise.resolve().then(fetchUsage);
  }, [fetchUsage]);

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
      <PageHeader
        title={
          <>
            Usage Tracking
            {summary && (
              <span className="rounded-md border border-border bg-card px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
                {summary.scope.toLowerCase()}
              </span>
            )}
          </>
        }
        description="Project requests, model consumption, API key activity, and spend signals for this organization."
        className="mb-0"
        actions={
          <Link
            href={`/orgs/${org.slug}/projects`}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <FolderKanban className="h-3.5 w-3.5" strokeWidth={1.8} />
            Projects
          </Link>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2
            className="h-6 w-6 animate-spin text-muted-foreground"
            strokeWidth={1.5}
          />
        </div>
      ) : !summary ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icon={<AlertTriangle />}
            title="Usage could not be loaded"
            description="Something went wrong fetching usage data for this organization."
            action={
              <Button variant="outline" size="sm" onClick={() => fetchUsage()}>
                Try again
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Requests"
              value={formatNumber(summary.totals.requests)}
              caption={`${formatNumber(summary.totals.successfulRequests)} successful requests`}
              icon={<Activity />}
              tone="primary"
            />
            <StatCard
              label="Credits Used"
              value={formatCredits(summary.totals.creditsCharged)}
              caption="Total organization consumer spend"
              icon={<Coins />}
              tone="warning"
            />
            <StatCard
              label="Error Rate"
              value={`${summary.totals.errorRate}%`}
              caption={`${formatNumber(summary.totals.failedRequests)} failed requests`}
              icon={<AlertTriangle />}
              tone="danger"
            />
            <StatCard
              label="Last Used"
              value={formatDate(summary.totals.lastUsedAt)}
              caption="Most recent model request"
              icon={<Clock />}
              tone="success"
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
