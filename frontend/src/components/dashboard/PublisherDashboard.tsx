"use client";

import React from "react";
import { Upload, Globe, Play, TrendingUp, BarChart3, Sparkles, Server, ArrowUpRight, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
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
  const [currentPage, setCurrentPage] = React.useState(1);
  const [prevLength, setPrevLength] = React.useState(models.length);

  if (models.length !== prevLength) {
    setPrevLength(models.length);
    setCurrentPage(1);
  }

  const MODELS_PAGE_SIZE = 5;
  const totalPages = Math.ceil(models.length / MODELS_PAGE_SIZE);
  const startIndex = (currentPage - 1) * MODELS_PAGE_SIZE;
  const endIndex = startIndex + MODELS_PAGE_SIZE;
  const currentModels = models.slice(startIndex, endIndex);

  // Compute dynamic performance metrics from active log telemetry
  const totalQueries = logs.length;
  const successfulQueries = logs.filter((l) => l.statusCode >= 200 && l.statusCode < 400).length;
  const failedQueries = logs.filter((l) => l.statusCode >= 400).length;
  
  const successPercent = totalQueries > 0 ? (successfulQueries / totalQueries) * 100 : 100;
  const failurePercent = totalQueries > 0 ? (failedQueries / totalQueries) * 100 : 0;
  const averageLatency = totalQueries > 0 
    ? logs.reduce((sum, log) => sum + (log.responseTimeMs || 0), 0) / totalQueries 
    : 0;

  return (
    <div className="w-full space-y-5 animate-fade-in text-foreground font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4.5">
        <div className="text-left">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2 tracking-tight">
            <TrendingUp className="w-5 h-5 text-primary" strokeWidth={2.5} />
            Provider Console
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Monitor published models traffic, served API executions, and platform earnings.
          </p>
        </div>
        <Link
          href="/models/upload"
          className={cn(
            buttonVariants({ variant: "default" }),
            "bg-linear-to-r from-primary via-primary-600 to-primary-700 hover:opacity-95 text-primary-foreground font-semibold px-4 h-9 rounded-lg text-xs shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 cursor-pointer shrink-0 self-start sm:self-auto gap-1.5"
          )}
        >
          <Upload className="w-3.5 h-3.5" strokeWidth={2} />
          Publish Model
        </Link>
      </div>

      {/* Mode indicator banner */}
      <div className="p-3.5 bg-emerald-500/4 dark:bg-emerald-500/6 border border-emerald-500/20 dark:border-emerald-500/35 rounded-xl text-left flex items-center gap-3.5 text-xs shadow-sm">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 shrink-0 border border-emerald-500/20">
          <Server className="w-4 h-4" strokeWidth={2} />
        </div>
        <div className="flex-1 text-muted-foreground leading-relaxed">
          <strong className="font-semibold text-foreground mr-1">Active Role: Model Provider.</strong> You earn a configured split share of credits whenever consumers query your running model containers.
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold tracking-wider uppercase select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Live
        </span>
      </div>

      {/* Provider Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border border-border bg-card border-l-4 border-l-blue-500 relative overflow-hidden shadow-sm hover:shadow-md hover:border-blue-500/30 hover:-translate-y-0.5 transition-all duration-300 text-left rounded-xl">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-28.75">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Published Models</p>
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight">{models.length}</h3>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15 shadow-2xs">
                <Globe className="w-4 h-4" strokeWidth={2} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Active model endpoints</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">Registered</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card border-l-4 border-l-emerald-500 relative overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-500/30 hover:-translate-y-0.5 transition-all duration-300 text-left rounded-xl">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-28.75">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Served Requests</p>
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight">{logs.length}</h3>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/15 shadow-2xs">
                <Play className="w-4 h-4" strokeWidth={2} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Total inference executions</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Processed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card border-l-4 border-l-amber-500 relative overflow-hidden shadow-sm hover:shadow-md hover:border-amber-500/30 hover:-translate-y-0.5 transition-all duration-300 text-left rounded-xl">
          <CardContent className="p-5 flex flex-col justify-between h-full min-h-28.75">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Earned Revenue</p>
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight">${balance.toFixed(2)}</h3>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15 shadow-2xs">
                <TrendingUp className="w-4 h-4" strokeWidth={2} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40">
              <Link href="/settings/billing" className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/95 font-bold hover:underline">
                Withdraw & Manage Earnings <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-0 border border-border bg-card lg:col-span-2 flex flex-col justify-between overflow-hidden shadow-sm rounded-xl text-left">
          <div className="flex-1 flex flex-col">
            <CardHeader className="p-4.5 border-b border-border/60 flex flex-col space-y-1 bg-secondary/20">
              <CardTitle className="font-bold text-foreground text-xs uppercase tracking-wider">Published Models Registry</CardTitle>
              <p className="text-[10px] text-muted-foreground">ML models registered and hosted in this workspace context</p>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col justify-between">
              <div className="overflow-x-auto">
                <Table className="w-full text-left border-collapse text-xs">
                  <TableHeader>
                    <TableRow className="bg-secondary/30 border-b border-border/60 hover:bg-secondary/30 select-none">
                      <TableHead className="px-4.5 py-3 font-bold text-[9px] text-muted-foreground uppercase tracking-widest h-auto">Model Name</TableHead>
                      <TableHead className="px-4.5 py-3 font-bold text-[9px] text-muted-foreground uppercase tracking-widest h-auto">Deployment</TableHead>
                      <TableHead className="px-4.5 py-3 font-bold text-[9px] text-muted-foreground uppercase tracking-widest h-auto">Price Per Call</TableHead>
                      <TableHead className="px-4.5 py-3 font-bold text-[9px] text-muted-foreground uppercase tracking-widest h-auto">Status</TableHead>
                      <TableHead className="px-4.5 py-3 font-bold text-[9px] text-muted-foreground uppercase tracking-widest h-auto text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border/40 text-xs">
                    {models.length > 0 ? (
                      currentModels.map((model) => {
                        const isActive = model.versions?.some((v) => v.deployments?.some((d) => d.status === DeploymentStatus.RUNNING));
                        const status = isActive ? "ACTIVE" : "INACTIVE";

                        return (
                          <TableRow key={model.id} className="hover:bg-secondary/40 border-b border-border/30 transition-colors">
                            <TableCell className="px-4.5 py-3.5 font-bold text-foreground text-xs">{model.name}</TableCell>
                            <TableCell className="px-4.5 py-3.5 text-muted-foreground font-mono text-[10.5px]">
                              {model.versions?.length ? `v${model.versions.length}` : "-"}
                            </TableCell>
                            <TableCell className="px-4.5 py-3.5 text-muted-foreground font-mono text-[10.5px]">
                              ${(typeof model.costPerRequest === "string" ? parseFloat(model.costPerRequest) : (model.costPerRequest || 0)).toFixed(2)}
                            </TableCell>
                            <TableCell className="px-4.5 py-3.5">
                              {isActive ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> {status}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-border bg-secondary/50 text-muted-foreground text-[9px] font-bold tracking-wider">
                                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/45"></span> {status}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="px-4.5 py-3.5 text-right font-sans">
                              <Link
                                href={`/models/${model.id}`}
                                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-750 transition-colors"
                              >
                                Manage
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="px-4.5 py-12 text-center text-muted-foreground text-xs font-mono">
                          No models published in this workspace context yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4.5 py-3 border-t border-border bg-secondary/15 select-none font-sans text-xs">
              <div className="text-muted-foreground text-[10px] font-medium font-mono">
                Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{" "}
                <span className="font-semibold text-foreground">{Math.min(endIndex, models.length)}</span> of{" "}
                <span className="font-semibold text-foreground">{models.length}</span> models
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-md border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-bold text-foreground font-mono">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded-md border border-border bg-card hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="p-3.5 border-t border-border bg-secondary/10 text-right select-none">
            <Link href="/models" className="text-xs font-bold text-primary hover:text-primary/90 hover:underline">
              Go to Models Catalog →
            </Link>
          </div>
        </Card>

        {/* Publisher Stats / API activity throughput */}
        <Card className="border border-border bg-card flex flex-col justify-between p-0 shadow-sm rounded-xl text-left border-l-4 border-l-primary">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/15">
                  <BarChart3 className="w-4 h-4" strokeWidth={2} />
                </div>
                <CardTitle className="font-bold text-foreground text-xs uppercase tracking-wider">Inference Performance</CardTitle>
              </div>
              <p className="text-[10px] text-muted-foreground">Aggregate performance stats of model inferences.</p>
              
              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>Successful queries</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{successPercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-secondary border border-border/50 h-2 rounded-full overflow-hidden">
                    <div className="bg-linear-to-r from-emerald-400 to-emerald-600 h-full rounded-full" style={{ width: `${successPercent}%` }}></div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>Failed queries</span>
                    <span className="font-mono text-rose-500 dark:text-rose-400 font-bold">{failurePercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-secondary border border-border/50 h-2 rounded-full overflow-hidden">
                    <div className="bg-linear-to-r from-rose-500 to-red-650 h-full rounded-full" style={{ width: `${failurePercent}%` }}></div>
                  </div>
                </div>
                <div className="pt-2 flex justify-between items-center text-[11px] font-semibold text-muted-foreground border-t border-border/40 mt-2 font-sans">
                  <span>Average Latency</span>
                  <span className="font-mono text-primary font-bold">{averageLatency.toFixed(1)} ms</span>
                </div>
              </div>
            </div>

            <div className="mt-8 p-3.5 bg-linear-to-br from-primary/15 via-primary/3 to-transparent border border-primary/25 rounded-xl relative overflow-hidden shadow-2xs">
              <div className="absolute right-2 bottom-2 opacity-5 dark:opacity-10">
                <Sparkles className="w-16 h-16 text-primary" />
              </div>
              <div className="flex items-center gap-1.5 text-primary font-bold text-xs mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" /> Auto-Scaling Engines
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed font-medium">
                Platform scale engine is automatically provisioning computing instances matching active provider workloads.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Serviced Request History logs table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-1 text-left">
        <div className="lg:col-span-2">
          <InferenceLogsTable logs={logs} title="Recent Inferences Served Traffic" />
        </div>
        <Card className="border border-border bg-card border-l-4 border-l-amber-500 p-5 text-left flex flex-col justify-between shadow-sm hover:shadow-md hover:border-amber-500/35 transition-all duration-300 rounded-xl">
          <div className="space-y-4">
            <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-500" strokeWidth={2} />
              Publisher Resource Guide
            </h3>
            <div className="space-y-3.5 text-xs leading-relaxed text-muted-foreground font-sans">
              <div className="space-y-1">
                <p className="font-bold text-foreground text-[11.5px]">1. Configure Custom Pricing</p>
                <p className="text-[11px] leading-relaxed">Set a request fee in credits for your model. Adjust cost per request from the model catalog console.</p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground text-[11.5px]">2. Monitor GPU Latencies</p>
                <p className="text-[11px] leading-relaxed">Check execution latencies under served logs to optimize hardware parameters.</p>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-foreground text-[11.5px]">3. Instant Revenue Cash-Out</p>
                <p className="text-[11px] leading-relaxed">Your accrued credit balance can be withdrawn directly from the wallet console page.</p>
              </div>
            </div>
          </div>
          <div className="pt-4.5 mt-4 border-t border-border">
            <Link
              href="/settings/billing"
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-bold text-foreground hover:text-foreground transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98]"
            >
              Withdraw Earnings <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
