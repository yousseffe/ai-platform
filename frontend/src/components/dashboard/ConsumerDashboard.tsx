"use client";

import React, { useState } from "react";
import { Terminal, Copy, Check, ArrowRight, Coins, Zap, RefreshCw } from "lucide-react";
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
    }
  };

  const handleRotateKey = async () => {
    if (!confirm("Are you sure you want to rotate your API key? The previous token will be immediately revoked.")) {
      return;
    }
    setRotating(true);
    const res = await rotateApiKey();
    if (res.success) {
      toast.success("API Key rotated successfully!");
    } else {
      toast.error(res.error || "Failed to rotate API Key");
    }
    setRotating(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in text-foreground font-mono text-xs">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5">
        <div className="text-left">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Consumer Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your credentials, monitor your inference spend balance, and inspect query logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/explore" className="btn-primary flex items-center gap-2 font-bold py-2 px-4 rounded-lg">
            <Zap className="w-4 h-4" />
            Explore Models Marketplace
          </Link>
        </div>
      </div>

      {/* Mode indicator banner */}
      <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl text-left flex items-start gap-3">
        <Terminal className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-foreground">Active Role: API Consumer.</span> You are charged per prediction query based on the model pricing tier. Switch roles or workspaces in the sidebar.
        </div>
      </div>

      <BecomeProviderCard />

      {/* Consumer Stats Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Spend Wallet Balance */}
        <Card className="border border-border bg-card p-0 shadow-sm relative overflow-hidden text-left">
          <CardContent className="p-6">
            <div className="absolute right-4 top-4 text-primary/10">
              <Coins className="w-12 h-12" />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Consumer Balance</p>
            <CardTitle className="text-3xl font-extrabold text-foreground border-none p-0 h-auto">${balance.toFixed(2)}</CardTitle>
            <div className="mt-4">
              <Link href="/settings" className="text-xs text-primary font-bold hover:underline">
                Top Up Balance →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Inference Volume */}
        <Card className="border border-border bg-card p-0 shadow-sm relative overflow-hidden text-left">
          <CardContent className="p-6">
            <div className="absolute right-4 top-4 text-primary/10">
              <Terminal className="w-12 h-12" />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Inference Requests</p>
            <CardTitle className="text-3xl font-extrabold text-foreground border-none p-0 h-auto">{logs.length}</CardTitle>
            <p className="text-[10px] text-muted-foreground mt-4">Total queries processed in recent history</p>
          </CardContent>
        </Card>

        {/* API Credentials Token */}
        <Card className="border border-border bg-card p-0 shadow-sm relative overflow-hidden text-left md:col-span-1">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Secret API Key</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Copy API Key"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleRotateKey}
                  disabled={rotating}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Rotate API Key"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${rotating ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
            <div className="bg-background border border-border px-3 py-2 rounded-lg text-foreground truncate font-mono text-[10px] select-all select-none">
              {apiKey ? `${apiKey.substring(0, 14)}...${apiKey.substring(apiKey.length - 8)}` : "No key generated"}
            </div>
            <p className="text-[9px] text-red-400 leading-snug">
              Authenticate requests with this token via `Authorization: Bearer YOUR_TOKEN` HTTP header.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consumer Prediction Request Logs Table */}
        <InferenceLogsTable logs={logs} title="Recent Inference Query Logs" />

        {/* Quickstart Integration Guide */}
        <Card className="border border-border bg-card p-5 text-left font-mono flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <h3 className="font-bold text-foreground text-xs uppercase tracking-wide flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-primary" />
              API Integration
            </h3>
            <div className="space-y-3 text-[11px] leading-relaxed text-muted-foreground">
              <div className="space-y-1">
                <p className="font-bold text-foreground">1. Authenticate Request Headers</p>
                <p>Pass your client secret token inside your request headers:</p>
                <pre className="bg-background border border-border p-1.5 rounded text-[9px] text-indigo-350 overflow-x-auto">
                  Authorization: Bearer YOUR_TOKEN
                </pre>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground">2. Execute Prediction Queries</p>
                <p>Query any marketplace model endpoint at the prediction route:</p>
                <pre className="bg-background border border-border p-1.5 rounded text-[9px] text-indigo-350 overflow-x-auto">
                  POST /models/:modelId/predict
                </pre>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground">3. Monitor Ledgers Logs</p>
                <p>Each execution deducts credits from your balance and is recorded here.</p>
              </div>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-border">
            <Link
              href="/explore"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-semibold text-foreground hover:text-foreground transition-all cursor-pointer"
            >
              Explore Catalog <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
