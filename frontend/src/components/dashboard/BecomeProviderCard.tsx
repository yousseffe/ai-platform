"use client";

import React, { useState } from "react";
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Premium onboarding banner allowing consumers to enroll as platform model providers.
 * Migrated to Shadcn UI components for polished visual consistency.
 *
 * @returns The React component rendering the Provider Enrollment card.
 */
export default function BecomeProviderCard() {
  const { activeWorkspace, isProviderModeEnabled, becomeProvider } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Enrolls the current personal workspace context in Provider Mode.
   */
  const handleEnroll = async () => {
    setLoading(true);
    setError("");
    const res = await becomeProvider();
    setLoading(false);
    if (res.success) {
      alert("Provider mode successfully enabled! You can now toggle Provider Mode in the Sidebar.");
    } else {
      setError(res.error || "Failed to enable provider mode");
    }
  };

  if (!activeWorkspace) return null;

  if (activeWorkspace.type === "ORG") {
    return (
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3 pb-5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-800">Workspace Capabilities</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Collaborative workspaces support both consumer and provider workflows automatically.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 p-4 rounded-xl">
            This organization is enrolled as a dual-role publisher. Use the <strong className="text-slate-800">Consumer / Provider Mode</strong> toggle in the Sidebar to switch between buying credits and publishing model API endpoints.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 shadow-sm overflow-hidden relative">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-indigo-50 border-none text-indigo-700 hover:bg-indigo-50 text-[10px] font-bold tracking-wider py-1 px-2.5 uppercase">
                Become a Provider
              </Badge>
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
            </div>
            <CardTitle className="font-extrabold text-slate-800 text-lg">Publish Models & Earn Revenue</CardTitle>
            <CardDescription className="text-xs text-slate-500 leading-relaxed max-w-xl">
              Register individual model container weights, serve API calls on optimized GPU servers, and get paid withdrawable earnings in real-time.
            </CardDescription>

            {error && (
              <p className="text-xs text-red-500 font-semibold bg-red-50 border border-red-100 p-2 rounded-lg w-fit">
                {error}
              </p>
            )}
          </div>

          <div>
            {isProviderModeEnabled ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" /> Provider Mode Active
              </div>
            ) : (
              <Button
                onClick={handleEnroll}
                disabled={loading}
                className="bg-primary-500 hover:bg-primary-600 text-white py-2.5 px-5 text-xs font-bold flex items-center gap-2 whitespace-nowrap shadow-sm shadow-primary-500/20 cursor-pointer"
              >
                {loading ? "Activating..." : "Enable Provider Mode"}{" "}
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
