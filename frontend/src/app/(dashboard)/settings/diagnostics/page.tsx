"use client";

import React from "react";
import { Server, Cpu, Database } from "lucide-react";

/**
 * Settings Page: Diagnostics Node Info.
 * Displays database connection state, NestJS gateway servers info, and web frontend configurations.
 */
export default function DiagnosticsSettingsPage() {
  return (
    <div className="animate-fade-in text-left">
      <div className="card p-5 rounded-xl border border-border bg-card shadow-sm font-sans">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4 mb-4 select-none">
          <div className="w-9 h-9 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Server className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-xs">Platform Node Specifications</h2>
            <p className="text-[10px] text-muted-foreground">Active gateway port mappings, server instances, and connection states</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-border rounded-lg p-3 bg-secondary/15">
            <div className="flex items-center gap-1.5 mb-1 select-none">
              <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Frontend App</span>
            </div>
            <p className="font-bold text-foreground text-xs">Next.js 16</p>
            <p className="text-[10px] text-primary font-bold mt-0.5 font-mono">Port: 3001</p>
          </div>
          
          <div className="border border-border rounded-lg p-3 bg-secondary/15">
            <div className="flex items-center gap-1.5 mb-1 select-none">
              <Server className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">API Gateway</span>
            </div>
            <p className="font-bold text-foreground text-xs">NestJS Server</p>
            <p className="text-[10px] text-primary font-bold mt-0.5 font-mono">Port: 3000</p>
          </div>

          <div className="border border-border rounded-lg p-3 bg-secondary/15">
            <div className="flex items-center gap-1.5 mb-1 select-none">
              <Database className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Database Node</span>
            </div>
            <p className="font-bold text-foreground text-xs">Postgres DB</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 font-sans">Connected</p>
          </div>
        </div>
      </div>
    </div>
  );
}
