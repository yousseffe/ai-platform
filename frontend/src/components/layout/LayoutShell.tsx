"use client";

import React, { useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Session } from "next-auth";
import { useWorkspace } from "@/hooks/use-workspace";

interface LayoutShellProps {
  session: Session | null;
  children: React.ReactNode;
}

/**
 * Shell component defining the core dashboard layout.
 * Hooks into the Zustand store to trigger initial context resolution.
 */
export default function LayoutShell({ session, children }: LayoutShellProps) {
  const fetchWorkspaceDetails = useWorkspace((state) => state.fetchWorkspaceDetails);
  const isLoading = useWorkspace((state) => state.isLoading);

  useEffect(() => {
    if (session) {
      fetchWorkspaceDetails(session);
    }
  }, [session, fetchWorkspaceDetails]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
          <span className="text-xs text-slate-500 font-medium">Loading workspace state...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-main">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header session={session} />
        <main className="flex-1 overflow-y-auto p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
