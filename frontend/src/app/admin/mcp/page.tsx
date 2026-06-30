"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bot, Key, Terminal, ScrollText, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "react-hot-toast";
import McpTokenManager from "@/components/admin/McpTokenManager";
import McpToolConsole from "@/components/admin/McpToolConsole";
import McpUsageLogs from "@/components/admin/McpUsageLogs";

type Tab = "tokens" | "console" | "logs";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "tokens", label: "Token Manager", icon: <Key className="w-3.5 h-3.5" /> },
  { id: "console", label: "Tool Console", icon: <Terminal className="w-3.5 h-3.5" /> },
  { id: "logs", label: "Usage Logs", icon: <ScrollText className="w-3.5 h-3.5" /> },
];

/**
 * MCP Agent Console page.
 * Provides admins with full control over MCP access tokens, an interactive tool
 * execution console, and a live view of MCP server activity logs.
 *
 * @returns The admin MCP page component.
 */
export default function AdminMcpPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isAdmin, isLoading: isWorkspaceLoading, fetchWorkspaceDetails } = useWorkspace();
  const [activeTab, setActiveTab] = useState<Tab>("tokens");
  const [activeToken, setActiveToken] = useState<string | null>(null);

  useEffect(() => {
    if (session) fetchWorkspaceDetails(session);
  }, [session, fetchWorkspaceDetails]);

  useEffect(() => {
    if (!isWorkspaceLoading && !isAdmin) {
      toast.error("Access denied: Admin permissions required");
      router.push("/dashboard");
    }
  }, [isAdmin, isWorkspaceLoading, router]);

  if (isWorkspaceLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-foreground font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2.5 text-xs">Authenticating Admin Access...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-6 text-foreground font-mono text-xs animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            MCP Agent Console
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            Manage access tokens, execute MCP tools interactively, and monitor agent activity logs.
          </p>
        </div>
        {activeToken && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-500 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Token loaded
          </div>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border border-border rounded-xl p-1 bg-secondary/20 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold transition-all ${
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.id === "console" && activeToken && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="flex-1 min-h-0">
        {activeTab === "tokens" && (
          <div className="max-w-2xl">
            <McpTokenManager onTokenChange={setActiveToken} />
          </div>
        )}

        {activeTab === "console" && (
          <div className="h-[calc(100vh-280px)] flex flex-col">
            {!activeToken && (
              <div className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] text-[10px] text-amber-500 font-sans flex items-center gap-2">
                <Key className="w-3.5 h-3.5 shrink-0" />
                Go to the <strong>Token Manager</strong> tab, create a token, and click &quot;Load into Console&quot; to unlock the tool explorer.
              </div>
            )}
            <McpToolConsole activeToken={activeToken} />
          </div>
        )}

        {activeTab === "logs" && (
          <div className="h-[calc(100vh-280px)] flex flex-col">
            <McpUsageLogs />
          </div>
        )}
      </div>
    </div>
  );
}
