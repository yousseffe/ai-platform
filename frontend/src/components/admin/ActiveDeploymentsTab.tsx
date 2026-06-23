"use client";

import React from "react";
import { Cpu, Edit2, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminModel } from "@/types";

interface ActiveDeploymentsTabProps {
  /** Array of model registries with container metrics */
  models: AdminModel[];
  /** Flag representing if models are loading */
  loading: boolean;
  /** Callback triggered to reload active models list */
  onRefresh: () => Promise<void>;
  /** Callback triggered to open adjusting pricing dialog modal */
  onEditPricing: (model: AdminModel) => void;
}

/**
 * Renders the Container Metrics Registry listing active model deployments,
 * port mappings, live resource usage, and pricing configs.
 *
 * @param props - Component parameters including models list and actions.
 * @returns The React component for Active Deployments tab.
 */
export default function ActiveDeploymentsTab({
  models,
  loading,
  onRefresh,
  onEditPricing,
}: ActiveDeploymentsTabProps) {
  return (
    <div className="space-y-6 animate-fade-in text-left">
      <Card className="border border-border bg-card shadow-sm p-0 overflow-hidden">
        <CardHeader className="p-5 border-b border-border bg-accent/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">Container Metrics Registry</CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground mt-0.5">
              Currently running inference containers, port mapping, and live CPU/RAM utilization.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 text-[10px] gap-1 px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
              <span>Polling Docker Engine...</span>
            </div>
          ) : models.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="w-full text-left border-collapse">
                <TableHeader>
                  <TableRow className="bg-background border-b border-border hover:bg-background">
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Model</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Status</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Host Port</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">CPU Usage</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">RAM Memory</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Cost / Req</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Split Share</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border text-xs font-mono">
                  {models.map((model) => {
                    const isActive = model.status === "ACTIVE";
                    const costVal = typeof model.costPerRequest === "string" ? parseFloat(model.costPerRequest) : model.costPerRequest;
                    return (
                      <TableRow key={model.id} className="hover:bg-accent/40 border-b border-border">
                        <TableCell className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{model.name}</span>
                            <span className="text-[9px] text-muted-foreground mt-0.5">Owner: {model.owner}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3.5">
                          <Badge
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              isActive
                                ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                                : "bg-slate-900/60 text-slate-400 border-slate-700/50"
                            }`}
                          >
                            {model.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-5 py-3.5 font-bold text-primary">
                          {model.port ? `:${model.port}` : "—"}
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-foreground font-mono">
                          <span className="flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                            {model.cpu}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-foreground font-mono">
                          {model.ram}
                        </TableCell>
                        <TableCell className="px-5 py-3.5 font-bold text-foreground">
                          ${costVal.toFixed(2)}
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-muted-foreground">
                          {model.providerSharePercent}% Provider / {100 - model.providerSharePercent}% Platform
                        </TableCell>
                        <TableCell className="px-5 py-3.5 text-right font-sans">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditPricing(model)}
                            className="h-7 text-[10px] font-bold text-primary hover:bg-primary/10 gap-1 cursor-pointer font-mono"
                          >
                            <Edit2 className="w-3 h-3" /> Adjust Pricing
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No models have been published to the registry yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
