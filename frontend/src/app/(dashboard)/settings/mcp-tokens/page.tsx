"use client";

import React, { useState, useEffect } from "react";
import {
  Plug,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Loader2,
  Sparkles,
  Terminal,
  ShieldAlert,
  AlertCircle,
  Clock,
  Lock,
  ExternalLink,
} from "lucide-react";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "react-hot-toast";
import { McpTokenInfo, McpTokenCreateResponse } from "@/types/auth/mcp-token";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";

enum McpScope {
  INTEGRATION_READ = "integration:read",
  MODELS_READ = "models:read",
  OBSERVABILITY_READ = "observability:read",
  SECURITY_READ = "security:read",
  ADMIN_READ = "admin:read",
}

const SCOPE_LABELS: Record<McpScope, { label: string; desc: string; admin: boolean }> = {
  [McpScope.INTEGRATION_READ]: {
    label: "integration:read",
    desc: "Read repository layout analysis and static external provider metadata templates.",
    admin: false,
  },
  [McpScope.MODELS_READ]: {
    label: "models:read",
    desc: "Read platform ML models catalog and prediction execution specifications.",
    admin: false,
  },
  [McpScope.OBSERVABILITY_READ]: {
    label: "observability:read",
    desc: "Read telemetry logs and Prometheus metrics (Admin only).",
    admin: true,
  },
  [McpScope.SECURITY_READ]: {
    label: "security:read",
    desc: "Read abusebaselines and security/fraud risk events (Admin only).",
    admin: true,
  },
  [McpScope.ADMIN_READ]: {
    label: "admin:read",
    desc: "Read system-level Alertmanager alert arrays (Admin only).",
    admin: true,
  },
};

export default function McpAccessTokensPage() {
  const { isAdmin } = useWorkspace();

  const [tokens, setTokens] = useState<McpTokenInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [tokenName, setTokenName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<McpScope[]>([
    McpScope.INTEGRATION_READ,
    McpScope.MODELS_READ,
  ]);
  const [expiresInDays, setExpiresInDays] = useState<string>("90");
  const [generating, setGenerating] = useState(false);

  // UI state overlays
  const [newRawToken, setNewRawToken] = useState<string | null>(null);
  const [newCreatedToken, setNewCreatedToken] = useState<McpTokenInfo | null>(null);
  const [showCreatedModal, setShowCreatedModal] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState<"claude" | "cursor" | "antigravity">("antigravity");

  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [copiedRawText, setCopiedRawText] = useState(false);
  const [visibleTokens, setVisibleTokens] = useState<Record<string, boolean>>({});
  const [tokenPendingAction, setTokenPendingAction] = useState<{ token: McpTokenInfo; action: "revoke" | "delete" } | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const data = await smartFetch<McpTokenInfo[]>("/auth/mcp-tokens");
      setTokens(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to retrieve MCP access tokens");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) {
      toast.error("Please enter a token name");
      return;
    }
    if (selectedScopes.length === 0) {
      toast.error("Please select at least one scope");
      return;
    }

    setGenerating(true);
    try {
      const body = {
        name: tokenName.trim(),
        scopes: selectedScopes,
        expiresInDays: expiresInDays === "never" ? null : parseInt(expiresInDays, 10),
      };

      const res = await smartFetch<McpTokenCreateResponse>("/auth/mcp-tokens", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setTokens((prev) => [res.token, ...prev]);
      setTokenName("");
      setNewRawToken(res.rawToken);
      setNewCreatedToken(res.token);
      setShowCreatedModal(true);
      toast.success("MCP Access Token generated!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate token";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    try {
      await smartFetch(`/auth/mcp-tokens/${tokenId}/revoke`, {
        method: "POST",
      });
      setTokens((prev) =>
        prev.map((t) => (t.id === tokenId ? { ...t, isActive: false } : t))
      );
      toast.success("Token revoked successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke token";
      toast.error(msg);
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    try {
      await smartFetch(`/auth/mcp-tokens/${tokenId}`, {
        method: "DELETE",
      });
      setTokens((prev) => prev.filter((t) => t.id !== tokenId));
      toast.success("Token deleted permanently");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete token";
      toast.error(msg);
    }
  };

  /**
   * Runs whichever destructive action (revoke or delete) is currently pending
   * confirmation, then clears the pending state.
   */
  const handleConfirmPendingAction = async () => {
    if (!tokenPendingAction) return;
    if (tokenPendingAction.action === "revoke") {
      await handleRevokeToken(tokenPendingAction.token.id);
    } else {
      await handleDeleteToken(tokenPendingAction.token.id);
    }
    setTokenPendingAction(null);
  };

  const handleCopyRaw = async (raw: string) => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopiedRawText(true);
      toast.success("Plaintext token copied!");
      setTimeout(() => setCopiedRawText(false), 2000);
    } catch {
      toast.error("Failed to copy token");
    }
  };

  const toggleScope = (scope: McpScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  // Warnings checks
  const tokensWithNoExpiration = tokens.filter((t) => t.isActive && !t.expiresAt);
  const staleTokens = tokens.filter((t) => {
    if (!t.isActive) return false;
    const lastUsed = t.lastUsedAt ? new Date(t.lastUsedAt).getTime() : new Date(t.createdAt).getTime();
    const ageDays = (Date.now() - lastUsed) / (1000 * 60 * 60 * 24);
    return ageDays >= 90;
  });

  const getMcpConfigString = () => {
    const tokenVal = newRawToken || "mcp_your_token_here";
    const port = 7000;

    if (activeConfigTab === "claude") {
      return `{\n  "mcpServers": {\n    "ai-platform": {\n      "command": "npx",\n      "args": [\n        "-y",\n        "@modelcontextprotocol/client-http",\n        "--url",\n        "http://localhost:${port}/mcp",\n        "--headers",\n        "Authorization=Bearer ${tokenVal}"\n      ]\n    }\n  }\n}`;
    }

    if (activeConfigTab === "cursor") {
      return `// Add as a new HTTP Connection in Cursor Settings:\n// Name: ai-platform\n// URL: http://localhost:${port}/mcp\n// Headers (JSON format):\n{\n  "Authorization": "Bearer ${tokenVal}"\n}`;
    }

    return `{\n  "mcpServers": {\n    "ai-platform": {\n      "url": "http://localhost:${port}/mcp",\n      "headers": {\n        "Authorization": "Bearer ${tokenVal}"\n      }\n    }\n  }\n}`;
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <PageHeader
        title="MCP Access Tokens"
        description="Personal access credentials used to securely connect external AI clients (Claude Code, Cursor, Antigravity) to the platform context services."
        className="mb-0"
      />

      {/* Security Warnings */}
      {(tokensWithNoExpiration.length > 0 || staleTokens.length > 0) && (
        <div className="space-y-3 font-sans">
          {tokensWithNoExpiration.length > 0 && (
            <div className="flex gap-3 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400 text-xs">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-bold">Security Alert:</span> You have active tokens with no expiration date ({" "}
                {tokensWithNoExpiration.map((t) => t.name).join(", ")} ). We strongly recommend setting expiration dates to secure your environment.
              </div>
            </div>
          )}
          {staleTokens.length > 0 && (
            <div className="flex gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-bold">Optimization Alert:</span> You have tokens that haven't been used in 90+ days ({" "}
                {staleTokens.map((t) => t.name).join(", ")} ). Consider revoking or deleting them.
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Side: Tokens list */}
        <div className="flex-1 card p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-border/60 pb-4 select-none">
            <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
              <Plug className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-xs font-mono">Tokens List</h2>
              <p className="text-[10px] text-muted-foreground">Manage active credential authorizations.</p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <span className="font-mono text-xs">Loading tokens...</span>
            </div>
          ) : tokens.length === 0 ? (
            <EmptyState
              icon={<Plug />}
              title="No MCP access tokens yet"
              description="Use the panel on the right to create your first token."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-[10px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-bold uppercase select-none">
                    <th className="py-2.5 px-2">Label</th>
                    <th className="py-2.5 px-2">Token</th>
                    <th className="py-2.5 px-2">Scopes</th>
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 px-2">Last Used</th>
                    <th className="py-2.5 px-2">Expires</th>
                    <th className="py-2.5 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token) => {
                    const isVisible = !!visibleTokens[token.id];
                    const maskedToken = token.keyPrefix;
                    const isExpired = token.expiresAt && new Date(token.expiresAt).getTime() < Date.now();

                    let statusBadge = (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-500 select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    );
                    if (!token.isActive) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-500 select-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Revoked
                        </span>
                      );
                    } else if (isExpired) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-yellow-500 select-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> Expired
                        </span>
                      );
                    }

                    return (
                      <tr key={token.id} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                        <td className="py-3 px-2 font-sans font-bold text-foreground max-w-[120px] truncate">
                          {token.name}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-secondary/40 px-2 py-1 rounded text-foreground font-medium font-mono text-[9px] border border-border/50">
                              {maskedToken}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {token.scopes.map((scope) => (
                              <span
                                key={scope}
                                className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-primary/10 text-primary border border-primary/20"
                              >
                                {scope.replace(":read", "")}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {statusBadge}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground font-sans text-[9px]">
                          {token.lastUsedAt
                            ? new Date(token.lastUsedAt).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground font-sans text-[9px]">
                          {token.expiresAt ? (
                            <span className={isExpired ? "text-yellow-600 font-bold" : ""}>
                              {new Date(token.expiresAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-yellow-500 inline-flex items-center gap-1 select-none">
                              Never <Clock className="w-3 h-3 shrink-0" />
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {token.isActive && !isExpired && (
                              <button
                                onClick={() => setTokenPendingAction({ token, action: "revoke" })}
                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2 py-1 rounded cursor-pointer transition-colors text-[9px] font-semibold font-sans border border-transparent"
                                title="Revoke access"
                              >
                                Revoke
                              </button>
                            )}
                            <button
                              onClick={() => setTokenPendingAction({ token, action: "delete" })}
                              className="text-muted-foreground hover:text-red-500 p-1.5 rounded cursor-pointer transition-colors"
                              title="Delete token permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Generate token form */}
        <div className="w-full lg:w-[360px] shrink-0 card p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-border/60 pb-4 select-none">
            <div className="w-9 h-9 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-xs font-mono">New Token</h2>
              <p className="text-[10px] text-muted-foreground">Generate personal access credentials.</p>
            </div>
          </div>

          <form onSubmit={handleCreateToken} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-mono">
                Token Name
              </label>
              <input
                type="text"
                placeholder="e.g. Claude Code (Laptop)"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none font-sans font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-mono">
                Permissions & Scopes
              </label>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {Object.entries(SCOPE_LABELS).map(([scope, meta]) => {
                  const scopeEnum = scope as McpScope;
                  if (meta.admin && !isAdmin) return null; // Hide admin scopes if not admin
                  const isChecked = selectedScopes.includes(scopeEnum);

                  return (
                    <label
                      key={scope}
                      className="flex items-start gap-2.5 p-2 rounded-lg border border-border/60 hover:bg-secondary/40 transition-colors cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleScope(scopeEnum)}
                        className="mt-0.5 accent-primary cursor-pointer shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold font-mono text-foreground">{meta.label}</span>
                          {meta.admin && (
                            <span className="bg-red-500/10 text-red-500 text-[8px] font-bold px-1.5 py-0.25 rounded border border-red-500/20 inline-flex items-center gap-0.5">
                              <Lock className="w-2 h-2" /> Admin Only
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-0.5 font-sans leading-relaxed">{meta.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-mono">
                Expiration
              </label>
              <Select value={expiresInDays} onValueChange={(value) => setExpiresInDays(value ?? "90")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="60">60 Days</SelectItem>
                  <SelectItem value="90">90 Days (Recommended)</SelectItem>
                  <SelectItem value="never">No Expiration (Risk Warning)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full btn-primary h-9 flex items-center justify-center gap-1.5 text-xs font-bold font-mono cursor-pointer rounded-lg border-none active:scale-[0.98]"
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Generate Token
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Post-creation one-time display modal */}
      <Dialog open={showCreatedModal} onOpenChange={setShowCreatedModal}>
        <DialogContent className="sm:max-w-xl bg-card border border-border rounded-2xl shadow-xl text-left">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-bold select-none text-sm">
              <Sparkles className="w-5 h-5 text-emerald-500" /> Token Generated Successfully
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground select-none">
              Make sure to copy your personal access token now. You won't be able to see it again!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            {/* The raw token container */}
            <div className="p-3 bg-secondary/40 border border-border/80 rounded-lg flex items-center justify-between gap-3 font-mono text-xs">
              <span className="text-foreground font-bold break-all">{newRawToken}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleCopyRaw(newRawToken || "")}
                className="shrink-0 cursor-pointer"
                title="Copy token secret"
              >
                {copiedRawText ? (
                  <Check className="w-4.5 h-4.5 text-emerald-500 animate-fade-in" />
                ) : (
                  <Copy className="w-4.5 h-4.5" />
                )}
              </Button>
            </div>

            {/* Quick config installation tabs */}
            <div className="space-y-2">
              <div className="flex border-b border-border/60 select-none">
                <button
                  onClick={() => setActiveConfigTab("antigravity")}
                  className={`px-3 py-1.5 text-[10px] font-bold font-mono transition-all border-b-2 cursor-pointer ${
                    activeConfigTab === "antigravity"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Antigravity / VS Code
                </button>
                <button
                  onClick={() => setActiveConfigTab("cursor")}
                  className={`px-3 py-1.5 text-[10px] font-bold font-mono transition-all border-b-2 cursor-pointer ${
                    activeConfigTab === "cursor"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Cursor
                </button>
                <button
                  onClick={() => setActiveConfigTab("claude")}
                  className={`px-3 py-1.5 text-[10px] font-bold font-mono transition-all border-b-2 cursor-pointer ${
                    activeConfigTab === "claude"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Claude Code
                </button>
              </div>

              <div className="relative">
                <div className="absolute top-2 right-2 text-[8px] font-bold text-muted-foreground/60 uppercase font-mono select-none">
                  config.json snippet
                </div>
                <pre className="bg-[#121316] text-[#ededed] border border-[#222326] p-3 rounded-lg text-[9px] font-mono overflow-x-auto font-medium leading-relaxed max-h-[160px] overflow-y-auto">
                  {getMcpConfigString()}
                </pre>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => {
                setShowCreatedModal(false);
                setNewRawToken(null);
                setNewCreatedToken(null);
              }}
              className="btn-primary text-xs font-bold font-mono px-4 h-9 cursor-pointer rounded-lg border-none active:scale-[0.97]"
            >
              I have copied my token
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!tokenPendingAction}
        onOpenChange={(open) => !open && setTokenPendingAction(null)}
        title={tokenPendingAction?.action === "delete" ? "Delete MCP token" : "Revoke MCP token"}
        description={
          tokenPendingAction?.action === "delete"
            ? `Permanently delete "${tokenPendingAction.token.name}"? This can't be undone.`
            : `Clients using "${tokenPendingAction?.token.name}" will fail to authenticate immediately.`
        }
        confirmLabel={tokenPendingAction?.action === "delete" ? "Delete token" : "Revoke token"}
        onConfirm={handleConfirmPendingAction}
      />
    </div>
  );
}
