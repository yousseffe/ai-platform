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
 * and live wallet status pill meters. Refined in the Expo Go developer console style.
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
    if (pathname.startsWith("/models/upload")) return `${wsName} / Models / Upload`;
    if (pathname.startsWith("/models/")) return `${wsName} / Models / Details`;
    if (pathname === "/models") return `${wsName} / Models Registry`;
    return `${wsName} / Dashboard`;
  };

  const userEmail = session?.user?.email || "User";
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    userEmail
  )}&background=4630eb&color=fff`;

  return (
    <div className="h-14 bg-card border-b border-border flex items-center justify-between px-6 shrink-0 relative z-20 font-sans">
      {/* Breadcrumb path */}
      <div className="font-semibold text-muted-foreground tracking-wide text-[10px] hidden md:block uppercase">
        {getBreadcrumb()}
      </div>

      {/* Global developer search */}
      <div className="flex-1 flex justify-center max-w-md px-4 mx-auto">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search models, tasks, or API logs..."
            className="w-full pl-8 pr-3 py-1.5 h-8 bg-background border-border text-foreground text-xs focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-lg"
          />
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Wallet stats badge */}
        {activeWorkspace && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold select-none ${
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
                <span>Credits: ${balance.toFixed(2)}</span>
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
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </Button>

        {/* Notifications and help shortcuts */}
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground cursor-pointer h-8 w-8 hover:bg-secondary rounded-lg transition-colors">
          <Bell className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground cursor-pointer h-8 w-8 hover:bg-secondary rounded-lg transition-colors">
          <HelpCircle className="w-3.5 h-3.5" />
        </Button>

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
