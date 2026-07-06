"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  FolderKanban,
  Layers,
  Users,
  CreditCard,
  Settings,
  ChevronLeft,
  Activity,
  BarChart3,
  GitCompareArrows,
} from "lucide-react";
import { useOrgContext } from "@/hooks/use-org-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { OrgType, OrgAction } from "@/types";
import OrgTypeBadge from "./OrgTypeBadge";
import { getOrgRoleMeta } from "@/lib/org-role-meta";

interface OrgSidebarLinkProps {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Individual org sidebar navigation link with active left-indicator.
 */
function OrgSidebarLink({ href, active, icon, children }: OrgSidebarLinkProps) {
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg font-medium transition-all text-sm select-none ${
        active
          ? "bg-primary/[0.06] text-primary font-semibold shadow-xs"
          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
      }`}
    >
      {active && (
        <span className="absolute left-1 top-2.5 bottom-2.5 w-0.5 rounded-full bg-primary" />
      )}
      <span
        className={`transition-colors ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
      >
        {icon}
      </span>
      {children}
    </Link>
  );
}

/**
 * RBAC-aware org portal sidebar.
 * Shows/hides nav links based on the user's role and the org's type.
 *
 * - OWNER: sees all links
 * - MAINTAINER: sees all except Billing + Settings
 * - CONTRIBUTOR: sees operational projects/models without management pages
 * - VIEWER: sees read-only project/model monitoring
 *
 * - PROVIDER/HYBRID orgs: shows Models link
 * - CONSUMER/HYBRID orgs: shows Projects link
 *
 * @returns The React sidebar component.
 */
export default function OrgSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { org, can, myRole } = useOrgContext();
  const { switchToPersonalWorkspace } = useWorkspace();

  if (!org) return null;

  const handleReturnToDeveloperMode = async () => {
    await switchToPersonalWorkspace();
    router.push("/dashboard");
  };

  const base = `/orgs/${org.slug}`;
  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  const showProjects =
    (org.type === OrgType.CONSUMER || org.type === OrgType.HYBRID) &&
    can(OrgAction.VIEW_PROJECTS);
  const showModels =
    (org.type === OrgType.PROVIDER || org.type === OrgType.HYBRID) &&
    can(OrgAction.VIEW_MODELS);
  const showUsage =
    (org.type === OrgType.CONSUMER || org.type === OrgType.HYBRID) &&
    can(OrgAction.VIEW_USAGE);
  const showCompareModels =
    (org.type === OrgType.CONSUMER || org.type === OrgType.HYBRID) &&
    can(OrgAction.VIEW_USAGE);
  const orgModeLabel =
    org.type === OrgType.HYBRID
      ? "Consume + Publish"
      : org.type === OrgType.CONSUMER
        ? "Consumer Workspace"
        : "Provider Workspace";

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-screen shrink-0 relative z-30 font-sans">
      {/* Org Header */}
      <div className="px-4 py-4 border-b border-border space-y-3">
        <div className="flex items-center gap-3 min-w-0">
          {org.avatarUrl ? (
            <img
              src={org.avatarUrl}
              alt={`${org.name} logo`}
              className="h-8 w-8 rounded-lg border border-primary/20 object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary font-extrabold text-sm flex items-center justify-center shrink-0">
              {org.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col overflow-hidden min-w-0">
            <span className="text-sm font-semibold text-foreground truncate leading-none">
              {org.name}
            </span>
            <div className="mt-1">
              <OrgTypeBadge type={org.type} size="xs" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2.5">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
            Workspace Mode
          </p>
          <p className="text-xs font-semibold text-foreground mt-0.5">
            {orgModeLabel}
          </p>
          {myRole && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Your role: {getOrgRoleMeta(myRole, org.type).longLabel}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-3 py-2 text-emerald-700 dark:text-emerald-300">
          <Activity className="h-3.5 w-3.5" strokeWidth={1.8} />
          <span className="text-[11px] font-semibold">
            Operational workspace
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
        <p className="px-3.5 py-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
          Organization
        </p>

        <OrgSidebarLink
          href={`${base}/overview`}
          active={isActive(`${base}/overview`)}
          icon={<LayoutGrid className="w-4 h-4" strokeWidth={1.5} />}
        >
          Overview
        </OrgSidebarLink>

        {showProjects && (
          <OrgSidebarLink
            href={`${base}/projects`}
            active={isActive(`${base}/projects`)}
            icon={<FolderKanban className="w-4 h-4" strokeWidth={1.5} />}
          >
            Projects
          </OrgSidebarLink>
        )}

        {showModels && (
          <OrgSidebarLink
            href={`${base}/models`}
            active={isActive(`${base}/models`)}
            icon={<Layers className="w-4 h-4" strokeWidth={1.5} />}
          >
            Models Registry
          </OrgSidebarLink>
        )}

        {showUsage && (
          <OrgSidebarLink
            href={`${base}/usage`}
            active={isActive(`${base}/usage`)}
            icon={<BarChart3 className="w-4 h-4" strokeWidth={1.5} />}
          >
            Usage Tracking
          </OrgSidebarLink>
        )}

        {showCompareModels && (
          <OrgSidebarLink
            href={`${base}/compare-models`}
            active={isActive(`${base}/compare-models`)}
            icon={<GitCompareArrows className="w-4 h-4" strokeWidth={1.5} />}
          >
            Compare Models
          </OrgSidebarLink>
        )}

        {can(OrgAction.INVITE_MEMBERS) && (
          <>
            <div className="mx-3.5 my-2 h-px bg-border/60" />
            <p className="px-3.5 py-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              Management
            </p>
            <OrgSidebarLink
              href={`${base}/members`}
              active={isActive(`${base}/members`)}
              icon={<Users className="w-4 h-4" strokeWidth={1.5} />}
            >
              Members
            </OrgSidebarLink>
          </>
        )}

        {can(OrgAction.VIEW_BILLING) && (
          <OrgSidebarLink
            href={`${base}/billing`}
            active={isActive(`${base}/billing`)}
            icon={<CreditCard className="w-4 h-4" strokeWidth={1.5} />}
          >
            {org.type === OrgType.PROVIDER ? "Provider Finance" : "Billing"}
          </OrgSidebarLink>
        )}

        {can(OrgAction.EDIT_SETTINGS) && (
          <OrgSidebarLink
            href={`${base}/settings`}
            active={isActive(`${base}/settings`)}
            icon={<Settings className="w-4 h-4" strokeWidth={1.5} />}
          >
            Settings
          </OrgSidebarLink>
        )}
      </div>

      {/* Back to personal dashboard */}
      <div className="p-3 border-t border-border">
        <button
          type="button"
          onClick={handleReturnToDeveloperMode}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all font-semibold"
          title="Return to Developer Mode"
        >
          <ChevronLeft className="w-3.5 h-3.5" strokeWidth={2} />
          Return to Developer Mode
        </button>
      </div>
    </div>
  );
}
