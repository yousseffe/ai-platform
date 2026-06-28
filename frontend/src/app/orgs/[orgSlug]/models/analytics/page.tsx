"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { ArrowLeft, BarChart3, CheckCircle2, Clock3, ShieldCheck, TrendingUp, Users, XCircle } from "lucide-react";
import { useOrgContext } from "@/hooks/use-org-context";
import { getOrganizationModelAnalytics, OrganizationModelAnalytics } from "@/lib/services/models.service";
import { OrgAction } from "@/types";

/**
 * Provider organization decision analytics.
 */
export default function OrgModelAnalyticsPage() {
  const { org, can } = useOrgContext();
  const [analytics, setAnalytics] = useState<OrganizationModelAnalytics | null>(null);

  useEffect(() => {
    if (!org || (!can(OrgAction.DEPLOY_MODEL) && !can(OrgAction.EDIT_SETTINGS))) return;
    Promise.resolve().then(async () => {
      try {
        setAnalytics(await getOrganizationModelAnalytics(org.id));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load provider analytics");
      }
    });
  }, [org, can]);

  if (!org) return null;

  if (!can(OrgAction.DEPLOY_MODEL) && !can(OrgAction.EDIT_SETTINGS)) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-base font-bold text-foreground">Owner or maintainer access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Provider decision analytics includes revenue, release risk, and production governance data.
        </p>
      </div>
    );
  }

  const totals = analytics?.totals;
  const metrics = [
    { label: "Provider Revenue", value: `${(totals?.totalEarnings ?? 0).toLocaleString()} cr`, icon: <TrendingUp className="h-4 w-4" />, tone: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" },
    { label: "Models", value: totals?.models ?? 0, icon: <BarChart3 className="h-4 w-4" />, tone: "text-primary bg-primary/10 border-primary/20" },
    { label: "Pending Reviews", value: totals?.pendingReviews ?? 0, icon: <Clock3 className="h-4 w-4" />, tone: "text-amber-700 bg-amber-500/10 border-amber-500/20" },
    { label: "Production", value: totals?.runningDeployments ?? 0, icon: <CheckCircle2 className="h-4 w-4" />, tone: "text-blue-700 bg-blue-500/10 border-blue-500/20" },
    { label: "Release Loss Risk", value: totals?.declinedVersions ?? 0, icon: <XCircle className="h-4 w-4" />, tone: "text-red-700 bg-red-500/10 border-red-500/20" },
    { label: "Verified Models", value: totals?.marketplaceVerified ?? 0, icon: <ShieldCheck className="h-4 w-4" />, tone: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20" },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="border-b border-border pb-5">
        <Link href={`/orgs/${org.slug}/models`} className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Provider models
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Provider Decision Analytics</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Owner and maintainer dashboard for revenue, release risk, production readiness, and member contribution in {org.name}.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-border bg-card p-4">
            <div className={`mb-4 inline-flex rounded-lg border p-2 ${metric.tone}`}>{metric.icon}</div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-2xl font-black text-foreground">{metric.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Member contribution</h2>
            </div>
          </div>
          <div className="divide-y divide-border">
            {(analytics?.byUploader ?? []).map((member) => (
              <div key={member.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4">
                <p className="truncate text-sm font-semibold text-foreground">{member.name}</p>
                <span className="text-xs font-bold text-muted-foreground">{member.models} models</span>
                <span className="text-xs font-bold text-muted-foreground">{member.versions} versions</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-bold text-foreground">Recent version activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Model</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Version</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Review</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Uploader</th>
                </tr>
              </thead>
              <tbody>
                {(analytics?.recentVersions ?? []).map((version) => (
                  <tr key={version.versionId} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 text-sm font-semibold text-foreground">{version.modelName}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">v{version.versionNumber}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{version.reviewStatus}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{version.uploadedBy || "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
