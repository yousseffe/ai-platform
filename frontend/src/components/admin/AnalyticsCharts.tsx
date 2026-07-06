"use client";

import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Users, TrendingUp, Cpu, Info, Zap } from "lucide-react";

interface AnalyticsChartsProps {
  userGrowth: { month: string; signups: number; totalUsers: number }[];
  planBreakdown: { name: string; value: number }[];
  containerStats: any[];
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AnalyticsCharts({
  userGrowth,
  planBreakdown,
  containerStats,
}: AnalyticsChartsProps) {
  const trafficData = [
    { name: "Mon", Success: 240, Failed: 4 },
    { name: "Tue", Success: 300, Failed: 10 },
    { name: "Wed", Success: 420, Failed: 8 },
    { name: "Thu", Success: 380, Failed: 12 },
    { name: "Fri", Success: 510, Failed: 5 },
    { name: "Sat", Success: 600, Failed: 18 },
    { name: "Sun", Success: 580, Failed: 15 },
  ];

  const latencyData = [
    { name: "Mon", P50: 120, P95: 310 },
    { name: "Tue", P50: 110, P95: 290 },
    { name: "Wed", P50: 135, P95: 350 },
    { name: "Thu", P50: 125, P95: 320 },
    { name: "Fri", P50: 140, P95: 390 },
    { name: "Sat", P50: 155, P95: 410 },
    { name: "Sun", P50: 145, P95: 380 },
  ];

  // Custom tooltips to match our glassmorphism aesthetics
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-md border border-border/80 p-3 rounded-2xl shadow-xl space-y-1.5 text-left text-[10px] font-sans">
          <p className="font-bold text-foreground mb-1 border-b border-border/40 pb-1">{label}</p>
          {payload.map((pld: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pld.stroke || pld.fill }} />
              <span className="text-muted-foreground font-semibold">{pld.name}:</span>
              <span className="text-foreground font-extrabold">{pld.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 text-left">
      {/* 1. User growth chart */}
      <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30 bg-muted/5 px-5 py-4">
          <div className="text-left space-y-0.5">
            <CardTitle className="text-sm font-bold text-foreground">User Growth Trend</CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground font-sans">
              Accumulative registered accounts trend over months.
            </CardDescription>
          </div>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 dark:bg-blue-500/5 shrink-0">
            <Users className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent className="h-64 p-5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={userGrowth} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/20" vertical={false} />
              <XAxis dataKey="month" className="text-[9px] fill-muted-foreground font-sans" />
              <YAxis className="text-[9px] fill-muted-foreground font-sans" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="totalUsers" stroke="#6366f1" fillOpacity={1} fill="url(#userGrad)" strokeWidth={2.5} name="Total Users" />
              <Area type="monotone" dataKey="signups" stroke="#10b981" fillOpacity={1} fill="url(#signupGrad)" strokeWidth={1.5} name="New Signups" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 2. Plan subscriptions pie chart */}
      <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30 bg-muted/5 px-5 py-4">
          <div className="text-left space-y-0.5">
            <CardTitle className="text-sm font-bold text-foreground">Plan Distribution</CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground font-sans">
              Share of providers registered across active subscription plans.
            </CardDescription>
          </div>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 dark:bg-purple-500/5 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent className="h-64 p-5 flex items-center justify-center">
          {planBreakdown.length === 0 ? (
            <span className="text-[10px] text-muted-foreground">No subscription plan details.</span>
          ) : (
            <div className="w-full h-full flex flex-col sm:flex-row items-center justify-around gap-4">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {planBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="stroke-card" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 font-sans text-[10px] text-left border-l border-border/60 pl-6 py-2">
                {planBreakdown.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10 dark:border-white/10"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-foreground font-bold">{entry.name}:</span>
                    <span className="text-muted-foreground font-medium">{entry.value} providers</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. API Requests traffic bar chart */}
      <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30 bg-muted/5 px-5 py-4">
          <div className="text-left space-y-0.5">
            <CardTitle className="text-sm font-bold text-foreground">Inference Traffic</CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground font-sans">
              Weekly summary of successful vs. failed prediction requests.
            </CardDescription>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 dark:bg-emerald-500/5 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent className="h-64 p-5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trafficData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/20" vertical={false} />
              <XAxis dataKey="name" className="text-[9px] fill-muted-foreground font-sans" />
              <YAxis className="text-[9px] fill-muted-foreground font-sans" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "9px", marginTop: "10px" }} />
              <Bar dataKey="Success" fill="#10b981" radius={[4, 4, 0, 0]} name="Success API Calls" />
              <Bar dataKey="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failed API Calls" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 4. Platform latency trend lines */}
      <Card className="border border-border/80 bg-card/65 shadow-xs backdrop-blur-md rounded-2xl hover-lift transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30 bg-muted/5 px-5 py-4">
          <div className="text-left space-y-0.5">
            <CardTitle className="text-sm font-bold text-foreground">Latency Performance</CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground font-sans">
              Median (P50) and 95th Percentile (P95) execution times in milliseconds.
            </CardDescription>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 dark:bg-amber-500/5 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent className="h-64 p-5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={latencyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/20" vertical={false} />
              <XAxis dataKey="name" className="text-[9px] fill-muted-foreground font-sans" />
              <YAxis className="text-[9px] fill-muted-foreground font-sans" unit="ms" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "9px", marginTop: "10px" }} />
              <Line type="monotone" dataKey="P50" stroke="#6366f1" strokeWidth={3} name="Median (P50)" activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="P95" stroke="#ec4899" strokeWidth={2} name="Slowest (P95)" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
