"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Database, HardDrive, Cpu, Terminal, Layers, RefreshCw, Layers3, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
interface InfrastructureContainer {
  deploymentId: string;
  modelName: string;
  url: string;
  modelType: string;
  port?: number | string;
  cpu: number;
  ram: number;
  tier?: string;
  [key: string]: unknown;
}

interface InfrastructureStatsProps {
  infrastructure: {
    activeContainers: number;
    containersList: InfrastructureContainer[];
    storage: {
      bucket: string;
      fallback: boolean;
      objectCount: number;
      totalSizeBytes: number;
    };
    queues: {
      buildQueue: { waiting: number; active: number; completed: number; failed: number; delayed: number };
      deployQueue: { waiting: number; active: number; completed: number; failed: number; delayed: number };
    };
  };
  onRefresh: () => void;
  loading: boolean;
}

export default function InfrastructureStats({
  infrastructure,
  onRefresh,
  loading,
}: InfrastructureStatsProps) {
  const { storage, queues, containersList } = infrastructure;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Assume 100 GB virtual storage scale for visual gauge
  const totalLimitBytes = 100 * 1024 * 1024 * 1024;
  const storagePercentage = Math.min(100, (storage.totalSizeBytes / totalLimitBytes) * 100);

  return (
    <div className="space-y-6 text-left">
      {/* 1. Infrastructure Overview Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* MinIO Storage Stats */}
        <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30 bg-muted/5 px-5 py-4">
            <div className="text-left">
              <CardTitle className="text-sm font-bold text-foreground">Object Storage (MinIO)</CardTitle>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 dark:bg-blue-500/5 shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="font-sans text-xs text-left p-5 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-[10px]">TARGET BUCKET:</span>
                <span className="font-bold text-foreground bg-secondary/65 px-2 py-0.5 rounded border border-border/60">
                  {storage.bucket || "models"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-[10px]">STORAGE STATE:</span>
                <span className="font-bold text-foreground text-[10px]">
                  {storage.fallback ? "Local disk fallback" : "MinIO S3 Cluster"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-[10px]">WEIGHT FILES:</span>
                <span className="font-bold text-foreground">{storage.objectCount} entries</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-[10px]">TOTAL SIZE:</span>
                <span className="font-bold text-primary">{formatBytes(storage.totalSizeBytes)}</span>
              </div>
            </div>
            
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground">
                <span>USAGE GAUGE:</span>
                <span>{storagePercentage.toFixed(2)}% of 100 GB</span>
              </div>
              <div className="w-full h-2 bg-secondary border border-border/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${storagePercentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BullMQ build-queue */}
        <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30 bg-muted/5 px-5 py-4">
            <div className="text-left">
              <CardTitle className="text-sm font-bold text-foreground">Build Queue (BullMQ)</CardTitle>
            </div>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 dark:bg-purple-500/5 shrink-0">
              <Layers3 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="font-sans text-xs text-left p-5">
            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div className="bg-secondary/40 border border-border/60 p-2.5 rounded-xl text-center hover:bg-secondary/60 transition-colors">
                <span className="text-muted-foreground block text-[9px] font-bold">ACTIVE</span>
                <span className="text-base font-extrabold text-foreground">{queues.buildQueue.active}</span>
              </div>
              <div className="bg-secondary/40 border border-border/60 p-2.5 rounded-xl text-center hover:bg-secondary/60 transition-colors">
                <span className="text-muted-foreground block text-[9px] font-bold">WAITING</span>
                <span className="text-base font-extrabold text-foreground">{queues.buildQueue.waiting}</span>
              </div>
              <div className="bg-secondary/40 border border-border/60 p-2.5 rounded-xl text-center hover:bg-secondary/60 transition-colors">
                <span className="text-muted-foreground block text-[9px] font-bold">COMPLETED</span>
                <span className="text-base font-extrabold text-emerald-500">{queues.buildQueue.completed}</span>
              </div>
              <div className="bg-secondary/40 border border-border/60 p-2.5 rounded-xl text-center hover:bg-secondary/60 transition-colors">
                <span className="text-muted-foreground block text-[9px] font-bold">FAILED</span>
                <span className="text-base font-extrabold text-red-500">{queues.buildQueue.failed}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BullMQ deploy-queue */}
        <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30 bg-muted/5 px-5 py-4">
            <div className="text-left">
              <CardTitle className="text-sm font-bold text-foreground">Deploy Queue (BullMQ)</CardTitle>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 dark:bg-amber-500/5 shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="font-sans text-xs text-left p-5">
            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div className="bg-secondary/40 border border-border/60 p-2.5 rounded-xl text-center hover:bg-secondary/60 transition-colors">
                <span className="text-muted-foreground block text-[9px] font-bold">ACTIVE</span>
                <span className="text-base font-extrabold text-foreground">{queues.deployQueue.active}</span>
              </div>
              <div className="bg-secondary/40 border border-border/60 p-2.5 rounded-xl text-center hover:bg-secondary/60 transition-colors">
                <span className="text-muted-foreground block text-[9px] font-bold">WAITING</span>
                <span className="text-base font-extrabold text-foreground">{queues.deployQueue.waiting}</span>
              </div>
              <div className="bg-secondary/40 border border-border/60 p-2.5 rounded-xl text-center hover:bg-secondary/60 transition-colors">
                <span className="text-muted-foreground block text-[9px] font-bold">COMPLETED</span>
                <span className="text-base font-extrabold text-emerald-500">{queues.deployQueue.completed}</span>
              </div>
              <div className="bg-secondary/40 border border-border/60 p-2.5 rounded-xl text-center hover:bg-secondary/60 transition-colors">
                <span className="text-muted-foreground block text-[9px] font-bold">FAILED</span>
                <span className="text-base font-extrabold text-red-500">{queues.deployQueue.failed}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Container telemetry table */}
      <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl overflow-hidden hover-lift transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/80 bg-muted/20 px-5 py-4">
          <div className="text-left space-y-0.5">
            <CardTitle className="text-sm font-bold text-foreground">Active Docker Telemetry</CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground font-sans">
              Live containers running ML inference workloads with CPU and RAM tracking.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="btn-outline h-8 px-3 font-bold font-sans text-[9px] cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Containers</span>
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {containersList.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground font-sans">
              <Cpu className="w-8 h-8 text-muted-foreground/45 mb-2.5 animate-pulse" />
              <span>No active running container deployments found.</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10 border-b border-border/80 text-[9px] uppercase tracking-wider text-muted-foreground">
                  <TableHead className="px-5 py-3">Inference Container</TableHead>
                  <TableHead className="px-5 py-3">Model Type</TableHead>
                  <TableHead className="px-5 py-3">Port</TableHead>
                  <TableHead className="px-5 py-3">CPU Usage</TableHead>
                  <TableHead className="px-5 py-3">RAM Usage</TableHead>
                  <TableHead className="px-5 py-3 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {containersList.map((c) => (
                  <TableRow key={c.deploymentId} className="hover:bg-muted/25 transition-all">
                    <TableCell className="px-5 py-3.5">
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-foreground">{c.modelName}</span>
                        <span className="text-[9px] text-muted-foreground mt-0.5 select-all">{c.url}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-primary/10 text-primary border border-primary/20 dark:bg-primary/5">
                        {c.modelType.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-foreground font-bold">{c.port || "Dynamic"}</TableCell>
                    <TableCell className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="text-foreground font-bold w-10 text-left">{c.cpu}%</span>
                        <div className="w-20 h-1.5 bg-secondary border border-border/60 rounded-full overflow-hidden hidden sm:block shrink-0">
                          <div
                            className={`h-full transition-all duration-300 ${
                              c.cpu > 75
                                ? "bg-red-500"
                                : c.cpu > 45
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, c.cpu)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="text-foreground font-bold w-12 text-left">{c.ram} MB</span>
                        <div className="w-20 h-1.5 bg-secondary border border-border/60 rounded-full overflow-hidden hidden sm:block shrink-0">
                          <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{
                              width: `${Math.min(
                                100,
                                (c.ram / (c.tier === "LARGE" ? 2048 : c.tier === "MEDIUM" ? 1024 : 512)) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        RUNNING
                      </span>
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
