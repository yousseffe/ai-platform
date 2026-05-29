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

export default function SettingsPage() {
  const { data: session } = useSession();
  const [apiKey, setApiKey] = useState("sk_live_51Ny93KLo8zPxqE6m9A4b8d7c1e3f5g...");
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRotateKey = () => {
    setRotating(true);
    setTimeout(() => {
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let key = "sk_live_";
      for (let i = 0; i < 32; i++) {
        key += chars[Math.floor(Math.random() * chars.length)];
      }
      setApiKey(key + "...");
      setRotating(false);
    }, 800);
  };

  const userEmail = session?.user?.email || "user@modelops.ai";
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    userEmail
  )}&background=6366f1&color=fff`;

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your account settings, API keys, and platform preferences.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Card */}
        <div className="card border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5 mb-5">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-200">
              <Image src={avatarUrl} alt="Avatar" width={48} height={48} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Account Profile</h2>
              <p className="text-xs text-slate-400">Your registered platform account details</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label text-xs">Email Address</label>
              <input
                type="text"
                className="form-input bg-slate-50 text-slate-600 cursor-not-allowed"
                value={userEmail}
                readOnly
              />
            </div>
            <div>
              <label className="form-label text-xs">Role</label>
              <input
                type="text"
                className="form-input bg-slate-50 text-slate-600 cursor-not-allowed"
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
        <div className="card border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-5">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-primary-500">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">API Authentication Keys</h2>
              <p className="text-xs text-slate-400">Use this token to query your deployed models via SDK or REST endpoint</p>
            </div>
          </div>
          <div>
            <label className="form-label text-xs">Sandbox / Production Secret Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  className="form-input font-mono bg-slate-50 text-slate-700 pr-10"
                  value={apiKey}
                  readOnly
                />
                <button
                  onClick={handleCopy}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleRotateKey}
                disabled={rotating}
                className="btn-outline flex items-center gap-2 cursor-pointer text-sm whitespace-nowrap"
              >
                <RefreshCw className={`w-4 h-4 ${rotating ? "animate-spin" : ""}`} />
                Rotate Token
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              WARNING: Rotating this token will invalidate the previous key immediately. Update your environment files accordingly.
            </p>
          </div>
        </div>

        {/* Platform Node Info Card */}
        <div className="card border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-5">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Platform Node Specifications</h2>
              <p className="text-xs text-slate-400">Active server, ports, and runtime environment specifications</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Client Frontend</span>
              </div>
              <p className="font-semibold text-slate-800 text-sm">Next.js 15+ (App Router)</p>
              <p className="text-xs text-indigo-600 font-mono mt-1">Port: 3001</p>
            </div>
            <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">API Server</span>
              </div>
              <p className="font-semibold text-slate-800 text-sm">NestJS Gateway</p>
              <p className="text-xs text-indigo-600 font-mono mt-1">Port: 3000</p>
            </div>
            <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Database Node</span>
              </div>
              <p className="font-semibold text-slate-800 text-sm">PostgreSQL Engine</p>
              <p className="text-xs text-emerald-600 font-mono mt-1">Status: Connected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
