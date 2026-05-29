"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ShieldCheck, Users, Wallet } from "lucide-react";
import Image from "next/image";
import { useWorkspace } from "@/hooks/use-workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StepProfileInfo from "@/components/dashboard/create-org/StepProfileInfo";
import StepCollaborators from "@/components/dashboard/create-org/StepCollaborators";
import StepFinancialWallet from "@/components/dashboard/create-org/StepFinancialWallet";

/**
 * Dedicated Workspace Creation Page Route.
 * Implements a dual-pane responsive layout with a premium branding panel
 * and a 3-step organization onboarding setup wizard.
 *
 * @returns The React component rendering the dedicated page.
 */
export default function CreateWorkspacePage() {
  const router = useRouter();
  const { createOrganization } = useWorkspace();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Invite states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MAINTAINER" | "CONTRIBUTOR" | "VIEWER">("CONTRIBUTOR");
  const [invitedMembers, setInvitedMembers] = useState<Array<{ email: string; role: string }>>([]);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  };

  const handleAddInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (invitedMembers.some((m) => m.email === inviteEmail)) {
      setError("Member already invited");
      return;
    }

    setInvitedMembers([...invitedMembers, { email: inviteEmail, role: inviteRole }]);
    setInviteEmail("");
    setError("");
  };

  const handleRemoveInvite = (email: string) => {
    setInvitedMembers(invitedMembers.filter((m) => m.email !== email));
  };

  const handleNextStep = () => {
    setError("");
    if (step === 1) {
      if (!name.trim()) {
        setError("Workspace name is required");
        return;
      }
      if (!slug.trim()) {
        setError("Workspace slug is required");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleFinish = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await createOrganization(name, slug);
      if (res.success) {
        // Invite members on backend
        for (const member of invitedMembers) {
          try {
            await fetch(`/api/organizations/${slug}/members/invite`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: member.email, role: member.role }),
            });
          } catch (e) {
            console.error("Failed to invite member:", member.email, e);
          }
        }
        router.push("/");
        router.refresh();
      } else {
        setError(res.error || "Failed to create workspace");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row -m-8 bg-slate-50 overflow-hidden">
      {/* Left Panel: Branding & Illustration */}
      <div className="w-full lg:w-1/2 bg-slate-950 p-12 text-white flex flex-col justify-between relative overflow-hidden shrink-0 min-h-[40vh] lg:min-h-0">
        {/* Background Gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-900/30 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none" />

        {/* Branding header */}
        <div className="relative z-10 flex items-center gap-2.5 text-primary-400 font-bold text-lg">
          <div className="w-7 h-7 rounded bg-primary-600 flex items-center justify-center text-white">
            <Check className="w-4 h-4" />
          </div>
          ModelOps Cloud
        </div>

        {/* Illustration */}
        <div className="relative z-10 flex items-center justify-center my-8 max-w-md mx-auto w-full aspect-square">
          <Image
            src="/workspace_onboarding.png"
            alt="Workspace collaboration and ledger sync illustration"
            width={400}
            height={400}
            className="rounded-2xl shadow-2xl border border-white/5 object-contain"
            priority
          />
        </div>

        {/* Benefits List */}
        <div className="relative z-10 space-y-4 max-w-md mx-auto w-full">
          <h2 className="text-xl font-bold tracking-tight">Set up your collaborative workspace</h2>
          <div className="space-y-3.5">
            <div className="flex gap-3 text-xs text-slate-300 items-start">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-indigo-400 shrink-0">
                <Users className="w-3 h-3" />
              </div>
              <p className="leading-relaxed">
                <strong className="text-white">Invite Collaborators</strong>: Onboard developers and maintainers to collaborate on models.
              </p>
            </div>
            <div className="flex gap-3 text-xs text-slate-300 items-start">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                <Wallet className="w-3 h-3" />
              </div>
              <p className="leading-relaxed">
                <strong className="text-white">Unified Ledger Wallets</strong>: Instantly get both Consumer (credits) and Provider (revenue) accounts.
              </p>
            </div>
            <div className="flex gap-3 text-xs text-slate-300 items-start">
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldCheck className="w-3 h-3" />
              </div>
              <p className="leading-relaxed">
                <strong className="text-white">$100 Starter Credits</strong>: Get 100.00 free credits immediately to initialize model test runs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Stepper Form */}
      <div className="flex-1 p-8 lg:p-16 flex items-center justify-center overflow-y-auto">
        <div className="w-full max-w-lg animate-fade-in space-y-6">
          {/* Form Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create New Workspace</h1>
            <p className="text-xs text-slate-500">Configure your workspace profiles, collaborate with teams, and initialize ledgers.</p>
          </div>

          <Card className="border border-slate-200 shadow-sm p-0 overflow-hidden bg-white">
            {/* Stepper wizard indicator */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-semibold shrink-0 select-none">
              <div className={`flex items-center gap-1.5 ${step >= 1 ? "text-primary-600" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${
                  step > 1 ? "bg-primary-600 border-primary-600 text-white" : "border-slate-300"
                }`}>
                  {step > 1 ? <Check className="w-3 h-3" /> : "1"}
                </span>
                Profile Info
              </div>
              <div className="w-8 h-px bg-slate-200" />
              <div className={`flex items-center gap-1.5 ${step >= 2 ? "text-primary-600" : "text-slate-400"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${
                  step > 2 ? "bg-primary-600 border-primary-600 text-white" : "border-slate-300"
                }`}>
                  {step > 2 ? <Check className="w-3 h-3" /> : "2"}
                </span>
                Collaborators
              </div>
              <div className="w-8 h-px bg-slate-200" />
              <div className={`flex items-center gap-1.5 ${step >= 3 ? "text-primary-600" : "text-slate-400"}`}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center border border-slate-300 text-[10px]">
                  3
                </span>
                Financial Wallet
              </div>
            </div>

            <CardContent className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                  {error}
                </div>
              )}

              {step === 1 && (
                <StepProfileInfo
                  name={name}
                  slug={slug}
                  onNameChange={handleNameChange}
                  onSlugChange={setSlug}
                />
              )}

              {step === 2 && (
                <StepCollaborators
                  inviteEmail={inviteEmail}
                  inviteRole={inviteRole}
                  invitedMembers={invitedMembers}
                  onEmailChange={setInviteEmail}
                  onRoleChange={setInviteRole}
                  onAddInvite={handleAddInvite}
                  onRemoveInvite={handleRemoveInvite}
                />
              )}

              {step === 3 && <StepFinancialWallet />}
            </CardContent>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              {step > 1 ? (
                <Button
                  variant="outline"
                  onClick={() => setStep((step - 1) as 1 | 2)}
                  className="py-2 h-9 text-xs cursor-pointer border-slate-200 hover:bg-slate-50"
                  disabled={loading}
                >
                  Back
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => router.push("/")}
                  className="py-2 h-9 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                  disabled={loading}
                >
                  Cancel
                </Button>
              )}

              {step < 3 ? (
                <Button
                  onClick={handleNextStep}
                  className="bg-primary-500 hover:bg-primary-600 text-white py-2 h-9 text-xs flex items-center gap-2 cursor-pointer"
                >
                  Next Step <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={loading}
                  className="py-2 h-9 text-xs flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 border-none shadow-sm shadow-emerald-500/20 text-white cursor-pointer"
                >
                  {loading ? "Creating..." : "Initialize Workspace"} <Check className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
