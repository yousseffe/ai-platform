"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bot, AlertTriangle, ShieldCheck, ArrowUpRight, Loader2, Save, Sparkles, Sliders, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { toast } from "react-hot-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface InsightsEngineProps {
  caps: Record<string, { cpuPercent: number; ramMb: number }>;
  recommendations: any[];
  alerts: any[];
  onRefresh: () => void;
}

export default function InsightsEngine({
  caps,
  recommendations,
  alerts,
  onRefresh,
}: InsightsEngineProps) {
  const [editedCaps, setEditedCaps] = useState<Record<string, { cpuPercent: number; ramMb: number }>>({});
  const [savingCaps, setSavingCaps] = useState(false);
  const [processingUpgradeId, setProcessingUpgradeId] = useState<string | null>(null);

  useEffect(() => {
    if (caps) {
      setEditedCaps(JSON.parse(JSON.stringify(caps)));
    }
  }, [caps]);

  const handleCapChange = (type: string, field: "cpuPercent" | "ramMb", value: string) => {
    const numeric = parseFloat(value) || 0;
    setEditedCaps((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: numeric,
      },
    }));
  };

  const handleSaveCaps = async () => {
    setSavingCaps(true);
    try {
      await smartFetch("/admin/dashboard/caps", {
        method: "PATCH",
        body: JSON.stringify(editedCaps),
      });
      toast.success("Model resource caps saved successfully!");
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update model caps");
    } finally {
      setSavingCaps(false);
    }
  };

  const handleUpgradeModel = async (rec: any) => {
    setProcessingUpgradeId(rec.modelId);
    try {
      await smartFetch(`/admin/dashboard/insights/upgrade-model/${rec.modelId}`, {
        method: "POST",
        body: JSON.stringify({
          suggestedPrice: rec.suggestedPrice,
          suggestedTier: rec.suggestedTier,
        }),
      });
      toast.success(`Upgraded Model '${rec.modelName}' successfully!`);
      onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upgrade failed");
    } finally {
      setProcessingUpgradeId(null);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="grid gap-6 md:grid-cols-2">
        {/* 1. Resource Caps Configuration */}
        <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30 bg-muted/5 px-5 py-4">
            <div className="text-left space-y-0.5">
              <CardTitle className="text-sm font-bold text-foreground">Resource Caps Management</CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground font-sans">
                Set CPU and Memory caps limits per model type. Containers violating these caps are automatically upgraded.
              </CardDescription>
            </div>
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 dark:bg-primary/5 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="space-y-3.5">
              {Object.keys(editedCaps).map((type) => (
                <div key={type} className="grid grid-cols-3 gap-4 items-center text-xs font-sans">
                  <span className="font-bold text-foreground text-left">{type}</span>
                  <div className="flex items-center gap-1.5 border border-border/80 bg-background rounded-xl px-2.5 py-1.5 focus-within:border-primary/80 transition-all">
                    <span className="text-[9px] text-muted-foreground font-bold">CPU:</span>
                    <input
                      type="number"
                      value={editedCaps[type]?.cpuPercent ?? ""}
                      onChange={(e) => handleCapChange(type, "cpuPercent", e.target.value)}
                      className="w-full bg-transparent border-none text-foreground text-center outline-hidden text-[10px] font-bold"
                    />
                    <span className="text-[9px] text-muted-foreground font-bold">%</span>
                  </div>
                  <div className="flex items-center gap-1.5 border border-border/80 bg-background rounded-xl px-2.5 py-1.5 focus-within:border-primary/80 transition-all">
                    <span className="text-[9px] text-muted-foreground font-bold">RAM:</span>
                    <input
                      type="number"
                      value={editedCaps[type]?.ramMb ?? ""}
                      onChange={(e) => handleCapChange(type, "ramMb", e.target.value)}
                      className="w-full bg-transparent border-none text-foreground text-center outline-hidden text-[10px] font-bold"
                    />
                    <span className="text-[9px] text-muted-foreground font-bold">MB</span>
                  </div>
                </div>
              ))}
            </div>
            <Button
              onClick={handleSaveCaps}
              disabled={savingCaps}
              className="btn-primary w-full h-9 font-bold font-sans text-[10px] flex items-center justify-center gap-1.5 cursor-pointer mt-4"
            >
              {savingCaps ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Configurations
            </Button>
          </CardContent>
        </Card>

        {/* 2. Automated Smart Recommendations */}
        <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30 bg-muted/5 px-5 py-4">
            <div className="text-left space-y-0.5">
              <CardTitle className="text-sm font-bold text-foreground">AI Pricing & Limits Optimizer</CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground font-sans">
                Algorithmic pricing recommendations based on model requests and execution stats.
              </CardDescription>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 dark:bg-amber-500/5 shrink-0">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5 max-h-[305px] overflow-y-auto">
            {recommendations.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground font-sans text-xs">
                <ShieldCheck className="w-8 h-8 text-emerald-500/40 mb-2.5 animate-bounce" />
                <span>All platform model prices & limits are optimized!</span>
              </div>
            ) : (
              <div className="space-y-3.5">
                {recommendations.map((rec) => (
                  <div
                    key={rec.modelId}
                    className="p-3.5 border border-border/80 rounded-2xl bg-secondary/15 flex flex-col gap-2.5 font-sans text-xs hover:border-primary/20 transition-all text-left"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-foreground">{rec.modelName}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                        {rec.actionType}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-sans text-left leading-relaxed">
                      {rec.reason}
                    </p>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] border-t border-border/40 pt-2.5">
                      <div className="flex flex-col gap-0.5 text-left">
                        <span className="text-muted-foreground text-[8px] font-bold">ADJUSTMENT DETAILS:</span>
                        <span className="text-foreground mt-0.5 font-semibold">
                          Price: ${rec.currentPrice} →{" "}
                          <span className="text-emerald-500 font-bold">${rec.suggestedPrice}</span>
                        </span>
                        {rec.suggestedTier !== rec.currentTier && (
                          <span className="text-foreground">
                            Tier: {rec.currentTier} →{" "}
                            <span className="text-primary font-bold">{rec.suggestedTier}</span>
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleUpgradeModel(rec)}
                        disabled={processingUpgradeId === rec.modelId}
                        className="h-8 px-4 text-[9px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold cursor-pointer rounded-xl hover-lift active-shrink"
                      >
                        {processingUpgradeId === rec.modelId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <div className="flex items-center gap-1">
                            Approve
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. System Alerts & Violations Logs */}
      <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl overflow-hidden hover-lift transition-all duration-300">
        <CardHeader className="pb-3 border-b border-border/80 bg-muted/20 px-5 py-4 flex flex-row items-center justify-between">
          <div className="text-left space-y-0.5">
            <CardTitle className="text-sm font-bold text-foreground">Recent Cap Violations & Alerts</CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground font-sans">
              Log of resource usage alerts and model price threshold warnings generated by the monitoring cron tasks.
            </CardDescription>
          </div>
          <div className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 dark:bg-red-500/5 shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
        </CardHeader>
        <CardContent className="p-0 max-h-[350px] overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground font-sans text-xs">
              No recent resource warnings or cap violations logged.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10 border-b border-border/80 text-[9px] uppercase tracking-wider text-muted-foreground">
                  <TableHead className="px-5 py-3">Alert Name</TableHead>
                  <TableHead className="px-5 py-3">Severity</TableHead>
                  <TableHead className="px-5 py-3">Summary Details</TableHead>
                  <TableHead className="px-5 py-3 text-right">Received At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.id} className="hover:bg-muted/25 transition-all">
                    <TableCell className="px-5 py-3.5 font-bold text-foreground">{a.alertName}</TableCell>
                    <TableCell className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold ${
                          a.severity === "critical"
                            ? "bg-red-500/15 text-red-500 border border-red-500/25"
                            : "bg-amber-500/15 text-amber-600 border border-amber-500/25"
                        }`}
                      >
                        <span className={`h-1 w-1 rounded-full ${a.severity === "critical" ? "bg-red-500" : "bg-amber-500"}`} />
                        {a.severity.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-muted-foreground text-left max-w-sm font-sans leading-relaxed">
                      {a.summary}
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-right text-muted-foreground text-[10px]">
                      {new Date(a.receivedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
