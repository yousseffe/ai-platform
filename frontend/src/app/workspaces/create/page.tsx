"use client";

import React from "react";
import { ShieldCheck, Users, Wallet } from "lucide-react";
import Image from "next/image";
import CreateWorkspaceWizard from "@/components/workspaces/CreateWorkspaceWizard";

/**
 * Dedicated Workspace Onboarding/Creation Page.
 * Renders a full-screen split layout that guides users through creating their collaborative workspace.
 * Hosts the branding and onboarding graphics on the left, and embeds the interactive form wizard on the right.
 *
 * @returns The React component rendering the split branding/wizard layout.
 */
export default function CreateWorkspacePage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 overflow-hidden">
      {/* Left Panel: Branding & Onboarding Graphics */}
      <div className="w-full lg:w-1/2 bg-slate-950 p-12 text-white flex flex-col justify-between relative overflow-hidden shrink-0 min-h-[40vh] lg:min-h-0 select-none animate-in fade-in duration-500">
        {/* Background Gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-900/30 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none" />

        {/* Branding header */}
        <div className="relative z-10 flex items-center gap-2.5 text-primary font-bold text-lg">
          <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
            <Image
              src="/qantara-assets/dark-normal.svg"
              alt="Qantara Logo"
              width={30}
              height={30}
              className="object-contain animate-pulse hidden dark:block"
              style={{ width: "auto" }}
            />
            <Image
              src="/qantara-assets/light-normal.svg"
              alt="Qantara Logo"
              width={30}
              height={30}
              className="object-contain animate-pulse block dark:hidden"
              style={{ width: "auto" }}
            />
          </div>
          <span className="font-mono text-base font-extrabold text-white">Qantara Cloud</span>
        </div>

        {/* Illustration */}
        <div className="relative z-10 flex items-center justify-center my-8 max-w-sm mx-auto w-full aspect-square">
          <Image
            src="/workspace_onboarding.png"
            alt="Workspace collaboration and ledger sync illustration"
            width={340}
            height={340}
            className="rounded-2xl shadow-2xl border border-white/5 object-contain hover:scale-[1.01] transition-transform duration-300"
            priority
          />
        </div>

        {/* Benefits List */}
        <div className="relative z-10 space-y-4 max-w-md mx-auto w-full">
          <h2 className="text-xl font-bold tracking-tight text-white font-mono">Collaborative workspace capabilities</h2>
          <div className="space-y-3.5 font-mono text-[10px]">
            <div className="flex gap-3 text-slate-300 items-start">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-indigo-400 shrink-0">
                <Users className="w-3 h-3" />
              </div>
              <p className="leading-relaxed">
                <strong className="text-white">Invite Collaborators</strong>: Onboard developers and maintainers to collaborate on models.
              </p>
            </div>
            <div className="flex gap-3 text-slate-300 items-start">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                <Wallet className="w-3 h-3" />
              </div>
              <p className="leading-relaxed">
                <strong className="text-white">Unified Ledger Wallets</strong>: Instantly get both Consumer (credits) and Provider (revenue) accounts.
              </p>
            </div>
            <div className="flex gap-3 text-slate-300 items-start">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldCheck className="w-3 h-3" />
              </div>
              <p className="leading-relaxed">
                <strong className="text-white">Workspace Permissions</strong>: Assign roles (Maintainer, Contributor, Viewer) with distinct execution layers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Stepper Form */}
      <div className="flex-1 p-8 lg:p-16 flex items-center justify-center overflow-y-auto bg-slate-50 dark:bg-slate-900/10">
        <CreateWorkspaceWizard />
      </div>
    </div>
  );
}
