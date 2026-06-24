"use client";
 
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  Key,
  Database,
  Cpu,
  Copy,
  Check,
  RefreshCw,
  Server
} from "lucide-react";
import BecomeProviderCard from "@/components/dashboard/BecomeProviderCard";
import WalletTopUpCard from "@/components/dashboard/WalletTopUpCard";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "react-hot-toast";

/**
 * SettingsPage component for user account configurations,
 * API token rotation, and local development spec grids.
 */
export default function SettingsPage() {
  const { data: session } = useSession();
  const { apiKey, rotateApiKey } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRotateKey = async () => {
    if (!confirm("Are you sure you want to rotate your API key? Previous key will be revoked immediately.")) {
      return;
    }
    setRotating(true);
    const res = await rotateApiKey();
    if (res.success) {
      toast.success("API key rotated successfully!");
    } else {
      toast.error(res.error || "Failed to rotate API Key");
    }
    setRotating(false);
  };

  const userEmail = session?.user?.email || "user@mlhub.ai";
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    userEmail
  )}&background=2f81f7&color=fff`;

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-12 text-foreground">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-foreground font-mono">Settings</h1>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          Manage your account settings, API keys, and platform preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className="card font-mono text-xs">
          <div className="flex items-center gap-4 border-b border-border pb-5 mb-5 select-none">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-border">
              <Image src={avatarUrl} alt="Avatar" width={48} height={48} />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm">Account Profile</h2>
              <p className="text-[10px] text-muted-foreground">Your registered platform account details</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Email Address</label>
              <input
                type="text"
                className="form-input bg-background border-border text-muted-foreground cursor-not-allowed"
                value={userEmail}
                readOnly
              />
            </div>
            <div>
              <label className="form-label">Role</label>
              <input
                type="text"
                className="form-input bg-background border-border text-muted-foreground cursor-not-allowed"
                value="Platform User"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Dual Roles / Become Provider Mode Enrollment Banner */}
        <BecomeProviderCard />

        {/* Stripe Wallet Top-up */}
        <WalletTopUpCard />

        {/* API Credentials Card */}
        <div className="card font-mono text-xs">
          <div className="flex items-center gap-3 border-b border-border pb-5 mb-5 select-none">
            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm">API Authentication Keys</h2>
              <p className="text-[10px] text-muted-foreground">Use this token to query your deployed models via SDK or REST endpoint</p>
            </div>
          </div>
          <div>
            <label className="form-label">Sandbox / Production Secret Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  className="form-input bg-background border-border text-foreground pr-10"
                  value={apiKey}
                  readOnly
                />
                <button
                  onClick={handleCopy}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleRotateKey}
                disabled={rotating}
                className="btn-outline flex items-center gap-2 cursor-pointer text-xs whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rotating ? "animate-spin" : ""}`} />
                Rotate Token
              </button>
            </div>
            <p className="text-[9px] text-red-400 mt-2 leading-relaxed">
              WARNING: Rotating this token will invalidate the previous key immediately. Update your environment files accordingly.
            </p>
          </div>
        </div>

        {/* Platform Node Info Card */}
        <div className="card font-mono text-xs">
          <div className="flex items-center gap-3 border-b border-border pb-5 mb-5 select-none">
            <div className="w-10 h-10 rounded bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-450">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm">Platform Node Specifications</h2>
              <p className="text-[10px] text-muted-foreground">Active server, ports, and runtime environment specifications</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-border rounded-lg p-4 bg-background">
              <div className="flex items-center gap-2 mb-2 select-none">
                <Cpu className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Client Frontend</span>
              </div>
              <p className="font-bold text-foreground text-xs">Next.js 16 (App Router)</p>
              <p className="text-xs text-primary font-bold mt-1">Port: 3001</p>
            </div>
            <div className="border border-border rounded-lg p-4 bg-background">
              <div className="flex items-center gap-2 mb-2 select-none">
                <Server className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">API Server</span>
              </div>
              <p className="font-bold text-foreground text-xs">NestJS Gateway</p>
              <p className="text-xs text-primary font-bold mt-1">Port: 5000</p>
            </div>
            <div className="border border-border rounded-lg p-4 bg-background">
              <div className="flex items-center gap-2 mb-2 select-none">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Database Node</span>
              </div>
              <p className="font-bold text-foreground text-xs">PostgreSQL Engine</p>
              <p className="text-xs text-emerald-450 font-bold mt-1">Status: Connected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
