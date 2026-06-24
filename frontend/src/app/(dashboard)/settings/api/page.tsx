"use client";

import React, { useState } from "react";
import { Key, Copy, Check, RefreshCw, Terminal } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "react-hot-toast";

/**
 * Settings Page: API Authentication.
 * Handles secret tokens keys, copy feedback toasts, and key rotations triggers.
 */
export default function ApiSettingsPage() {
  const { apiKey, rotateApiKey } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.success("API key copied to clipboard");
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
      toast.error("Failed to copy API key");
    }
  };

  const handleRotateKey = async () => {
    const confirmation = window.confirm(
      "Are you sure you want to rotate your API key? Previous key will be revoked immediately."
    );
    if (!confirmation) return;

    setRotating(true);
    try {
      const res = await rotateApiKey();
      if (res.success) {
        toast.success("API key rotated successfully!");
      } else {
        toast.error(res.error || "Failed to rotate API Key");
      }
    } catch {
      toast.error("Failed to rotate API Key");
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in text-left">
      <div className="card p-5 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4 mb-4 select-none">
          <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
            <Key className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-xs">API Authentication Keys</h2>
            <p className="text-[10px] text-muted-foreground">Authenticate your model predictions via client SDK or REST requests</p>
          </div>
        </div>

        <div className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Secret Account Token</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground pr-10 outline-none font-mono font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  value={apiKey}
                  readOnly
                />
                <button
                  onClick={handleCopy}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded hover:bg-secondary transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleRotateKey}
                disabled={rotating}
                className="btn-outline flex items-center gap-1.5 cursor-pointer text-xs whitespace-nowrap h-9 rounded-lg"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rotating ? "animate-spin" : ""}`} />
                Rotate Token
              </button>
            </div>
            <p className="text-[10px] text-destructive mt-1.5 leading-relaxed font-sans">
              WARNING: Rotating this token will invalidate the previous key immediately. Update your environment configs accordingly.
            </p>
          </div>

          {/* API key integration snippet example */}
          <div className="border border-border rounded-lg p-3.5 bg-secondary/20 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Terminal className="w-4 h-4" />
              <span className="font-semibold text-foreground text-[11px]">Integration Example</span>
            </div>
            <pre className="bg-[#121316] text-[#ededed] border border-[#222326] p-2.5 rounded-lg text-[10px] font-mono overflow-x-auto font-medium">
              curl -X POST &quot;http://localhost:3000/models/MODEL_ID/predict&quot; \<br />
              &nbsp;&nbsp;-H &quot;Authorization: Bearer YOUR_TOKEN&quot; \<br />
              &nbsp;&nbsp;-H &quot;Content-Type: application/json&quot; \<br />
              &nbsp;&nbsp;-d &apos;&#123;&quot;input&quot;: &quot;data&quot;&#125;&apos;
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
