"use client";

import React, { useEffect } from "react";
import OrgSidebar from "./OrgSidebar";
import OrgHeader from "./OrgHeader";
import { useOrgContext } from "@/hooks/use-org-context";
import { Loader2, AlertTriangle } from "lucide-react";
import { OrgType, WalletType } from "@/types";

interface OrgShellProps {
  slug: string;
  children: React.ReactNode;
}

/**
 * Shell component for the Organization portal layout.
 * Loads org context (org details + user's role) on mount and renders
 * the RBAC-aware sidebar alongside the page content.
 * Shows loading/error states as needed.
 *
 * @param slug - Organization slug from URL params.
 * @param children - Page content from nested routes.
 * @returns The org portal shell layout.
 */
export default function OrgShell({ slug, children }: OrgShellProps) {
  const { loadOrg, reset, isLoading, error, org } = useOrgContext();

  useEffect(() => {
    loadOrg(slug);
    return () => reset();
  }, [slug, loadOrg, reset]);

  useEffect(() => {
    if (!org || typeof document === "undefined") return;

    document.cookie = `activeWorkspaceId=${org.id}; path=/; max-age=31536000; SameSite=Strict`;
    if (org.type === OrgType.PROVIDER || org.type === OrgType.HYBRID) {
      document.cookie = `viewMode=${WalletType.PROVIDER}; path=/; max-age=31536000; SameSite=Strict`;
    }
  }, [org]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-primary animate-spin" strokeWidth={1.5} />
          <span className="text-sm text-muted-foreground font-mono">Loading organization...</span>
        </div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" strokeWidth={1.5} />
          </div>
          <h2 className="text-base font-semibold text-foreground">Organization not found</h2>
          <p className="text-sm text-muted-foreground">
            {error ?? "You may not be a member of this organization or it does not exist."}
          </p>
          <a href="/dashboard" className="mt-2 text-sm text-primary font-medium hover:underline">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <OrgSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[linear-gradient(180deg,hsl(var(--muted)/0.32)_0%,hsl(var(--background))_240px)]">
        <OrgHeader />
        <main className="flex-1 overflow-y-auto animate-fade-in">
          <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
