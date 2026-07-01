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
      icon: <Activity className="w-7 h-7" />,
      color: "text-blue-500",
      bgColor: "text-blue-500/10",
    },
    {
      label: "High Risk (≥75)",
      value: summary?.highRiskCount ?? "—",
      icon: <AlertTriangle className="w-7 h-7" />,
      color: "text-red-500",
      bgColor: "text-red-500/10",
    },
    {
      label: "Firing Alerts",
      value: summary?.firingAlerts ?? "—",
      icon: <ShieldAlert className="w-7 h-7" />,
      color: "text-amber-500",
      bgColor: "text-amber-500/10",
    },
    {
      label: "Models Scanned",
      value: summary?.modelsScanned ?? "—",
      icon: <TrendingUp className="w-7 h-7" />,
      color: "text-purple-500",
      bgColor: "text-purple-500/10",
    },
  ];

  return (
    <div className="w-full space-y-6 text-foreground font-mono text-xs animate-fade-in">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-primary" />
          Fraud & Security Intelligence
        </h1>
        <p className="text-xs text-muted-foreground mt-1 font-sans">
          Real-time risk detection, security alerts, and per-model threat assessment.
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon, color }) => (
          <Card key={label} className="border border-border bg-card p-0 shadow-xs relative overflow-hidden hover:border-primary/20 transition-all">
            <CardContent className="p-4">
              <div className={`absolute right-3 top-3 ${color} opacity-10`}>{icon}</div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-2xl font-extrabold font-mono ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left: Security alerts */}
        <div className="lg:col-span-5 border border-border rounded-2xl bg-card p-4 flex flex-col min-h-[560px]">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            Security Alerts & Risk Events
          </p>
          <div className="flex-1 min-h-0">
            <SecurityAlertsPanel />
          </div>
        </div>

        {/* Right: Risk inspector */}
        <div className="lg:col-span-7 border border-border rounded-2xl bg-card p-4 flex flex-col min-h-[560px]">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
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
