"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import CommandPalette from "./CommandPalette";
import { Session } from "next-auth";
import { useWorkspace } from "@/hooks/use-workspace";

interface LayoutShellProps {
  session: Session | null;
  children: React.ReactNode;
}

/**
 * Shell component defining the core dashboard layout.
 * Hooks into the Zustand store to trigger initial context resolution, owns the
 * mobile sidebar drawer state, and mounts the global command palette.
 */
export default function LayoutShell({ session, children }: LayoutShellProps) {
  const fetchWorkspaceDetails = useWorkspace((state) => state.fetchWorkspaceDetails);
  const isLoading = useWorkspace((state) => state.isLoading);
  const pathname = usePathname();

  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    if (session) {
      fetchWorkspaceDetails(session);
    }
  }, [session, fetchWorkspaceDetails]);

  // Close the mobile drawer automatically whenever navigation happens.
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  // Global Ctrl/Cmd+K shortcut to toggle the command palette from anywhere.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground animate-fade-in">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-4 border-muted border-t-primary animate-spin"></div>
          <span className="text-xs text-muted-foreground font-mono font-medium">Loading workspace state...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          session={session}
          onMenuClick={() => setMobileSidebarOpen(true)}
          onSearchClick={() => setCommandPaletteOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 animate-fade-in">
          {children}
        </main>
      </div>
      <CommandPalette open={isCommandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </div>
  );
}
