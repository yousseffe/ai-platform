"use client";

import React, { useState, useEffect } from "react";
import { Search, Bell, HelpCircle, Coins, TrendingUp, Sun, Moon } from "lucide-react";
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
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
      return savedTheme || "dark";
    }
    return "dark";
  });

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

  const getBreadcrumb = () => {
    const wsName = activeWorkspace ? activeWorkspace.name : "Workspace";
    if (pathname === "/dashboard") return `${wsName} / Dashboard`;
    if (pathname === "/") return `Marketplace`;
    if (pathname.startsWith("/explore")) return `Marketplace / Explore`;
    if (pathname.startsWith("/models/upload")) return `${wsName} / Models / Upload New Model`;
    if (pathname.startsWith("/models/")) return `${wsName} / Models / Details`;
    if (pathname === "/models") return `${wsName} / Models Registry`;
    return `${wsName} / Dashboard`;
  };

  const userEmail = session?.user?.email || "User";
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    userEmail
  )}&background=2f81f7&color=fff`;

  return (
    <div className="h-16 bg-background border-b border-border flex items-center justify-between px-8 shrink-0 relative z-20">
      <div className="font-semibold text-muted-foreground tracking-wide text-xs hidden lg:block font-mono">
        {getBreadcrumb()}
      </div>

      <div className="flex-1 flex justify-center max-w-xl px-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search models, experiments, or deployments..."
            className="w-full pl-10 pr-4 py-2 h-9 bg-card border-border text-foreground text-xs focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-lg"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Active Wallet Balance Meter */}
        {activeWorkspace && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold select-none font-mono ${
            viewMode === WalletType.PROVIDER
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
              : "bg-primary/10 border-primary/20 text-primary"
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

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground cursor-pointer h-8 w-8 hover:bg-accent rounded-lg"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground cursor-pointer h-8 w-8 hover:bg-accent rounded-lg">
          <Bell className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground cursor-pointer h-8 w-8 hover:bg-accent rounded-lg">
          <HelpCircle className="w-4 h-4" />
        </Button>
        <div className="w-8 h-8 rounded-full bg-muted overflow-hidden border border-border ml-2 cursor-pointer" title={userEmail}>
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
