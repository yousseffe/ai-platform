"use client";

import React from "react";
import Link from "next/link";
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
        ? "bg-primary-50 text-primary-600"
        : "text-slate-600 hover:bg-slate-50"
    }`;

  const getWorkspaceInitials = (name: string) => {
    return name.replace(/\(Personal\)/gi, "").trim().substring(0, 2).toUpperCase();
  };

  return (
    <div className="w-64 bg-sidebar border-r border-slate-200 flex flex-col h-screen shrink-0 relative z-30">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2 text-primary-600 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          ModelOps AI
        </Link>
      </div>

      {/* Workspace Switcher */}
      <div className="px-4 py-4 border-b border-slate-100">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center justify-between p-2.5 h-auto rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer text-left focus:outline-none">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {activeWorkspace ? getWorkspaceInitials(activeWorkspace.name) : "MO"}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-slate-800 truncate leading-snug">
                  {activeWorkspace ? activeWorkspace.name : "Loading..."}
                </span>
                <span className="text-[9px] text-indigo-500 font-bold tracking-wider uppercase mt-0.5">
                  {activeWorkspace?.type === OwnerType.USER ? "Personal Account" : `Org • ${activeWorkspace?.role}`}
                </span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-auto" />
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56 mt-2 bg-white border border-slate-200 shadow-xl rounded-xl p-1.5 flex flex-col gap-1 max-h-[240px] overflow-y-auto z-40">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1.5">
                Switch Workspaces
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100 my-0.5" />
              {workspaces.map((ws: Workspace) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => setActiveWorkspace(ws)}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left text-xs transition-colors hover:bg-slate-50 cursor-pointer ${
                    activeWorkspace?.id === ws.id ? "bg-indigo-50/50 font-semibold" : ""
                  }`}
                >
                  <div className="w-6 h-6 rounded bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {getWorkspaceInitials(ws.name)}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-slate-800 font-medium truncate">{ws.name}</span>
                    <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">
                      {ws.type === OwnerType.USER ? "Personal" : ws.role}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-slate-100 my-1" />
            <DropdownMenuItem className="p-0">
              <Link
                href="/workspaces/create"
                className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs font-semibold text-primary-600 hover:bg-indigo-50/30 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create Organization
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Role view toggle (Consumer Mode vs Provider Mode) */}
      {isProviderModeEnabled && (
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-2">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active View Mode</p>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode(WalletType.CONSUMER)}
              className={`flex-1 py-1 px-2.5 rounded-md text-[10px] font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === WalletType.CONSUMER
                  ? "bg-white text-primary-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Coins className="w-3.5 h-3.5" /> Consumer
            </button>
            <button
              onClick={() => setViewMode(WalletType.PROVIDER)}
              className={`flex-1 py-1 px-2.5 rounded-md text-[10px] font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === WalletType.PROVIDER
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
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
          <Link href="/models/upload" className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-all w-full shadow-sm shadow-primary-500/20 text-sm">
            + Deploy Model
          </Link>
        ) : (
          <div className="border border-slate-200 rounded-xl p-3 bg-white text-center flex flex-col gap-2">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Credits Ledger</p>
              <p className="text-lg font-bold text-slate-800">${balance.toFixed(2)}</p>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center justify-center gap-1 py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Top Up
            </Link>
          </div>
        )}
      </div>

      {/* Footer Links */}
      <div className="p-4 border-t border-slate-100 flex flex-col gap-1">
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-slate-500 hover:bg-slate-50 transition-colors w-full text-left cursor-pointer text-sm">
          <BookOpen className="w-5 h-5" />
          Documentation
        </button>
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-slate-500 hover:bg-slate-50 transition-colors w-full text-left cursor-pointer text-sm">
          <HelpCircle className="w-5 h-5" />
          Support
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-red-500 hover:bg-red-50 transition-colors w-full text-left mt-2 cursor-pointer text-sm"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );
}
