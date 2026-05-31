"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutGrid,
  Layers,
  Settings,
  BookOpen,
  HelpCircle,
  LogOut,
  ChevronDown,
  Plus,
  TrendingUp,
  Coins,
} from "lucide-react";
import { useWorkspace, Workspace } from "@/hooks/use-workspace";
import { OwnerType, WalletType } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Platform navigation Sidebar component.
 * Integrates Shadcn Dropdown switcher for workspaces, dual role layout toggles,
 * and active status details.
 *
 * @returns The React component rendering the sidebar.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const {
    activeWorkspace,
    workspaces,
    viewMode,
    balance,
    isProviderModeEnabled,
    setActiveWorkspace,
    setViewMode,
  } = useWorkspace();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  const linkClass = (path: string) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
      isActive(path)
        ? "bg-primary/10 text-primary font-semibold"
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
    }`;

  const getWorkspaceInitials = (name: string) => {
    return name.replace(/\(Personal\)/gi, "").trim().substring(0, 2).toUpperCase();
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-screen shrink-0 relative z-30">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2.5 text-primary font-bold text-lg tracking-tight">
          <div className="w-9 h-9 relative flex items-center justify-center shrink-0">
            <Image
              src="/logo.png"
              alt="MLHub Logo"
              width={34}
              height={34}
              className="object-contain"
              style={{ width: "auto" }}
            />
          </div>
          <span className="font-mono text-lg font-extrabold text-foreground tracking-tight">MLHub</span>
        </Link>
      </div>

      {/* Workspace Switcher */}
      <div className="px-4 py-4 border-b border-border">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center justify-between p-2.5 h-auto rounded-lg border border-border bg-background hover:bg-accent hover:text-foreground transition-all cursor-pointer text-left focus:outline-none text-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center shrink-0">
                {activeWorkspace ? getWorkspaceInitials(activeWorkspace.name) : "ML"}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-foreground truncate leading-snug">
                  {activeWorkspace ? activeWorkspace.name : "Loading..."}
                </span>
                <span className="text-[9px] text-primary font-bold tracking-wider uppercase mt-0.5">
                  {activeWorkspace?.type === OwnerType.USER ? "Personal Account" : `Org • ${activeWorkspace?.role}`}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-auto" />
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56 mt-2 bg-card border border-border shadow-xl rounded-lg p-1.5 flex flex-col gap-1 max-h-[240px] overflow-y-auto z-40 text-foreground">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-2.5 py-1.5">
                Switch Workspaces
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border my-0.5" />
              {workspaces.map((ws: Workspace) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => setActiveWorkspace(ws)}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left text-xs transition-colors hover:bg-accent cursor-pointer ${
                    activeWorkspace?.id === ws.id ? "bg-primary/10 font-semibold" : ""
                  }`}
                >
                  <div className="w-6 h-6 rounded bg-muted text-muted-foreground font-bold text-[10px] flex items-center justify-center shrink-0">
                    {getWorkspaceInitials(ws.name)}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-foreground font-medium truncate">{ws.name}</span>
                    <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                      {ws.type === OwnerType.USER ? "Personal" : ws.role}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border my-1" />
            <DropdownMenuItem className="p-0">
              <Link
                href="/workspaces/create"
                className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create Organization
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Role view toggle (Consumer Mode vs Provider Mode) */}
      {isProviderModeEnabled && (
        <div className="px-4 py-3 border-b border-border bg-accent/20 flex flex-col gap-2">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Active View Mode</p>
          <div className="flex bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode(WalletType.CONSUMER)}
              className={`flex-1 py-1 px-2.5 rounded-md text-[10px] font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === WalletType.CONSUMER
                  ? "bg-background text-primary shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Coins className="w-3.5 h-3.5" /> Consumer
            </button>
            <button
              onClick={() => setViewMode(WalletType.PROVIDER)}
              className={`flex-1 py-1 px-2.5 rounded-md text-[10px] font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === WalletType.PROVIDER
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Provider
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 py-4 px-3 flex flex-col gap-1">
        <Link href="/" className={linkClass("/")}>
          <LayoutGrid className="w-5 h-5" />
          Dashboard
        </Link>

        {viewMode === WalletType.PROVIDER && (
          <Link href="/models" className={linkClass("/models")}>
            <Layers className="w-5 h-5" />
            Models Registry
          </Link>
        )}

        <Link href="/settings" className={linkClass("/settings")}>
          <Settings className="w-5 h-5" />
          Settings
        </Link>
      </div>

      <div className="px-6 pb-6">
        {viewMode === WalletType.PROVIDER ? (
          <Link href="/models/upload" className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg font-medium transition-all w-full shadow-sm text-sm">
            + Deploy Model
          </Link>
        ) : (
          <div className="border border-border rounded-xl p-3 bg-background text-center flex flex-col gap-2">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Credits Ledger</p>
              <p className="text-lg font-bold text-foreground">${balance.toFixed(2)}</p>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center justify-center gap-1 py-1.5 px-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Top Up
            </Link>
          </div>
        )}
      </div>

      {/* Footer Links */}
      <div className="p-4 border-t border-border flex flex-col gap-1">
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full text-left cursor-pointer text-sm">
          <BookOpen className="w-5 h-5" />
          Documentation
        </button>
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full text-left cursor-pointer text-sm">
          <HelpCircle className="w-5 h-5" />
          Support
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-red-400 hover:bg-red-950/20 transition-colors w-full text-left mt-2 cursor-pointer text-sm"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
