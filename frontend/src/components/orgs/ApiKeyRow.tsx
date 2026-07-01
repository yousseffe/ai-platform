"use client";

import React from "react";
import { Copy, KeyRound, Clock, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { OrgApiKey } from "@/lib/services/projects.service";

interface ApiKeyRowProps {
  apiKey: OrgApiKey;
  onRevoke: (keyId: string) => void;
  canRevoke: boolean;
}

/**
 * Table row for a single API key.
 * Shows label, masked prefix with copy button, status badge, last used date, and revoke button.
 *
 * @param apiKey - The OrgApiKey to display.
 * @param onRevoke - Callback triggered when the revoke button is clicked.
 * @param canRevoke - Whether the current user has RBAC permission to revoke.
 * @returns The React table row component.
 */
export default function ApiKeyRow({ apiKey, onRevoke, canRevoke }: ApiKeyRowProps) {
  const handleCopy = () => {
    navigator.clipboard
      .writeText(apiKey.keyPrefix)
      .then(() => toast.success("Key prefix copied"))
      .catch(() => toast.error("Failed to copy"));
  };

  const lastUsed = apiKey.lastUsedAt
    ? new Date(apiKey.lastUsedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Never";

  return (
    <tr className="border-b border-border/80 transition-colors hover:bg-secondary/20">
      <td className="px-4 py-4 align-top">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <KeyRound className="w-3.5 h-3.5 shrink-0" strokeWidth={1.7} />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">{apiKey.label}</span>
            {apiKey.model && (
              <p className="mt-1 text-xs text-foreground/80">
                {apiKey.model.name}
                {(apiKey.model.framework || apiKey.model.type) && (
                  <span className="text-muted-foreground">
                    {" "}· {[apiKey.model.framework, apiKey.model.type].filter(Boolean).join(" · ")}
                  </span>
                )}
              </p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              Created {new Date(apiKey.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
          <code className="text-xs text-muted-foreground font-mono">
            {apiKey.keyPrefix}
          </code>
          <button
            onClick={handleCopy}
            title="Copy"
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        {apiKey.isActive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-3 h-3" strokeWidth={2} /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <XCircle className="w-3 h-3" strokeWidth={2} /> Revoked
          </span>
        )}
      </td>
      <td className="px-4 py-4 align-top">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3 shrink-0" strokeWidth={1.5} />
          {lastUsed}
        </div>
      </td>
      <td className="px-4 py-4 text-right align-top">
        {canRevoke && apiKey.isActive && (
          <button
            onClick={() => onRevoke(apiKey.id)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-transparent px-3 py-2 text-xs font-semibold text-destructive transition-all hover:border-destructive/20 hover:bg-destructive/8"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            Revoke
          </button>
        )}
      </td>
    </tr>
  );
}
