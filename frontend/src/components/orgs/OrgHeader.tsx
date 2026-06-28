"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Bell, HelpCircle, LayoutGrid, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrgContext } from "@/hooks/use-org-context";
import OrgTypeBadge from "./OrgTypeBadge";
import { getOrgRoleMeta } from "@/lib/org-role-meta";

/**
 * Top navigation bar for the organization console.
 *
 * @returns The organization dashboard header.
 */
export default function OrgHeader() {
  const pathname = usePathname();
  const { org, myRole } = useOrgContext();

  if (!org) {
    return null;
  }

  const currentArea = pathname.split("/").filter(Boolean).at(-1) ?? "overview";
  const normalizedArea = currentArea.replace(/-/g, " ");
  const roleMeta = myRole ? getOrgRoleMeta(myRole, org.type) : null;

  return (
    <div className="h-16 bg-card/95 backdrop-blur border-b border-border flex items-center justify-between px-4 sm:px-6 shrink-0 relative z-20 font-sans">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 h-8 px-2.5 rounded-lg border border-border bg-background text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
          title="Return to Developer Mode"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.8} />
          <span className="hidden sm:inline">Developer Mode</span>
        </Link>
        <div className="hidden md:flex items-center gap-2 min-w-0">
          <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.6} />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide truncate">
            {org.name} / {normalizedArea}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden lg:flex h-9 w-[280px] items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" strokeWidth={1.7} />
          <span className="truncate">Search models, projects, members</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg border border-border bg-background">
          <OrgTypeBadge type={org.type} size="xs" />
          {roleMeta && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase">
              <ShieldCheck className="h-3 w-3" strokeWidth={1.7} />
              {roleMeta.shortLabel}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
          <Bell className="w-3.5 h-3.5" strokeWidth={1.6} />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
          <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.6} />
        </Button>
      </div>
    </div>
  );
}
