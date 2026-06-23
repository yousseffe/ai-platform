"use client";

import React from "react";
import { Upload, Globe, Play, TrendingUp, BarChart3, Sparkles, Server } from "lucide-react";
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
 *
 * @returns The React component rendering the publisher workspace metrics.
 */
export default function PublisherDashboard({
  models,
  balance,
  logs,
}: PublisherDashboardProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in text-foreground font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="text-left">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Provider Console
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Monitor published models traffic, served API executions, and platform earnings.
          </p>
        </div>
        <Link href="/models/upload" className="btn-primary flex items-center gap-2 font-bold py-2 px-4 rounded-lg">
          <Upload className="w-4 h-4" />
          Publish Model
        </Link>
      </div>

      {/* Mode indicator banner */}
      <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-left flex items-start gap-3">
        <Server className="w-4 h-4 text-emerald-450 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-emerald-450">Active Role: Model Provider.</span> You earn a configured split share of credits whenever consumers query your running model containers.
        </div>
      </div>

      {/* Provider Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-border bg-card relative overflow-hidden p-0 shadow-sm text-left">
          <CardContent className="p-6">
            <div className="absolute right-4 top-4 text-primary/10"><Globe className="w-12 h-12" /></div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Published Models</p>
            <CardTitle className="text-3xl font-extrabold text-foreground border-none p-0 h-auto">{models.length}</CardTitle>
            <p className="text-[10px] text-muted-foreground mt-2">Active model endpoints registered</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card relative overflow-hidden p-0 shadow-sm text-left">
          <CardContent className="p-6">
            <div className="absolute right-4 top-4 text-emerald-500/10"><Play className="w-12 h-12" /></div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Served Requests</p>
            <CardTitle className="text-3xl font-extrabold text-foreground border-none p-0 h-auto">
              {logs.length}
            </CardTitle>
            <p className="text-[10px] text-muted-foreground mt-2">Total inference executions processed</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card relative overflow-hidden p-0 shadow-sm text-left">
          <CardContent className="p-6">
            <div className="absolute right-4 top-4 text-amber-500/10"><TrendingUp className="w-12 h-12" /></div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Earned Revenue</p>
            <div className="flex items-baseline justify-between">
              <CardTitle className="text-3xl font-extrabold text-foreground border-none p-0 h-auto">${balance.toFixed(2)}</CardTitle>
              <Link href="/settings" className="text-[10px] font-bold text-primary hover:underline">
                Withdraw Earnings →
              </Link>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Accumulated withdrawable earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Models list table for Provider */}
        <Card className="p-0 border border-border bg-card lg:col-span-2 flex flex-col justify-between overflow-hidden shadow-sm text-left">
          <CardHeader className="p-5 border-b border-border flex flex-col space-y-1 bg-accent/20">
            <CardTitle className="font-bold text-foreground text-sm">Published Models Registry</CardTitle>
            <p className="text-[10px] text-muted-foreground">ML models registered and hosted in this workspace context</p>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="overflow-x-auto">
              <Table className="w-full text-left border-collapse">
                <TableHeader>
                  <TableRow className="bg-background border-b border-border hover:bg-background">
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Name</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Deployment</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Price Per Request</TableHead>
                    <TableHead className="px-5 py-3 font-bold text-[10px] text-muted-foreground uppercase tracking-wider h-auto">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border text-xs text-foreground">
                  {models.length > 0 ? (
                    models.map((model) => {
                      const isActive = model.versions?.some((v) => v.deployments?.some((d) => d.status === DeploymentStatus.RUNNING));
                      const status = isActive ? "ACTIVE" : "INACTIVE";
                      const statusClass = isActive
                        ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-900/60 text-slate-400 border border-slate-700/50";

                      return (
                        <TableRow key={model.id} className="hover:bg-accent/40 border-b border-border">
                          <TableCell className="px-5 py-3.5 font-bold text-foreground">{model.name}</TableCell>
                          <TableCell className="px-5 py-3.5 text-muted-foreground">
                            {model.versions?.length ? `v${model.versions.length}` : "-"}
                          </TableCell>
                          <TableCell className="px-5 py-3.5 text-muted-foreground font-mono">
                            ${(typeof model.costPerRequest === "string" ? parseFloat(model.costPerRequest) : (model.costPerRequest || 0)).toFixed(2)}
                          </TableCell>
                          <TableCell className="px-5 py-3.5">
                            <Badge className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border ${statusClass}`}>
                              {status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                        No models published in this workspace context yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <div className="p-4 border-t border-border bg-background text-right">
            <Link href="/models" className="text-xs font-bold text-primary hover:underline">
              Go to Models Catalog →
            </Link>
          </div>
        </Card>

        {/* Publisher Stats / API activity throughput */}
        <Card className="border border-border bg-card flex flex-col justify-between p-0 shadow-sm text-left">
          <CardContent className="p-6 flex flex-col justify-between h-full font-mono">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-primary" />
                <CardTitle className="font-bold text-foreground text-sm border-none p-0 h-auto">Inference Performance</CardTitle>
              </div>
              <p className="text-[10px] text-muted-foreground mb-6">Aggregate performance stats of model inferences.</p>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1">
                    <span>Successful calls</span>
                    <span className="font-mono text-emerald-400">99.8%</span>
                  </div>
                  <div className="w-full bg-background border border-border h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[99.8%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1">
                    <span>Failed calls</span>
                    <span className="font-mono text-red-400">0.2%</span>
                  </div>
                  <div className="w-full bg-background border border-border h-2 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full w-[0.2%]"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-primary/10 border border-primary/20 rounded-xl">
              <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" /> Auto-Scale Active
              </div>
              <p className="text-[9px] text-muted-foreground leading-relaxed">
                Platform scale engine is automatically provisioning computing instances matching active provider workloads.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Serviced Request History logs table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        <div className="lg:col-span-2">
          <InferenceLogsTable logs={logs} title="Recent Inferences Served Traffic" />
        </div>
        <div className="lg:col-span-1 hidden lg:block"></div>
      </div>
    </div>
  );
}
