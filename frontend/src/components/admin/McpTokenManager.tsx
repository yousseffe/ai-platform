"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Key, Plus, Trash2, ShieldOff, Copy, Check, Loader2, Eye, EyeOff, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { McpTokenInfo } from "@/types";
import {
  listMcpTokens,
  createMcpToken,
  revokeMcpToken,
  deleteMcpToken,
} from "@/lib/services/mcp.service";

const ALL_SCOPES = [
  { value: "integration:read", label: "Integration Read", admin: false, desc: "List models, get specs, prepare uploads" },
  { value: "models:read", label: "Models Read", admin: false, desc: "Access model registry and search" },
  { value: "observability:read", label: "Observability Read", admin: true, desc: "Metrics, logs, traces, alerts" },
  { value: "security:read", label: "Security Read", admin: true, desc: "Fraud reports and risk events" },
  { value: "admin:read", label: "Admin Read", admin: true, desc: "Platform-wide admin operations" },
];

const STORAGE_KEY = (id: string) => `mcp_raw_${id}`;

/** Saves the raw token value to localStorage so it survives page reloads. */
function cacheRawToken(id: string, raw: string): void {
  try {
    localStorage.setItem(STORAGE_KEY(id), raw);
  } catch {
    // Ignore storage errors (private browsing quota exhausted, etc.)
  }
}

/** Retrieves a previously cached raw token, or null if not found. */
function getCachedRawToken(id: string): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY(id));
  } catch {
    return null;
  }
}

/** Removes a cached token from localStorage (on revoke/delete). */
function removeCachedRawToken(id: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY(id));
  } catch {
    // ignore
  }
}

interface Props {
  /** Called when the active token the console should use changes. */
  onTokenChange: (rawToken: string | null) => void;
}

/**
 * MCP Token Manager panel.
 * Allows admins to create, copy, revoke, and delete MCP access tokens.
 * Raw token values are cached in localStorage so they survive page reloads —
 * no need to paste the full value more than once per browser.
 *
 * @param props - Component props.
 * @returns The React component.
 */
export default function McpTokenManager({ onTokenChange }: Props) {
  const [tokens, setTokens] = useState<McpTokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>(["integration:read", "models:read"]);
  const [newExpiry, setNewExpiry] = useState("");
  const [rawToken, setRawToken] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTokenId, setActiveTokenId] = useState<string | null>(null);
  const [visibleRaw, setVisibleRaw] = useState(false);
  // Per-token paste fallback state (shown only when raw not in localStorage)
  const [pasteInputs, setPasteInputs] = useState<Record<string, string>>({});
  const [showPasteId, setShowPasteId] = useState<string | null>(null);
  // Which token IDs have a cached raw value available
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMcpTokens();
      setTokens(data);
      // Detect which tokens already have a cached raw value in localStorage
      setCachedIds(
        new Set(data.filter((t) => getCachedRawToken(t.id) !== null).map((t) => t.id)),
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  const handleCreate = async () => {
    if (!newName.trim() || newScopes.length === 0) {
      toast.error("Name and at least one scope are required");
      return;
    }
    setCreating(true);
    try {
      const result = await createMcpToken(
        newName.trim(),
        newScopes,
        newExpiry ? parseInt(newExpiry, 10) : null,
      );
      // Cache immediately so the user never needs to paste it again
      cacheRawToken(result.token.id, result.rawToken);
      setCachedIds((prev) => new Set([...prev, result.token.id]));
      setRawToken(result.rawToken);
      setTokens((prev) => [result.token, ...prev]);
      setNewName("");
      setNewScopes(["integration:read", "models:read"]);
      setNewExpiry("");
      setShowCreate(false);
      toast.success("Token created and saved in this browser — copy it as a backup.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create token");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeMcpToken(id);
      removeCachedRawToken(id);
      setCachedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setTokens((prev) => prev.map((t) => t.id === id ? { ...t, isActive: false } : t));
      if (activeTokenId === id) { setActiveTokenId(null); onTokenChange(null); }
      toast.success("Token revoked");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMcpToken(id);
      removeCachedRawToken(id);
      setCachedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setTokens((prev) => prev.filter((t) => t.id !== id));
      if (activeTokenId === id) { setActiveTokenId(null); onTokenChange(null); }
      toast.success("Token deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activateToken = (token: string, id?: string) => {
    onTokenChange(token);
    if (id) setActiveTokenId(id);
    setShowPasteId(null);
    toast.success("Token loaded into console");
  };

  /** Load directly from localStorage — no paste needed. */
  const handleLoadCached = (id: string) => {
    const cached = getCachedRawToken(id);
    if (!cached) {
      // Shouldn't happen but fall back to paste UI gracefully
      setShowPasteId(id);
      return;
    }
    activateToken(cached, id);
  };

  /** Load from the inline paste input, then cache for future use. */
  const handleLoadPasted = (id: string) => {
    const pasted = pasteInputs[id]?.trim();
    if (!pasted) { toast.error("Paste the full raw token value first"); return; }
    cacheRawToken(id, pasted);
    setCachedIds((prev) => new Set([...prev, id]));
    activateToken(pasted, id);
    setPasteInputs((prev) => ({ ...prev, [id]: "" }));
  };

  const toggleScope = (scope: string) => {
    setNewScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  return (
    <div className="space-y-4">
      {/* Raw token reveal banner — shown once after creation */}
      {rawToken && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] space-y-3">
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
            Token saved in this browser — copy it as an offline backup
          </p>
          <div className="flex gap-2 items-center">
            <code className="flex-1 text-[11px] font-mono bg-background border border-border rounded-lg px-3 py-2 text-foreground overflow-x-auto">
              {visibleRaw ? rawToken : rawToken.replace(/./g, "•")}
            </code>
            <button onClick={() => setVisibleRaw((v) => !v)} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
              {visibleRaw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={() => copyToClipboard(rawToken, "raw")} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
              {copiedId === "raw" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => activateToken(rawToken)} className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Load into Console
            </Button>
            <Button onClick={() => setRawToken(null)} variant="outline" className="h-7 text-[10px]">
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground font-sans">
          {tokens.length} token{tokens.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={() => setShowCreate((v) => !v)} className="h-7 text-[10px] bg-primary text-primary-foreground font-bold flex items-center gap-1.5">
          <Plus className="w-3 h-3" /> New Token
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="border border-border bg-card rounded-xl">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold">Create MCP Token</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div>
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Token Name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Admin Console Token" className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">Scopes</label>
              <div className="space-y-1.5">
                {ALL_SCOPES.map((scope) => (
                  <label key={scope.value} className="flex items-start gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={newScopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="mt-0.5 accent-primary"
                    />
                    <div>
                      <span className="text-[10px] font-bold text-foreground">{scope.label}</span>
                      {scope.admin && <span className="ml-1.5 text-[8px] px-1 py-0.5 bg-amber-500/15 text-amber-500 rounded font-bold uppercase">admin</span>}
                      <p className="text-[8px] text-muted-foreground font-sans">{scope.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Expires in (days, blank = never)</label>
              <Input type="number" min="1" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)} placeholder="Leave empty for no expiry" className="h-8 text-xs" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleCreate} disabled={creating} className="h-7 text-[10px] bg-primary text-primary-foreground font-bold flex-1">
                {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Create Token"}
              </Button>
              <Button onClick={() => setShowCreate(false)} variant="outline" className="h-7 text-[10px] flex-1">Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Token list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : tokens.length === 0 ? (
        <div className="py-8 text-center text-[10px] text-muted-foreground font-sans">
          No tokens yet — create one to start using the MCP console.
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map((token) => (
            <div
              key={token.id}
              className={`rounded-2xl border p-4 text-left transition-all duration-300 hover-lift ${
                activeTokenId === token.id
                  ? "border-primary/40 bg-primary/[0.04]"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Key className={`w-3.5 h-3.5 shrink-0 ${token.isActive ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-foreground truncate">{token.name}</p>
                    <p className="text-[9px] text-muted-foreground font-mono">{token.keyPrefix}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => copyToClipboard(token.keyPrefix, token.id)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground cursor-pointer border border-border/80 bg-card">
                    {copiedId === token.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                  {token.isActive && (
                    <button onClick={() => handleRevoke(token.id)} title="Revoke" className="p-1.5 rounded-lg hover:bg-amber-500/10 transition-colors text-amber-500 cursor-pointer border border-border/80 bg-card">
                      <ShieldOff className="w-3 h-3" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(token.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-red-500 cursor-pointer border border-border/80 bg-card">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {token.scopes.map((s) => (
                  <span key={s} className="text-[8px] px-1.5 py-0.5 rounded-md bg-secondary border border-border font-sans text-muted-foreground">{s}</span>
                ))}
                <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold ml-auto ${token.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"}`}>
                  {token.isActive ? "ACTIVE" : "REVOKED"}
                </span>
              </div>

              {token.lastUsedAt && (
                <p className="text-[8px] text-muted-foreground font-sans mt-2 text-left">
                  Last used: {new Date(token.lastUsedAt).toLocaleString()}
                </p>
              )}

              {/* Load into console — one-click if cached, paste-input if not */}
              {token.isActive && (
                <div className="mt-2.5 pt-2.5 border-t border-border/60">
                  {cachedIds.has(token.id) ? (
                    <button
                      onClick={() => handleLoadCached(token.id)}
                      className="text-[9px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    >
                      <Terminal className="w-2.5 h-2.5" />
                      Load into Console
                    </button>
                  ) : showPasteId !== token.id ? (
                    <button
                      onClick={() => setShowPasteId(token.id)}
                      className="text-[9px] font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <Terminal className="w-2.5 h-2.5" />
                      Load into Console <span className="font-normal opacity-60">(paste token once)</span>
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-[8px] text-muted-foreground font-sans">
                        Paste the full raw token (mcp_...) — it will be saved in this browser:
                      </p>
                      <div className="flex gap-1.5">
                        <Input
                          type="password"
                          value={pasteInputs[token.id] ?? ""}
                          onChange={(e) => setPasteInputs((prev) => ({ ...prev, [token.id]: e.target.value }))}
                          placeholder="mcp_..."
                          className="h-7 text-[10px] font-mono flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleLoadPasted(token.id);
                            if (e.key === "Escape") setShowPasteId(null);
                          }}
                        />
                        <Button onClick={() => handleLoadPasted(token.id)} className="h-7 text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2">
                          Load
                        </Button>
                        <Button onClick={() => setShowPasteId(null)} variant="outline" className="h-7 text-[9px] px-2">
                          ✕
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
