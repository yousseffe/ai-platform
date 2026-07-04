"use client";

import React, { useState } from "react";
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";

/**
 * Premium onboarding banner allowing consumers to enroll as platform model providers.
 * Styled in the premium Expo Go console theme with full light/dark compatibility.
 *
 * @returns The React component rendering the Provider Enrollment card.
 */
export default function BecomeProviderCard() {
  const { activeWorkspace, isProviderModeEnabled, becomeProvider } =
    useWorkspace();
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
      toast.success(
        "Provider mode enabled! You can now toggle Provider Mode in the sidebar.",
        {
          duration: 3000,
        },
      );
    } else {
      setError(res.error || "Failed to enable provider mode");
      toast.error(res.error || "Failed to enable provider mode");
    }
  };

  if (!activeWorkspace) return null;

  if (activeWorkspace.type === "ORG") {
    return (
      <Card className="border border-border bg-card shadow-sm font-sans">
        <CardHeader className="flex flex-row items-center gap-3 pb-4 border-b border-border">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-xs font-bold text-foreground">
              Workspace Capabilities
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Collaborative workspaces support both consumer and provider
              workflows automatically.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/35 border border-border p-3.5 rounded-lg">
            This organization is enrolled as a dual-role publisher. Use the{" "}
            <strong className="text-foreground font-semibold">
              Consumer / Provider Mode
            </strong>{" "}
            toggle in the sidebar to switch between buying credits and
            publishing model API endpoints.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-primary/20 bg-gradient-to-br from-primary/[0.03] via-card to-card shadow-sm overflow-hidden relative font-sans rounded-xl border-l-4 border-l-primary">
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15 text-[9px] font-bold tracking-wider py-0.5 px-2 uppercase rounded-full"
              >
                Become a Provider
              </Badge>
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            </div>
            <CardTitle className="font-bold text-foreground text-xs uppercase tracking-wider">
              Publish Models & Earn Revenue
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed max-w-xl">
              Register individual model container weights, serve API calls on
              optimized GPU servers, and get paid withdrawable earnings in
              real-time.
            </CardDescription>

            {error && (
              <p className="text-xs text-destructive font-semibold bg-destructive/10 border border-destructive/20 p-2 rounded-lg w-fit">
                {error}
              </p>
            )}
          </div>

          <div className="shrink-0">
            {isProviderModeEnabled ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold select-none">
                <ShieldCheck className="w-4 h-4" /> Provider Mode Active
              </div>
            ) : (
              <Button
                onClick={handleEnroll}
                disabled={loading}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-lg text-xs py-2 px-4 shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer"
              >
                {loading ? "Activating..." : "Enable Provider Mode"}{" "}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
