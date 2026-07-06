"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Upload, Code2, Check, Rocket } from "lucide-react";
import UploadModelWizard from "@/components/models/UploadModelWizard";

export default function UploadModelPage() {
  return (
    <div className="w-full pb-12 animate-in fade-in duration-500 text-foreground space-y-6 text-left font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/50 pb-5">
        <div className="space-y-1">
          <h1 className="text-lg font-black text-foreground tracking-tight">Deploy Model Pipeline</h1>
          <p className="text-xs text-muted-foreground">
            Upload your serialized weights and preprocessing scripts to build a production-ready model.
          </p>
        </div>
        <Link
          href="https://qantara.dev/docs"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-semibold text-foreground transition-all shrink-0 w-fit active:scale-[0.98]"
        >
          <BookOpen className="w-3.5 h-3.5" /> View Documentation
        </Link>
      </div>

      {/* Horizontal Pipeline Steps Bar */}
      <div className="w-full p-3.5 px-4 bg-card/65 border border-border/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs select-none">
        
        {/* Step 1: Upload */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm shadow-primary/20 shrink-0">
            <Upload className="w-3.5 h-3.5" />
          </div>
          <div className="text-left">
            <div className="text-[8.5px] font-bold uppercase tracking-wider text-primary font-mono leading-none">Step 01</div>
            <div className="text-[11px] font-bold text-foreground leading-tight mt-0.5">Upload</div>
            <p className="text-[9px] text-muted-foreground leading-tight font-medium">Files and configurations</p>
          </div>
        </div>

        {/* Divider 1-2 */}
        <div className="hidden md:block flex-1 h-[1.5px] bg-primary/25" />

        {/* Step 2: Build */}
        <div className="flex items-center gap-2.5 opacity-60 shrink-0">
          <div className="w-8 h-8 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground shrink-0">
            <Code2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-left">
            <div className="text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground font-mono leading-none">Step 02</div>
            <div className="text-[11px] font-bold text-muted-foreground leading-tight mt-0.5">Build</div>
            <p className="text-[9px] text-muted-foreground leading-tight font-medium">Containerize your model</p>
          </div>
        </div>

        {/* Divider 2-3 */}
        <div className="hidden md:block flex-1 h-[1.5px] bg-border/50" />

        {/* Step 3: Verify */}
        <div className="flex items-center gap-2.5 opacity-60 shrink-0">
          <div className="w-8 h-8 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <div className="text-left">
            <div className="text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground font-mono leading-none">Step 03</div>
            <div className="text-[11px] font-bold text-muted-foreground leading-tight mt-0.5">Verify</div>
            <p className="text-[9px] text-muted-foreground leading-tight font-medium">Verify and test endpoints</p>
          </div>
        </div>

        {/* Divider 3-4 */}
        <div className="hidden md:block flex-1 h-[1.5px] bg-border/50" />

        {/* Step 4: Live */}
        <div className="flex items-center gap-2.5 opacity-60 shrink-0">
          <div className="w-8 h-8 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground shrink-0">
            <Rocket className="w-3.5 h-3.5" />
          </div>
          <div className="text-left">
            <div className="text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground font-mono leading-none">Step 04</div>
            <div className="text-[11px] font-bold text-muted-foreground leading-tight mt-0.5">Live</div>
            <p className="text-[9px] text-muted-foreground leading-tight font-medium">Deploy to production</p>
          </div>
        </div>

      </div>

      {/* Interactive Step Wizard */}
      <UploadModelWizard />
    </div>
  );
}
