"use client";

import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface AdminHeaderProps {
  userEmail: string;
  avatarUrl: string;
}

/**
 * Header component for the Admin Console.
 * Displays page titles dynamically and mounts the light/dark theme switch toggler.
 *
 * @param props - Component props containing session details.
 * @returns React node for header layout.
 */
export default function AdminHeader({ userEmail, avatarUrl }: AdminHeaderProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
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

  const getBreadcrumb = () => {
    if (pathname === "/admin/deployments") return "System Console / Deployments";
    if (pathname === "/admin/users") return "System Console / Users";
    if (pathname === "/admin/models") return "System Console / Models";
    if (pathname === "/admin/config") return "System Console / Configuration";
    return "System Console / Overview";
  };

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-8 shrink-0 bg-card/45 backdrop-blur-md relative z-20 font-sans">
      {/* Breadcrumbs */}
      <div className="font-semibold text-muted-foreground tracking-wide text-[10px] uppercase">
        {getBreadcrumb()}
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-4">
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

        {/* User profile avatar */}
        <div className="flex items-center gap-2 select-none">
          <div className="w-7 h-7 rounded-full bg-muted overflow-hidden border border-border">
            <Image
              src={avatarUrl}
              alt="Admin avatar"
              width={28}
              height={28}
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground font-semibold max-w-[150px] truncate" title={userEmail}>
            {userEmail.split("@")[0]}
          </span>
        </div>
      </div>
    </header>
  );
}
