"use client";

import React from "react";
import { GitPullRequestArrow, ShieldCheck, Workflow } from "lucide-react";
import UploadModelWizard from "@/components/models/UploadModelWizard";
import { useOrgContext } from "@/hooks/use-org-context";
import { OrgAction } from "@/types";

/**
 * Organization-scoped model upload page.
 */
export default function OrgModelUploadPage() {
  const { org, can } = useOrgContext();

  if (!org) return null;

  if (!can(OrgAction.UPLOAD_MODEL)) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="text-base font-bold text-foreground">Upload access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your organization role can view provider models, but cannot submit model versions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Submit Model Version</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Upload artifacts into {org.name}. New versions enter maintainer review before build and marketplace verification.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { label: "Submit", icon: <GitPullRequestArrow className="h-3.5 w-3.5" /> },
            { label: "Review", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
            { label: "Build", icon: <Workflow className="h-3.5 w-3.5" /> },
          ].map((item) => (
            <div key={item.label} className="flex h-8 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-muted-foreground">
              {item.icon}
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <UploadModelWizard
        cancelHref={`/orgs/${org.slug}/models`}
        successRedirect={() => `/orgs/${org.slug}/models`}
      />
    </div>
  );
}
