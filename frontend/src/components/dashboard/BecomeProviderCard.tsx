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
      <Card className="border border-border bg-card shadow-sm font-mono">
        <CardHeader className="flex flex-row items-center gap-3 pb-5 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-emerald-950/40 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Workspace Capabilities</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Collaborative workspaces support both consumer and provider workflows automatically.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <p className="text-xs text-muted-foreground leading-relaxed bg-background border border-border p-4 rounded-xl">
            This organization is enrolled as a dual-role publisher. Use the <strong className="text-foreground font-semibold">Consumer / Provider Mode</strong> toggle in the Sidebar to switch between buying credits and publishing model API endpoints.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border bg-card shadow-sm overflow-hidden relative font-mono">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-[9px] font-bold tracking-wider py-1 px-2.5 uppercase rounded-full">
                Become a Provider
              </Badge>
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <CardTitle className="font-extrabold text-foreground text-sm">Publish Models & Earn Revenue</CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed max-w-xl">
              Register individual model container weights, serve API calls on optimized GPU servers, and get paid withdrawable earnings in real-time.
            </CardDescription>

            {error && (
              <p className="text-xs text-red-400 font-semibold bg-red-950/40 border border-red-500/30 p-2 rounded-lg w-fit">
                {error}
              </p>
            )}
          </div>

          <div>
            {isProviderModeEnabled ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" /> Provider Mode Active
              </div>
            ) : (
              <Button
                onClick={handleEnroll}
                disabled={loading}
                className="btn-primary"
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
