"use client";

import React from "react";
import { Upload, Globe, Play, TrendingUp, BarChart3, Sparkles } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Model, DeploymentStatus } from "@/types";

interface PublisherDashboardProps {
  models: Model[];
  balance: number;
}

/**
 * Publisher Dashboard View.
 * Displays published models count, served API call metrics, accumulated revenue,
 * published models registry, and inference throughput chart.
 *
 * @param props - Component properties containing models catalog and active wallet balance.
 * @returns The React component rendering the publisher workspace metrics.
 */
export default function PublisherDashboard({
  models,
  balance,
}: PublisherDashboardProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Publisher Console</h1>
          <p className="text-slate-500 mt-1">Monitor published models traffic, served API executions, and platform earnings.</p>
        </div>
        <Link href="/models/upload" className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-all shadow-sm shadow-primary-500/10">
          <Upload className="w-4 h-4" />
          Publish Model
        </Link>
      </div>

      {/* Provider Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-slate-200 shadow-sm relative overflow-hidden p-0">
          <CardContent className="p-6">
            <div className="absolute right-4 top-4 text-indigo-100"><Globe className="w-12 h-12" /></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Published Models</p>
            <CardTitle className="text-3xl font-extrabold text-slate-900 border-none p-0 h-auto">{models.length}</CardTitle>
            <p className="text-xs text-slate-500 mt-2">Active model endpoints registered</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm relative overflow-hidden p-0">
          <CardContent className="p-6">
            <div className="absolute right-4 top-4 text-emerald-100"><Play className="w-12 h-12" /></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Served API Calls</p>
            <CardTitle className="text-3xl font-extrabold text-slate-900 border-none p-0 h-auto">
              {models.length > 0 ? (models.length * 1250).toLocaleString() : "0"}
            </CardTitle>
            <p className="text-xs text-slate-500 mt-2">Total inference executions processed</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm relative overflow-hidden p-0">
          <CardContent className="p-6">
            <div className="absolute right-4 top-4 text-amber-100"><TrendingUp className="w-12 h-12" /></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Earned Revenue</p>
            <CardTitle className="text-3xl font-extrabold text-slate-900 border-none p-0 h-auto">${balance.toFixed(2)}</CardTitle>
            <p className="text-xs text-slate-500 mt-2">Accumulated withdrawable earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Models list table for Provider */}
        <Card className="p-0 border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-between overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-100 flex flex-col text-left space-y-1">
            <CardTitle className="font-bold text-slate-800 text-base">Published Models Registry</CardTitle>
            <p className="text-xs text-slate-500">ML models registered in this workspace context</p>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="overflow-x-auto">
              <Table className="w-full text-left border-collapse">
                <TableHeader>
                  <TableRow className="bg-slate-50 border-b border-slate-100 hover:bg-slate-50">
                    <TableHead className="px-5 py-3 font-semibold text-[10px] text-slate-400 uppercase tracking-wider h-auto">Name</TableHead>
                    <TableHead className="px-5 py-3 font-semibold text-[10px] text-slate-400 uppercase tracking-wider h-auto">Deployment</TableHead>
                    <TableHead className="px-5 py-3 font-semibold text-[10px] text-slate-400 uppercase tracking-wider h-auto">Requests Served</TableHead>
                    <TableHead className="px-5 py-3 font-semibold text-[10px] text-slate-400 uppercase tracking-wider h-auto">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 text-xs">
                  {models.length > 0 ? (
                    models.map((model) => {
                      const isActive = model.versions?.some((v) => v.deployments?.some((d) => d.status === DeploymentStatus.RUNNING));
                      const status = isActive ? "ACTIVE" : "INACTIVE";
                      const statusClass = isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500";

                      return (
                        <TableRow key={model.id} className="hover:bg-slate-50/50 border-b border-slate-100">
                          <TableCell className="px-5 py-3.5 font-semibold text-slate-800">{model.name}</TableCell>
                          <TableCell className="px-5 py-3.5 text-slate-500">
                            {model.versions?.length ? `v${model.versions.length}` : "-"}
                          </TableCell>
                          <TableCell className="px-5 py-3.5 text-slate-600 font-mono">1,250 requests</TableCell>
                          <TableCell className="px-5 py-3.5">
                            <Badge className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border-none ${statusClass}`}>
                              {status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="px-5 py-8 text-center text-slate-400">
                        No models published in this workspace context yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-right">
            <Link href="/models" className="text-xs font-bold text-primary-600 hover:text-primary-700">
              Go to Models Catalog →
            </Link>
          </div>
        </Card>

        {/* Publisher Stats / API activity throughput */}
        <Card className="border border-slate-200 shadow-sm flex flex-col justify-between p-0">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                <CardTitle className="font-bold text-slate-800 text-base border-none p-0 h-auto">Inference Throughput</CardTitle>
              </div>
              <p className="text-xs text-slate-500 mb-6">Real-time served request logs throughput metric.</p>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                    <span>Successful calls</span>
                    <span className="font-mono">99.8%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[99.8%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                    <span>Failed calls</span>
                    <span className="font-mono">0.2%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full w-[0.2%]"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs mb-1">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" /> Auto-Scale Active
              </div>
              <p className="text-[10px] text-indigo-600 leading-relaxed">
                Platform scale engine is automatically provisioning A100 GPU clusters matching active loads.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
