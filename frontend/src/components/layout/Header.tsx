"use client";

import React from "react";
import { Search, Bell, HelpCircle, Coins, TrendingUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { Session } from "next-auth";
import Image from "next/image";
import { useWorkspace } from "@/hooks/use-workspace";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WalletType } from "@/types";

interface HeaderProps {
  session: Session | null;
}

/**
 * Top platform Header component.
 * Integrates breadcrumbs matching the active workspace, dynamic search inputs,
 * and live wallet status pill meters. Migrated to Shadcn UI components.
 *
 * @param props - Component properties containing the session context.
 * @returns The React component rendering the header.
 */
export default function Header({ session }: HeaderProps) {
  const pathname = usePathname();
  const { activeWorkspace, viewMode, balance } = useWorkspace();

  const getBreadcrumb = () => {
    const wsName = activeWorkspace ? activeWorkspace.name : "Workspace";
    if (pathname === "/") return `${wsName} / Dashboard`;
    if (pathname.startsWith("/models/upload")) return `${wsName} / Models / Upload New Model`;
    if (pathname.startsWith("/models/")) return `${wsName} / Models / Details`;
    if (pathname === "/models") return `${wsName} / Models Registry`;
    return `${wsName} / Dashboard`;
  };

  const userEmail = session?.user?.email || "User";
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    userEmail
  )}&background=6366f1&color=fff`;

  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 relative z-20">
      <div className="font-semibold text-slate-800 tracking-wide text-xs hidden lg:block">
        {getBreadcrumb()}
      </div>

      <div className="flex-1 flex justify-center max-w-xl px-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search models, experiments, or deployments..."
            className="w-full pl-10 pr-4 py-2 h-9 bg-slate-50 border-slate-200 text-xs focus-visible:ring-primary-500/20 focus-visible:border-primary-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Active Wallet Balance Meter */}
        {activeWorkspace && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold select-none ${
            viewMode === WalletType.PROVIDER
              ? "bg-emerald-50 border-emerald-100 text-emerald-700"
              : "bg-indigo-50 border-indigo-100 text-indigo-700"
          }`}>
            {viewMode === WalletType.PROVIDER ? (
              <>
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Earnings: ${balance.toFixed(2)}</span>
              </>
            ) : (
              <>
                <Coins className="w-3.5 h-3.5" />
                <span>Credits: ${balance.toFixed(2)}</span>
              </>
            )}
          </div>
        )}

        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 cursor-pointer h-8 w-8">
          <Bell className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 cursor-pointer h-8 w-8">
          <HelpCircle className="w-4 h-4" />
        </Button>
        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300 ml-2 cursor-pointer" title={userEmail}>
          <Image
            src={avatarUrl}
            alt="User avatar"
            width={32}
            height={32}
          />
        </div>
      </div>
    </div>
  );
}
