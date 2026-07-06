"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, ShieldAlert, TrendingUp, AlertTriangle, Loader2, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { AdminModel } from "@/types";
import { toast } from "react-hot-toast";

interface RiskEvent {
  id: string;
  modelId: string;
  riskScore: number;
  threatClass: string;
  firedRules: { rule: string; detail: string }[];
  recommendations: string[];
  windowMinutes: number;
  createdAt: string;
}

interface RiskReport {
  modelId: string;
  modelName: string;
  ownerEmail: string | null;
  currentRiskScore: number;
  currentThreatClass: string | null;
  averageRating: number;
  reviewCount: number;
  baseline: {
    ewmaRequestRatePerMin: number;
    ewmaErrorRate: number;
    updatedAt: string;
  } | null;
  events: RiskEvent[];
}

const RISK_COLOR = (score: number) => {
  if (score >= 75) return "text-red-500";
  if (score >= 50) return "text-amber-500";
  if (score > 0) return "text-yellow-500";
  return "text-emerald-500";
};

const RISK_BG = (score: number) => {
  if (score >= 75) return "bg-red-500/10 border-red-500/20";
  if (score >= 50) return "bg-amber-500/10 border-amber-500/20";
  if (score > 0) return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-emerald-500/10 border-emerald-500/20";
};

/**
 * Fraud Risk Inspector panel.
 * Lets the admin search for a model and view its full fraud/risk report including
 * current risk score, threat class, EWMA baseline, and historical risk events.
 *
 * @returns The React component.
 */
export default function FraudRiskInspector() {
  const [models, setModels] = useState<AdminModel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [report, setReport] = useState<RiskReport | null>(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await smartFetch<AdminModel[]>("/admin/models");
        setModels(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to load models");
      } finally {
        setLoadingModels(false);
      }
    };
    fetchModels();
  }, []);

  const fetchReport = useCallback(async (modelId: string) => {
    setLoadingReport(true);
    setReport(null);
    try {
      const data = await smartFetch<RiskReport>(`/fraud/admin/models/${modelId}/risk-report`);
      setReport(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load risk report");
    } finally {
      setLoadingReport(false);
    }
  }, []);

  const handleSelect = (model: AdminModel) => {
    setSelectedModelId(model.id);
    setSearchQuery(model.name);
    setShowDropdown(false);
    fetchReport(model.id);
  };

  const filteredModels = models.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Model search */}
      <div className="relative">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search model name..."
              className="pl-9 h-9 text-xs"
            />
          </div>
          {selectedModelId && (
            <Button onClick={() => fetchReport(selectedModelId)} disabled={loadingReport} variant="outline" className="h-9 text-[10px] shrink-0">
              {loadingReport ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refresh"}
            </Button>
          )}
        </div>
        {showDropdown && searchQuery && filteredModels.length > 0 && (
          <div className="absolute z-20 w-full mt-1 border border-border bg-card rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {filteredModels.slice(0, 8).map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelect(model)}
                className="w-full text-left px-3 py-2 hover:bg-secondary/60 transition-colors flex items-center justify-between"
              >
                <span className="text-[11px] font-bold text-foreground">{model.name}</span>
                <span className="text-[9px] text-muted-foreground font-mono">{model.tier}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Report content */}
      {loadingReport && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!loadingReport && !report && !loadingModels && (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <ShieldAlert className="w-10 h-10 text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground font-sans">Search for a model to view its risk report</p>
        </div>
      )}

      {report && !loadingReport && (
        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Score card */}
          <div className={`rounded-xl border p-4 flex items-center gap-4 ${RISK_BG(report.currentRiskScore)}`}>
            <div className="text-center">
              <p className={`text-4xl font-extrabold ${RISK_COLOR(report.currentRiskScore)}`}>
                {report.currentRiskScore}
              </p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mt-0.5">Risk Score</p>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground text-left">{report.modelName}</p>
              {report.ownerEmail && <p className="text-[10px] text-muted-foreground font-sans text-left">{report.ownerEmail}</p>}
              {report.currentThreatClass && (
                <span className={`inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full border ${RISK_BG(report.currentRiskScore)} ${RISK_COLOR(report.currentRiskScore)}`}>
                  {report.currentThreatClass}
                </span>
              )}
              {!report.currentThreatClass && (
                <span className="inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-500">
                  CLEAN
                </span>
              )}
            </div>
            <div className="text-right text-[9px] text-muted-foreground space-y-1">
              <p>Rating: <span className="font-bold text-foreground">{report.averageRating.toFixed(1)}</span></p>
              <p>Reviews: <span className="font-bold text-foreground">{report.reviewCount}</span></p>
            </div>
          </div>

          {/* Baseline */}
          {report.baseline && (
            <Card className="border border-border bg-card rounded-xl">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle className="text-xs font-bold flex items-center gap-2 text-left">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                  EWMA Traffic Baseline
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-secondary/20 p-3 text-center">
                  <p className="text-lg font-extrabold text-foreground">
                    {Number(report.baseline.ewmaRequestRatePerMin).toFixed(2)}
                  </p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">req/min (EWMA)</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/20 p-3 text-center">
                  <p className="text-lg font-extrabold text-foreground">
                    {(Number(report.baseline.ewmaErrorRate) * 100).toFixed(1)}%
                  </p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">error rate (EWMA)</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent events */}
          {report.events.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                Recent Risk Events ({report.events.length})
              </p>
              {report.events.slice(0, 5).map((event) => (
                <Card key={event.id} className={`border rounded-xl ${RISK_BG(event.riskScore)}`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-3.5 h-3.5 ${RISK_COLOR(event.riskScore)}`} />
                        <span className={`text-[10px] font-bold ${RISK_COLOR(event.riskScore)}`}>
                          Score {event.riskScore} — {event.threatClass}
                        </span>
                      </div>
                      <span className="text-[8px] text-muted-foreground font-mono">
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {event.firedRules.length > 0 && (
                      <div className="space-y-0.5">
                        {event.firedRules.map((r, i) => (
                          <p key={i} className="text-[9px] text-foreground/70 font-sans">
                            <span className="font-bold text-foreground">{r.rule}:</span> {r.detail}
                          </p>
                        ))}
                      </div>
                    )}
                    {event.recommendations.length > 0 && (
                      <details className="group">
                        <summary className="text-[9px] text-muted-foreground cursor-pointer flex items-center gap-1 select-none">
                          <ChevronDown className="w-2.5 h-2.5 group-open:rotate-180 transition-transform" />
                          {event.recommendations.length} recommendation{event.recommendations.length !== 1 ? "s" : ""}
                        </summary>
                        <ul className="mt-1 space-y-0.5 pl-3">
                          {event.recommendations.map((r, i) => (
                            <li key={i} className="text-[9px] text-muted-foreground font-sans list-disc list-inside">{r}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {report.events.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-[10px] text-emerald-500 font-bold">No risk events recorded for this model.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
