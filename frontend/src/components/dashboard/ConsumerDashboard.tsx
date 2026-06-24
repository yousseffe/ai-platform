"use client";

import React, { useState } from "react";
import { Terminal, Copy, Check, ArrowRight, Coins, Zap, RefreshCw, Key, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useWorkspace } from "@/hooks/use-workspace";
import { ModelLog } from "@/types";
import { InferenceLogsTable } from "./InferenceLogsTable";
import BecomeProviderCard from "./BecomeProviderCard";
import { toast } from "react-hot-toast";

interface ConsumerDashboardProps {
  logs: ModelLog[];
}

/**
 * Consumer Dashboard View.
 * Tailored explicitly to API Consumers: displays active spend balance, request volume logs,
 * credential management inputs (with inline copy and rotation triggers), and inference queries histories.
 * Refactored for clean Expo Go console aesthetics.
 */
export default function ConsumerDashboard({ logs }: ConsumerDashboardProps) {
  const { balance, apiKey, rotateApiKey } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("API key copied to clipboard");
    } catch (e) {
      console.error(e);
      toast.error("Failed to copy API key");
    }
  };

  const handleRotateKey = async () => {
    const confirmation = window.confirm(
      "Are you sure you want to rotate your API key? The previous token will be immediately revoked."
    );
    if (!confirmation) return;

    setRotating(true);
    try {
      const res = await rotateApiKey();
      if (res.success) {
        toast.success("API Key rotated successfully!");
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
    <div className="w-full space-y-5 animate-fade-in text-foreground font-sans">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div className="text-left">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2 tracking-tight">
            <Coins className="w-5 h-5 text-primary" strokeWidth={2.5} />
            Consumer Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your credentials, monitor your inference spend balance, and inspect query logs.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary via-primary-600 to-primary-700 hover:opacity-95 text-primary-foreground font-bold px-4 h-9 rounded-lg text-xs shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />
            Explore Marketplace
          </Link>
        </div>
      </div>

      {/* Mode indicator banner */}
      <div className="p-3.5 bg-primary/[0.03] dark:bg-primary/[0.05] border border-primary/20 dark:border-primary/35 rounded-xl text-left flex items-center gap-3.5 text-xs text-muted-foreground shadow-sm">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/15 shrink-0">
          <Terminal className="w-4 h-4" strokeWidth={2} />
        </div>
        <div className="flex-1 leading-relaxed">
          <strong className="font-semibold text-primary mr-1">Active Role: API Consumer.</strong> You are charged per prediction query based on the model pricing tier. Switch roles or workspaces in the sidebar.
        </div>
      </div>

      <BecomeProviderCard />

      {/* Consumer Stats Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Spend Wallet Balance */}
        <Card className="border border-border bg-card border-l-4 border-l-primary shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden text-left rounded-xl">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[115px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Consumer Balance</p>
                <CardTitle className="text-2xl font-extrabold text-foreground border-none p-0 h-auto mt-1 tracking-tight">${balance.toFixed(2)}</CardTitle>
              </div>
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/15">
                <Coins className="w-4 h-4" strokeWidth={2} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40">
              <Link href="/settings" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                Top Up Balance <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Inference Volume */}
        <Card className="border border-border bg-card border-l-4 border-l-blue-500 shadow-sm hover:shadow-md hover:border-blue-500/30 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden text-left rounded-xl">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[115px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Inference Requests</p>
                <CardTitle className="text-2xl font-extrabold text-foreground border-none p-0 h-auto mt-1 tracking-tight">{logs.length}</CardTitle>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15">
                <Terminal className="w-4 h-4" strokeWidth={2} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40">
              <p className="text-[10px] text-muted-foreground font-mono">Total queries processed in recent history</p>
            </div>
          </CardContent>
        </Card>

        {/* API Credentials Token */}
        <Card className="border border-border bg-card border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md hover:border-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden text-left rounded-xl">
          <CardContent className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2} /> Secret API Key
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopy}
                  className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-md hover:bg-secondary border border-transparent hover:border-border transition-all"
                  title="Copy API Key"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleRotateKey}
                  disabled={rotating}
                  className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-md hover:bg-secondary border border-transparent hover:border-border transition-all"
                  title="Rotate API Key"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${rotating ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
            <div className="bg-secondary border border-border px-3 py-2 rounded-lg text-foreground truncate font-mono text-[11px] select-all select-none font-bold">
              {apiKey ? `${apiKey.substring(0, 14)}...${apiKey.substring(apiKey.length - 8)}` : "No key generated"}
            </div>
            <p className="text-[9px] text-destructive leading-snug font-medium">
              Authenticate requests with this token via `Authorization: Bearer YOUR_TOKEN` HTTP header.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Consumer Prediction Request Logs Table */}
        <InferenceLogsTable logs={logs} title="Recent Inference Query Logs" />

        {/* Quickstart Integration Guide */}
        <Card className="border border-border bg-card border-l-4 border-l-primary p-5 text-left flex flex-col justify-between shadow-sm hover:shadow-md hover:border-primary/35 transition-all duration-300 rounded-xl">
          <div className="space-y-4">
            <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" strokeWidth={2} />
              API Integration
            </h3>
            <div className="space-y-3.5 text-xs leading-relaxed text-muted-foreground font-sans">
              <div className="space-y-1.5">
                <p className="font-bold text-foreground text-[11.5px]">1. Authenticate Request Headers</p>
                <p className="text-[11px] leading-relaxed">Pass your client secret token inside your request headers:</p>
                <pre className="bg-[#121316] text-[#ededed] border border-[#222326] p-2 rounded-lg text-[10px] font-mono overflow-x-auto select-all">
                  Authorization: Bearer YOUR_TOKEN
                </pre>
              </div>
              <div className="space-y-1.5">
                <p className="font-bold text-foreground text-[11.5px]">2. Execute Prediction Queries</p>
                <p className="text-[11px] leading-relaxed">Query any marketplace model endpoint at the prediction route:</p>
                <pre className="bg-[#121316] text-[#ededed] border border-[#222326] p-2 rounded-lg text-[10px] font-mono overflow-x-auto">
                  POST /models/:modelId/predict
                </pre>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground text-[11.5px]">3. Monitor Ledgers Logs</p>
                <p className="text-[11px] leading-relaxed">Each execution deducts credits from your balance and is recorded here.</p>
              </div>
            </div>
          </div>
          <div className="pt-4.5 mt-4 border-t border-border">
            <Link
              href="/explore"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-bold text-foreground hover:text-foreground transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98]"
            >
              Explore Catalog <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
