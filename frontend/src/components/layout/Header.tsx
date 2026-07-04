"use client";

import React, { useState, useEffect } from "react";
import { Bell, HelpCircle, Coins, TrendingUp, Sun, Moon, Menu, Search, BookOpen, Keyboard, LifeBuoy } from "lucide-react";
import { usePathname } from "next/navigation";
import { Session } from "next-auth";
import Image from "next/image";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { WalletType } from "@/types";

interface HeaderProps {
  session: Session | null;
  /** Opens the mobile navigation drawer. Only rendered/used below the lg breakpoint. */
  onMenuClick: () => void;
  /** Opens the global command palette (also reachable via Ctrl/Cmd+K). */
  onSearchClick: () => void;
}

/**
 * Human-readable labels for known route segments, used to build breadcrumbs
 * for routes not covered by the small set of hand-authored special cases below.
 */
const ROUTE_SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  models: "Models",
  upload: "Upload",
  pipelines: "Pipelines",
  settings: "Settings",
  profile: "Profile & Role",
  billing: "Billing & Wallet",
  api: "API Credentials",
  "mcp-tokens": "MCP Access Tokens",
  admin: "Admin Console",
  users: "Users",
  deployments: "Deployments",
  fraud: "Fraud Review",
  alerts: "Alerts",
  config: "Configuration",
  mcp: "MCP",
  orgs: "Organizations",
  overview: "Overview",
  members: "Members",
  projects: "Projects",
  usage: "Usage",
  workspaces: "Workspaces",
  create: "Create",
  explore: "Explore",
  provider: "Provider",
  subscriptions: "Subscriptions",
  payments: "Subscription Payments",
};

/**
 * Builds a breadcrumb string from the current pathname, prefixed with the
 * active workspace name. Falls back to a title-cased version of any segment
 * not present in {@link ROUTE_SEGMENT_LABELS} (e.g. dynamic `[id]` segments),
 * so every route gets a sensible breadcrumb instead of only a hardcoded few.
 *
 * @param pathname - The current Next.js pathname (e.g. `/settings/billing`).
 * @param workspaceName - The active workspace's display name, or a placeholder.
 * @returns A slash-separated breadcrumb string.
 */
function buildBreadcrumb(pathname: string, workspaceName: string): string {
  if (pathname === "/") {
    return "Marketplace";
  }

  const segments = pathname.split("/").filter(Boolean);
  const labels = segments.map((segment) => {
    if (ROUTE_SEGMENT_LABELS[segment]) {
      return ROUTE_SEGMENT_LABELS[segment];
    }
    // Looks like an id/slug segment (uuid, numeric, or org slug) — skip it,
    // the parent segment already conveys the section.
    if (/^[0-9a-f-]{6,}$/i.test(segment) || /^\d+$/.test(segment)) {
      return null;
    }
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  }).filter((label): label is string => Boolean(label));

  const isWorkspaceScoped = !["explore", "orgs", "workspaces"].includes(segments[0]);
  return isWorkspaceScoped ? [workspaceName, ...labels].join(" / ") : labels.join(" / ");
}

/**
 * Top platform Header component.
 * Integrates breadcrumbs matching the active workspace, a mobile navigation
 * trigger, a command palette launcher, functional notification/help menus,
 * and live wallet status pill meters. Refined in the Expo Go developer console style.
 *
 * @param props - Session context plus mobile menu / command palette handlers.
 * @returns The React component rendering the header.
 */
export default function Header({ session, onMenuClick, onSearchClick }: HeaderProps) {
  const pathname = usePathname();
  const { activeWorkspace, viewMode, balance, canAccessBilling } = useWorkspace();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      setMounted(true);
      const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
      if (savedTheme) {
        setTheme(savedTheme);
      }
    });
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  const breadcrumb = buildBreadcrumb(pathname, activeWorkspace ? activeWorkspace.name : "Workspace");

  const userEmail = session?.user?.email || "User";
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    userEmail
  )}&background=4630eb&color=fff`;

  return (
    <div className="h-14 bg-card border-b border-border flex items-center justify-between gap-3 px-4 sm:px-6 shrink-0 relative z-20 font-sans">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile navigation trigger */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden text-muted-foreground hover:text-foreground cursor-pointer h-8 w-8 hover:bg-secondary rounded-lg transition-colors -ml-1"
          title="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
        </Button>

        {/* Breadcrumb path */}
        <div className="font-semibold text-muted-foreground tracking-wide text-[10px] hidden md:block uppercase truncate">
          {breadcrumb}
        </div>

        {/* Command palette launcher */}
        <button
          type="button"
          onClick={onSearchClick}
          className="hidden sm:flex items-center gap-2 px-2.5 h-8 rounded-lg border border-border bg-background/50 text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors text-xs cursor-pointer ml-1"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Search or jump to...</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-mono font-semibold text-muted-foreground">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Mobile-only search trigger (icon only) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onSearchClick}
          className="sm:hidden text-muted-foreground hover:text-foreground cursor-pointer h-8 w-8 hover:bg-secondary rounded-lg transition-colors"
          title="Search"
        >
          <Search className="w-3.5 h-3.5" />
        </Button>

        {/* Wallet stats badge */}
        {activeWorkspace && canAccessBilling && (
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold select-none ${
            viewMode === WalletType.PROVIDER
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-primary/10 border-primary/20 text-primary"
          }`}>
            {viewMode === WalletType.PROVIDER ? (
              <>
                <TrendingUp className="w-3 h-3" />
                <span>Earnings: ${balance.toFixed(2)}</span>
              </>
            ) : (
              <>
                <Coins className="w-3 h-3" />
                <span>Credits: {Math.round(balance)}</span>
              </>
            )}
          </div>
        )}

        {/* Theme toggler */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground cursor-pointer h-8 w-8 hover:bg-secondary rounded-lg transition-colors"
          title={!mounted || theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {!mounted || theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer h-8 w-8 hover:bg-secondary rounded-lg transition-colors outline-none"
            title="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="end">
            <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2.5 py-1.5">
              Notifications
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <EmptyState
              icon={<Bell />}
              title="You're all caught up"
              description="Deployment, billing, and pipeline alerts will show up here as they happen."
              className="py-8"
            />
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help & shortcuts */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer h-8 w-8 hover:bg-secondary rounded-lg transition-colors outline-none"
            title="Help"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2.5 py-1.5">
              Help & Resources
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-xs cursor-pointer">
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
              Documentation
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={onSearchClick}>
              <Keyboard className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
              Keyboard shortcuts
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs cursor-pointer">
              <LifeBuoy className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
              Contact support
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User profile avatar */}
        <div className="w-7 h-7 rounded-full bg-muted overflow-hidden border border-border ml-1 cursor-pointer shrink-0" title={userEmail}>
          <Image
            src={avatarUrl}
            alt="User avatar"
            width={28}
            height={28}
          />
        </div>
      </div>
    </div>
  );
}
