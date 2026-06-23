"use client";

import React from "react";
import { Upload, Globe, Play, TrendingUp, BarChart3, Sparkles, Server, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Model, DeploymentStatus, ModelLog } from "@/types";
import { InferenceLogsTable } from "./InferenceLogsTable";

interface PublisherDashboardProps {
  models: Model[];
  balance: number;
  logs: ModelLog[];
}

/**
 * Publisher Dashboard View (Provider Console).
 * Displays published models count, served API call logs metrics, accumulated revenue balance,
 * registered models list table, and recent traffic logs served.
 * Styled in the premium Expo Go developer console style.
 *
 * @returns The React component rendering the publisher workspace metrics.
 */
export default function PublisherDashboard({
  models,
  balance,
  logs,
}: PublisherDashboardProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-in text-foreground font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div className="text-left">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Provider Console
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor published models traffic, served API executions, and platform earnings.
          </p>
        </div>
        <Link href="/models/upload" className="btn-primary flex items-center gap-1.5 font-semibold py-1.5 px-3 rounded-lg text-xs shrink-0 self-start sm:self-auto">
          <Upload className="w-3.5 h-3.5" />
          Publish Model
        </Link>
      </div>

      {/* Mode indicator banner */}
      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-left flex items-start gap-2.5 text-xs">
        <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-emerald-600 dark:text-emerald-450">Active Role: Model Provider.</span> You earn a configured split share of credits whenever consumers query your running model containers.
        </div>
      </div>

      {/* Provider Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border border-border bg-card relative overflow-hidden p-0 shadow-sm text-left rounded-xl">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Published Models</p>
                <CardTitle className="text-2xl font-bold text-foreground border-none p-0 h-auto mt-1">{models.length}</CardTitle>
              </div>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-border/40">
              <p className="text-[10px] text-muted-foreground">Active model endpoints registered</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card relative overflow-hidden p-0 shadow-sm text-left rounded-xl">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Served Requests</p>
                <CardTitle className="text-2xl font-bold text-foreground border-none p-0 h-auto mt-1">{logs.length}</CardTitle>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Play className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-border/40">
              <p className="text-[10px] text-muted-foreground">Total inference executions processed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card relative overflow-hidden p-0 shadow-sm text-left rounded-xl">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Earned Revenue</p>
                <CardTitle className="text-2xl font-bold text-foreground border-none p-0 h-auto mt-1">${balance.toFixed(2)}</CardTitle>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-border/40">
              <Link href="/settings" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                Withdraw Earnings <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Models list table for Provider */}
        <Card className="p-0 border border-border bg-card lg:col-span-2 flex flex-col justify-between overflow-hidden shadow-sm text-left rounded-xl">
          <CardHeader className="p-4 border-b border-border flex flex-col space-y-0.5 bg-secondary/10">
            <CardTitle className="font-semibold text-foreground text-xs">Published Models Registry</CardTitle>
            <p className="text-[10px] text-muted-foreground font-sans">ML models registered and hosted in this workspace context</p>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="overflow-x-auto">
              <Table className="w-full text-left border-collapse font-sans text-xs">
                <TableHeader>
                  <TableRow className="bg-secondary/20 border-b border-border hover:bg-secondary/20 select-none">
                    <TableHead className="px-4 py-2.5 font-bold text-[9px] text-muted-foreground uppercase tracking-wider h-auto">Name</TableHead>
                    <TableHead className="px-4 py-2.5 font-bold text-[9px] text-muted-foreground uppercase tracking-wider h-auto">Deployment</TableHead>
                    <TableHead className="px-4 py-2.5 font-bold text-[9px] text-muted-foreground uppercase tracking-wider h-auto">Price Per Request</TableHead>
                    <TableHead className="px-4 py-2.5 font-bold text-[9px] text-muted-foreground uppercase tracking-wider h-auto">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border text-xs text-foreground">
                  {models.length > 0 ? (
                    models.map((model) => {
                      const isActive = model.versions?.some((v) => v.deployments?.some((d) => d.status === DeploymentStatus.RUNNING));
                      const status = isActive ? "ACTIVE" : "INACTIVE";
                      const statusClass = isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/30"
                        : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-700/50";

                      return (
                        <TableRow key={model.id} className="hover:bg-secondary/30 border-b border-border transition-colors">
                          <TableCell className="px-4 py-3 font-semibold text-foreground">{model.name}</TableCell>
                          <TableCell className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                            {model.versions?.length ? `v${model.versions.length}` : "-"}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                            ${(typeof model.costPerRequest === "string" ? parseFloat(model.costPerRequest) : (model.costPerRequest || 0)).toFixed(2)}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge variant="outline" className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border ${statusClass}`}>
                              {status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="px-4 py-8 text-center text-muted-foreground font-sans text-xs">
                        No models published in this workspace context yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <div className="p-3.5 border-t border-border bg-secondary/10 text-right">
            <Link href="/models" className="text-xs font-semibold text-primary hover:underline">
              Go to Models Catalog →
            </Link>
          </div>
        </Card>

        {/* Publisher Stats / API activity throughput */}
        <Card className="border border-border bg-card flex flex-col justify-between p-0 shadow-sm text-left rounded-xl">
          <CardContent className="p-4 flex flex-col justify-between h-full font-sans">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <CardTitle className="font-semibold text-foreground text-xs border-none p-0 h-auto">Inference Performance</CardTitle>
              </div>
              <p className="text-[10px] text-muted-foreground mb-4">Aggregate performance stats of model inferences.</p>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1">
                    <span>Successful calls</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">99.8%</span>
                  </div>
                  <div className="w-full bg-secondary border border-border h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[99.8%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1">
                    <span>Failed calls</span>
                    <span className="font-mono text-red-500 dark:text-red-400">0.2%</span>
                  </div>
                  <div className="w-full bg-secondary border border-border h-1.5 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full w-[0.2%]"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-3 bg-primary/10 border border-primary/20 rounded-xl">
              <div className="flex items-center gap-1.5 text-primary font-semibold text-xs mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" /> Auto-Scale Active
              </div>
              <p className="text-[9px] text-muted-foreground leading-relaxed">
                Platform scale engine is automatically provisioning computing instances matching active provider workloads.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Serviced Request History logs table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-1">
        <div className="lg:col-span-2">
          <InferenceLogsTable logs={logs} title="Recent Inferences Served Traffic" />
        </div>
        <div className="lg:col-span-1 hidden lg:block"></div>
      </div>
    </div>
  );
}
