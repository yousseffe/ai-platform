"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Loader2, Activity, AlertTriangle, TrendingUp } from "lucide-react";
import { useSession } from "next-auth/react";
import { useWorkspace } from "@/hooks/use-workspace";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import SecurityAlertsPanel from "@/components/admin/SecurityAlertsPanel";
import FraudRiskInspector from "@/components/admin/FraudRiskInspector";

interface FraudSummary {
  totalEvents: number;
  highRiskCount: number;
  firingAlerts: number;
  modelsScanned: number;
}

/**
 * Fraud & Security Intelligence page.
 * Displays platform-wide risk event summaries, security alerts, and an
 * interactive fraud risk inspector for individual model deep-dives.
 *
 * @returns The admin fraud page component.
 */
export default function AdminFraudPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { isAdmin, isLoading: isWorkspaceLoading, fetchWorkspaceDetails } = useWorkspace();
  const [summary, setSummary] = useState<FraudSummary | null>(null);

  useEffect(() => {
    if (session) fetchWorkspaceDetails(session);
  }, [session, fetchWorkspaceDetails]);

  useEffect(() => {
    if (!isWorkspaceLoading && !isAdmin) {
      toast.error("Access denied: Admin permissions required");
      router.push("/dashboard");
    }
  }, [isAdmin, isWorkspaceLoading, router]);

  useEffect(() => {
    if (!isAdmin) return;
    const loadSummary = async () => {
      try {
        const [events, alerts] = await Promise.all([
          smartFetch<{ id: string; riskScore: number; modelId: string }[]>("/fraud/admin/events?limit=100"),
          smartFetch<{ status: string }[]>("/analytics/admin/alerts"),
        ]);
        const eventsArr = Array.isArray(events) ? events : [];
        const alertsArr = Array.isArray(alerts) ? alerts : [];
        setSummary({
          totalEvents: eventsArr.length,
          highRiskCount: eventsArr.filter((e) => e.riskScore >= 75).length,
          firingAlerts: alertsArr.filter((a) => a.status === "firing").length,
          modelsScanned: new Set(eventsArr.map((e) => e.modelId)).size,
        });
      } catch (err: unknown) {
        console.error(err);
      }
    };
    loadSummary();
  }, [isAdmin]);

  if (isWorkspaceLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-foreground font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2.5 text-xs">Authenticating Admin Access...</span>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Risk Events",
      value: summary?.totalEvents ?? "—",
      icon: <Activity className="w-4.5 h-4.5" />,
      color: "text-blue-500",
      bgColor: "text-blue-500/10",
    },
    {
      label: "High Risk (≥75)",
      value: summary?.highRiskCount ?? "—",
      icon: <AlertTriangle className="w-4.5 h-4.5" />,
      color: "text-red-500",
      bgColor: "text-red-500/10",
    },
    {
      label: "Firing Alerts",
      value: summary?.firingAlerts ?? "—",
      icon: <ShieldAlert className="w-4.5 h-4.5" />,
      color: "text-amber-500",
      bgColor: "text-amber-500/10",
    },
    {
      label: "Models Scanned",
      value: summary?.modelsScanned ?? "—",
      icon: <TrendingUp className="w-4.5 h-4.5" />,
      color: "text-purple-500",
      bgColor: "text-purple-500/10",
    },
  ];

  return (
    <div className="w-full space-y-6 text-foreground font-sans text-xs animate-fade-in relative min-h-screen pb-12">
      {/* Decorative background glows */}
      <div className="glow-spot" />
      <div className="glow-spot-secondary" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/80 pb-5 relative z-10">
        <div className="text-left">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2 font-sans">
            <ShieldAlert className="w-5 h-5 text-primary" />
            Fraud & Security Intelligence
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            Real-time risk detection, security alerts, and per-model threat assessment.
          </p>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
        {statCards.map(({ label, value, icon, color, bgColor }) => (
          <Card key={label} className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300 relative overflow-hidden">
            <CardContent className="p-5 flex flex-col justify-between h-28 text-left">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {label}
                </span>
                <div className={`p-2 rounded-xl border border-border/40 ${bgColor} ${color} shrink-0`}>
                  {icon}
                </div>
              </div>
              <div className="flex items-baseline mt-2">
                <p className={`text-2xl font-extrabold tracking-tight ${color}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px] relative z-10">
        {/* Left: Security alerts */}
        <div className="lg:col-span-5 border border-border/80 rounded-2xl bg-card/65 shadow-xs backdrop-blur-md p-5 flex flex-col min-h-[560px] hover-lift transition-all duration-300">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2 text-left border-b border-border/30 pb-3">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            Security Alerts & Risk Events
          </p>
          <div className="flex-1 min-h-0">
            <SecurityAlertsPanel />
          </div>
        </div>

        {/* Right: Risk inspector */}
        <div className="lg:col-span-7 border border-border/80 rounded-2xl bg-card/65 shadow-xs backdrop-blur-md p-5 flex flex-col min-h-[560px] hover-lift transition-all duration-300">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2 text-left border-b border-border/30 pb-3">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            Model Risk Inspector
          </p>
          <div className="flex-1 min-h-0">
            <FraudRiskInspector />
          </div>
        </div>
      </div>
    </div>
  );
}
