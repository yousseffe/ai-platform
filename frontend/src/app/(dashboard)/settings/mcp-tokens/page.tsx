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

const SCOPE_LABELS: Record<
  McpScope,
  { label: string; desc: string; admin: boolean }
> = {
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
  const [newCreatedToken, setNewCreatedToken] = useState<McpTokenInfo | null>(
    null,
  );
  const [showCreatedModal, setShowCreatedModal] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState<
    "claude" | "cursor" | "antigravity"
  >("antigravity");

  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [copiedRawText, setCopiedRawText] = useState(false);
  const [visibleTokens, setVisibleTokens] = useState<Record<string, boolean>>(
    {},
  );
  const [tokenPendingAction, setTokenPendingAction] = useState<{ token: McpTokenInfo; action: "revoke" | "delete" } | null>(null);

  const [staleTokens, setStaleTokens] = useState<McpTokenInfo[]>([]);
  const [expiredTokenIds, setExpiredTokenIds] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTokens();
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const currentNow = Date.now();
    const stale = tokens.filter((t) => {
      if (!t.isActive) return false;
      const lastUsed = t.lastUsedAt
        ? new Date(t.lastUsedAt).getTime()
        : new Date(t.createdAt).getTime();
      const ageDays = (currentNow - lastUsed) / (1000 * 60 * 60 * 24);
      return ageDays >= 90;
    });

    const expired: Record<string, boolean> = {};
    tokens.forEach((token) => {
      if (token.expiresAt && new Date(token.expiresAt).getTime() < currentNow) {
        expired[token.id] = true;
      }
    });

    const timer = setTimeout(() => {
      setStaleTokens(stale);
      setExpiredTokenIds(expired);
    }, 0);
    return () => clearTimeout(timer);
  }, [tokens]);
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
        expiresInDays:
          expiresInDays === "never" ? null : parseInt(expiresInDays, 10),
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
      const msg =
        err instanceof Error ? err.message : "Failed to generate token";
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
        prev.map((t) => (t.id === tokenId ? { ...t, isActive: false } : t)),
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
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  // Warnings checks
  const tokensWithNoExpiration = tokens.filter(
    (t) => t.isActive && !t.expiresAt,
  );

  const getMcpConfigString = () => {
    const tokenVal = newRawToken || "mcp_your_token_here";
    const port = 3030;

    if (activeConfigTab === "claude") {
      return `{\n  "mcpServers": {\n    "ai-platform": {\n      "command": "npx",\n      "args": [\n        "-y",\n        "@modelcontextprotocol/client-http",\n        "--url",\n        "http://localhost:${port}/mcp",\n        "--headers",\n        "Authorization=Bearer ${tokenVal}"\n      ]\n    }\n  }\n}`;
    }

    if (activeConfigTab === "cursor") {
      return `// Add as a new HTTP Connection in Cursor Settings:\n// Name: ai-platform\n// URL: http://localhost:${port}/mcp\n// Headers (JSON format):\n{\n  "Authorization": "Bearer ${tokenVal}"\n}`;
    }

    return `{\n  "mcpServers": {\n    "ai-platform": {\n      "url": "http://localhost:${port}/mcp",\n      "headers": {\n        "Authorization": "Bearer ${tokenVal}"\n      }\n    }\n  }\n}`;
  };

  return (
    <div className="relative space-y-6 animate-fade-in text-left font-sans">
      {/* Background Decor */}
      <div className="glow-spot" />
      <div className="glow-spot-secondary" />

      <PageHeader
        title="MCP Access Tokens"
        icon={<Plug className="w-5 h-5 text-primary" />}
        description="Personal access credentials used to securely connect external AI clients (Claude Code, Cursor, Antigravity) to the platform context services."
        className="mb-0"
      />

      {/* Security Warnings */}
      {(tokensWithNoExpiration.length > 0 || staleTokens.length > 0) && (
        <div className="space-y-3 font-sans relative z-10 select-none">
          {tokensWithNoExpiration.length > 0 && (
            <div className="flex gap-3 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400 text-xs shadow-xs">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-bold">Security Alert:</span> You have active tokens with no expiration date ({" "}
                {tokensWithNoExpiration.map((t) => t.name).join(", ")} ). We strongly recommend setting expiration dates to secure your environment.
              </div>
            </div>
          )}
          {staleTokens.length > 0 && (
            <div className="flex gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400 text-xs shadow-xs">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <span className="font-bold">Optimization Alert:</span> You have tokens that haven&apos;t been used in 90+ days ({" "}
                {staleTokens.map((t) => t.name).join(", ")} ). Consider revoking or deleting them.
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 relative z-10">
        {/* Left Side: Tokens list */}
        <div className="flex-1 card rounded-xl border border-border bg-card/65 backdrop-blur-md shadow-xs space-y-4 premium-card p-5">
          <div className="flex items-center gap-3 border-b border-border/50 pb-4 select-none">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
              <Plug className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-xs font-mono">
                Tokens List
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Manage active credential authorizations.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="font-mono text-[9px] font-semibold">Loading tokens...</span>
            </div>
          ) : tokens.length === 0 ? (
            <EmptyState
              icon={<Plug />}
              title="No MCP access tokens yet"
              description="Use the panel on the right to create your first token."
            />
          ) : (
            <div className="overflow-x-auto font-mono">
              <table className="w-full font-mono text-[10px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider select-none text-[8.5px]">
                    <th className="py-2.5 px-2 font-mono">Label</th>
                    <th className="py-2.5 px-2 font-mono">Token</th>
                    <th className="py-2.5 px-2 font-mono">Scopes</th>
                    <th className="py-2.5 px-2 font-mono">Status</th>
                    <th className="py-2.5 px-2 font-mono">Last Used</th>
                    <th className="py-2.5 px-2 font-mono">Expires</th>
                    <th className="py-2.5 px-2 text-right font-mono">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token) => {
                    const isVisible = !!visibleTokens[token.id];
                    const maskedToken = token.keyPrefix;
                    const isExpired = !!expiredTokenIds[token.id];

                    let statusBadge = (
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-500 select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                        Active
                      </span>
                    );
                    if (!token.isActive) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-red-500 select-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{" "}
                          Revoked
                        </span>
                      );
                    } else if (isExpired) {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-yellow-550 select-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />{" "}
                          Expired
                        </span>
                      );
                    }

                    return (
                      <tr
                        key={token.id}
                        className="border-b border-border/30 hover:bg-secondary/15 transition-colors font-mono"
                      >
                        <td className="py-3 px-2 font-sans font-bold text-foreground max-w-[120px] truncate">
                          {token.name}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-background border border-border/85 px-2 py-0.75 rounded-md text-foreground font-semibold font-mono text-[9px] shadow-inner select-all">
                              {maskedToken}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap gap-1 max-w-[150px] font-sans">
                            {token.scopes.map((scope) => (
                              <span
                                key={scope}
                                className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-primary/10 text-primary border border-primary/20"
                              >
                                {scope.replace(":read", "")}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-2 font-sans font-semibold">{statusBadge}</td>
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
                            <span className="text-yellow-650 font-bold inline-flex items-center gap-1 select-none font-sans">
                              Never <Clock className="w-3 h-3 shrink-0" />
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            {token.isActive && !isExpired && (
                              <Button
                                onClick={() => setTokenPendingAction({ token, action: "revoke" })}
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-650 hover:bg-red-500/10 px-2 py-1 h-7 text-[9px] font-bold border border-transparent shadow-none hover-lift active-shrink rounded-md"
                                title="Revoke access"
                              >
                                Revoke
                              </Button>
                            )}
                            <Button
                              onClick={() => setTokenPendingAction({ token, action: "delete" })}
                              variant="ghost"
                              size="icon-sm"
                              className="hover-lift active-shrink rounded-md hover:bg-secondary"
                              title="Delete token permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
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
        <div className="w-full lg:w-[360px] shrink-0 card rounded-xl border border-border bg-card/65 backdrop-blur-md shadow-xs space-y-4 premium-card p-5">
          <div className="flex items-center gap-3 border-b border-border/50 pb-4 select-none">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-xs font-mono">
                New Token
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Generate personal access credentials.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateToken} className="space-y-4">
            <div className="space-y-1.5">
              <label className="form-label select-none">
                Token Name
              </label>
              <input
                type="text"
                placeholder="e.g. Claude Code (Laptop)"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-xs text-foreground outline-none font-sans font-medium focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all form-input h-10"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="form-label select-none">
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
                      className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border/60 hover:bg-secondary/40 transition-colors cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleScope(scopeEnum)}
                        className="mt-0.5 accent-primary cursor-pointer shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold font-mono text-foreground">
                            {meta.label}
                          </span>
                          {meta.admin && (
                            <span className="bg-red-500/10 text-red-550 text-[8px] font-bold px-1.5 py-0.25 rounded border border-red-500/20 inline-flex items-center gap-0.5">
                              <Lock className="w-2 h-2" /> Admin Only
                            </span>
                          )}
                        </div>
                        <p className="text-[9.5px] text-muted-foreground mt-0.5 font-sans leading-relaxed">
                          {meta.desc}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="form-label select-none">
                Expiration
              </label>
              <Select value={expiresInDays} onValueChange={(value) => setExpiresInDays(value ?? "90")}>
                <SelectTrigger className="w-full form-input bg-background/50 h-10 border-border select-none">
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

            <Button
              type="submit"
              disabled={generating}
              className="w-full h-10 flex items-center justify-center gap-1.5 text-xs font-bold btn-primary rounded-xl cursor-pointer"
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Generate Token
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Post-creation one-time display modal */}
      <Dialog open={showCreatedModal} onOpenChange={setShowCreatedModal}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-black select-none text-sm">
              <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" /> Token Generated Successfully
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground select-none mt-1">
              Make sure to copy your personal access token now. You won&apos;t be able to see it again!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4.5 my-2">
            {/* The raw token container */}
            <div className="p-3 bg-[#0b0c0f] border border-border/80 rounded-xl flex items-center justify-between gap-3 font-mono text-xs shadow-inner">
              <span className="text-[#ebecf0] font-bold break-all select-all">{newRawToken}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleCopyRaw(newRawToken || "")}
                className="shrink-0 cursor-pointer hover:bg-secondary rounded-lg hover-lift active-shrink"
                title="Copy token secret"
              >
                {copiedRawText ? (
                  <Check className="w-4.5 h-4.5 text-emerald-500 animate-fade-in" />
                ) : (
                  <Copy className="w-4.5 h-4.5 text-muted-foreground hover:text-foreground" />
                )}
              </Button>
            </div>

            {/* Quick config installation tabs - Vercel layout triggers */}
            <div className="space-y-3">
              <div className="flex border-b border-border select-none">
                <button
                  onClick={() => setActiveConfigTab("antigravity")}
                  className={`px-3.5 py-2 text-[10px] font-bold font-mono transition-all border-b-2 cursor-pointer ${
                    activeConfigTab === "antigravity"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Antigravity / VS Code
                </button>
                <button
                  onClick={() => setActiveConfigTab("cursor")}
                  className={`px-3.5 py-2 text-[10px] font-bold font-mono transition-all border-b-2 cursor-pointer ${
                    activeConfigTab === "cursor"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Cursor
                </button>
                <button
                  onClick={() => setActiveConfigTab("claude")}
                  className={`px-3.5 py-2 text-[10px] font-bold font-mono transition-all border-b-2 cursor-pointer ${
                    activeConfigTab === "claude"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Claude Code
                </button>
              </div>

              <div className="relative">
                <div className="absolute top-2.5 right-3.5 text-[8px] font-bold text-muted-foreground/60 uppercase font-mono select-none">
                  config.json snippet
                </div>
                <pre className="bg-[#0b0c0f] text-[#ebecf0] border border-border/80 p-4 rounded-xl text-[9.5px] font-mono overflow-x-auto font-medium leading-relaxed max-h-[160px] overflow-y-auto shadow-inner">
                  {getMcpConfigString()}
                </pre>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              onClick={() => {
                setShowCreatedModal(false);
                setNewRawToken(null);
                setNewCreatedToken(null);
              }}
              className="h-10 px-4 text-xs font-bold btn-primary rounded-xl cursor-pointer"
            >
              I have copied my token
            </Button>
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
