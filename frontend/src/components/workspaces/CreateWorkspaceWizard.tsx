"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Building, 
  Mail, 
  Users, 
  Wallet, 
  CreditCard, 
  ShieldCheck, 
  Check, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Loader2 
} from "lucide-react";
import { toast } from "react-hot-toast";

import { useWorkspace } from "@/hooks/use-workspace";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { OrgRole } from "@/types";
import { workspaceCreateSchema, type WorkspaceCreateInput } from "@/lib/schemas/workspaces";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Highly interactive multi-step workspace creation wizard.
 * Leverages React Hook Form and Zod for real-time client-side validations,
 * dynamically generates slug from name, and uses React Hot Toast for micro-feedback.
 *
 * @returns The React component rendering the creation wizard.
 */
export default function CreateWorkspaceWizard() {
  const router = useRouter();
  const { createOrganization, workspaces } = useWorkspace();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orgFee, setOrgFee] = useState<number>(50);
  const [personalBalance, setPersonalBalance] = useState<number>(0);

  useEffect(() => {
    const fetchFeeAndBalance = async () => {
      try {
        const feeRes = await smartFetch<{ fee: number }>("/organizations/config/org-creation-fee");
        if (feeRes && typeof feeRes.fee === "number") {
          setOrgFee(feeRes.fee);
        }
      } catch (err) {
        console.error("Failed to fetch organization creation fee:", err);
      }

      try {
        const personalWorkspace = workspaces.find((w) => w.type === "USER");
        if (personalWorkspace) {
          const balanceRes = await smartFetch<{ balance: number }>("/wallets/balance?type=CONSUMER", {
            headers: {
              "X-Workspace-Id": personalWorkspace.id,
            },
          });
          if (balanceRes && typeof balanceRes.balance === "number") {
            setPersonalBalance(balanceRes.balance);
          }
        }
      } catch (err) {
        console.error("Failed to fetch personal balance:", err);
      }
    };

    if (workspaces && workspaces.length > 0) {
      fetchFeeAndBalance();
    }
  }, [workspaces]);

  // Local state for the collaborator input fields in Step 2
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>(OrgRole.CONTRIBUTOR);
  const [inviteError, setInviteError] = useState("");

  // Initialize React Hook Form
  const {
    register,
    control,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<WorkspaceCreateInput>({
    resolver: zodResolver(workspaceCreateSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      slug: "",
      collaborators: [],
    },
  });

  // Manage dynamic array of collaborators
  const { fields, append, remove } = useFieldArray({
    control,
    name: "collaborators",
  });

  /**
   * Automatically derives and sets a clean URL-friendly slug from the workspace name.
   *
   * @param nameVal - The raw workspace name string entered by the user.
   */
  const handleNameChange = (nameVal: string) => {
    setValue("name", nameVal, { shouldValidate: true });
    
    // Auto-generate URL-friendly slug
    const derivedSlug = nameVal
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with hyphens
      .replace(/(^-|-$)/g, ""); // trim leading/trailing hyphens
    
    setValue("slug", derivedSlug, { shouldValidate: true });
  };

  /**
   * Validates and adds a new collaborator to the form's collaborator array.
   */
  const handleAddCollaborator = () => {
    setInviteError("");
    
    if (!inviteEmail.trim()) {
      setInviteError("Email address is required.");
      return;
    }
    
    // Simple email validation regex matching Zod email rule
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setInviteError("Please enter a valid email address.");
      return;
    }

    // Check for duplicates
    const isDuplicate = fields.some((item) => item.email.toLowerCase() === inviteEmail.toLowerCase());
    if (isDuplicate) {
      setInviteError("This email has already been invited.");
      return;
    }

    // Append to useFieldArray list
    append({
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
    });

    toast.success(`Invited ${inviteEmail} as ${inviteRole.toLowerCase()}`);
    setInviteEmail("");
    setInviteRole(OrgRole.CONTRIBUTOR);
  };

  /**
   * Advances the wizard steps after validating the current step's inputs.
   */
  const handleNextStep = async () => {
    setSubmitError("");
    
    if (step === 1) {
      // Validate only Step 1 fields (name and slug)
      const isValid = await trigger(["name", "slug"]);
      if (isValid) {
        setStep(2);
      }
    } else if (step === 2) {
      setStep(3);
    }
  };

  /**
   * Submits the workspace data to the backend, handles redirection, and notifies the user.
   *
   * @param data - The validated form data matching the WorkspaceCreateInput structure.
   */
  const onSubmit = async (data: WorkspaceCreateInput) => {
    setSubmitError("");
    setIsSubmitting(true);
    
    try {
      const res = await createOrganization(data.name, data.slug, data.collaborators);
      if (res.success) {
        toast.success("Workspace successfully created!");
        router.push("/");
        router.refresh();
      } else {
        setSubmitError(res.error || "Failed to create workspace. Please check details and try again.");
        toast.error("Failed to initialize workspace.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Form Header */}
      <div className="space-y-1 font-mono text-left">
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Create New Workspace
        </h1>
        <p className="text-xs text-muted-foreground">Configure profiles, invite members, and initialize ledgers.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card className="border border-border/80 shadow-md p-0 overflow-hidden bg-card text-foreground backdrop-blur-sm bg-opacity-95">
          
          {/* Stepper wizard indicator */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-b border-border flex items-center justify-between text-[10px] font-semibold font-mono shrink-0 select-none">
            <button
              type="button"
              onClick={() => step > 1 && setStep(1)}
              className={`flex items-center gap-1.5 transition-colors duration-200 text-left ${
                step >= 1 ? "text-primary font-bold" : "text-muted-foreground"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[9px] transition-all duration-300 ${
                step > 1 ? "bg-primary border-primary text-primary-foreground" : "border-border"
              }`}>
                {step > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
              </span>
              Profile Info
            </button>
            
            <div className={`w-8 h-px transition-colors duration-300 ${step >= 2 ? "bg-primary" : "bg-border"}`} />
            
            <button
              type="button"
              onClick={async () => {
                if (step === 3 || (step === 1 && await trigger(["name", "slug"]))) {
                  setStep(2);
                }
              }}
              className={`flex items-center gap-1.5 transition-colors duration-200 text-left ${
                step >= 2 ? "text-primary font-bold" : "text-muted-foreground"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[9px] transition-all duration-300 ${
                step > 2 ? "bg-primary border-primary text-primary-foreground" : "border-border"
              }`}>
                {step > 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
              </span>
              Collaborators
            </button>
            
            <div className={`w-8 h-px transition-colors duration-300 ${step >= 3 ? "bg-primary" : "bg-border"}`} />
            
            <button
              type="button"
              onClick={async () => {
                const isValid = await trigger(["name", "slug"]);
                if (isValid) {
                  setStep(3);
                }
              }}
              className={`flex items-center gap-1.5 transition-colors duration-200 text-left ${
                step >= 3 ? "text-primary font-bold" : "text-muted-foreground"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[9px] transition-all duration-300 ${
                step === 3 ? "border-primary text-primary" : "border-border"
              }`}>
                3
              </span>
              Wallet
            </button>
          </div>

          <CardContent className="p-6 space-y-4 font-mono text-xs">
            {submitError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-500/30 dark:text-red-400 text-xs font-semibold leading-relaxed animate-in shake duration-300">
                {submitError}
              </div>
            )}

            {/* STEP 1: Profile Info */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    Workspace Name <span className="text-red-500 font-bold" title="Required">*</span>
                  </Label>
                  <div className="relative group">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="name"
                      type="text"
                      {...register("name", {
                        onChange: (e) => handleNameChange(e.target.value),
                      })}
                      className={`pl-10 h-10 border-slate-200 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200 ${
                        errors.name ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/10" : ""
                      }`}
                      placeholder="Acme Analytics"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                      <span>⚠️</span> {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    URL Slug <span className="text-red-500 font-bold" title="Required">*</span>
                  </Label>
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200">
                    <span className="px-3 py-2 border-r border-slate-200 bg-slate-100/80 select-none text-xs flex items-center font-semibold text-slate-500">
                      mlhub.com/
                    </span>
                    <input
                      id="slug"
                      type="text"
                      {...register("slug")}
                      className={`flex-1 px-3 py-2 bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-800 text-xs font-mono dark:text-slate-100 ${
                        errors.slug ? "text-red-500" : ""
                      }`}
                      placeholder="acme-analytics"
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-snug">
                    Slugs must consist of lowercase letters, numbers, and hyphens. Generated automatically from name.
                  </p>
                  {errors.slug && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                      <span>⚠️</span> {errors.slug.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Collaborators */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Invite Teammates <span className="text-muted-foreground/60 font-normal lowercase">(optional)</span>
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => {
                          setInviteEmail(e.target.value);
                          setInviteError("");
                        }}
                        className={`pl-10 h-10 border-slate-200 focus-visible:ring-primary/20 focus-visible:border-primary ${
                          inviteError ? "border-red-500" : ""
                        }`}
                        placeholder="collaborator@company.com"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCollaborator();
                          }
                        }}
                      />
                    </div>

                    <Select
                      value={inviteRole}
                      onValueChange={(val) => setInviteRole(val as OrgRole)}
                    >
                      <SelectTrigger className="w-full sm:w-[130px] h-10 border-slate-200 text-xs font-semibold">
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={OrgRole.MAINTAINER}>Maintainer</SelectItem>
                        <SelectItem value={OrgRole.CONTRIBUTOR}>Contributor</SelectItem>
                        <SelectItem value={OrgRole.VIEWER}>Viewer</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      onClick={handleAddCollaborator}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground h-10 text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Invite
                    </Button>
                  </div>
                  {inviteError && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1">
                      ⚠️ {inviteError}
                    </p>
                  )}
                </div>

                {fields.length > 0 ? (
                  <div className="border border-slate-100 dark:border-border/60 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/10 transition-all duration-300">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider p-3 border-b border-slate-100 dark:border-border/60 bg-white dark:bg-slate-950/20 flex justify-between items-center">
                      <span>Invited Members</span>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[9px]">
                        {fields.length}
                      </span>
                    </p>
                    <div className="divide-y divide-slate-100 dark:divide-border/60 max-h-[180px] overflow-y-auto bg-white dark:bg-slate-950/10">
                      {fields.map((member, index) => (
                        <div
                          key={member.id}
                          className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors group animate-in slide-in-from-left-2 duration-200"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {member.email}
                            </span>
                            <span className="text-[9px] text-primary font-bold uppercase tracking-wider mt-0.5">
                              {member.role}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              remove(index);
                              toast.success(`Removed ${member.email}`);
                            }}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                            title="Remove invitation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[120px] border border-dashed border-slate-200 dark:border-border/80 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-1 bg-slate-50/30 dark:bg-slate-900/5 transition-all">
                    <Users className="w-6 h-6 opacity-30" />
                    <p className="text-xs">No team members invited yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Financial Wallet */}
            {step === 3 && (
              <div className="space-y-5 animate-in fade-in duration-300 text-center py-4">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-2 border border-emerald-500/10 shadow-sm animate-bounce duration-1000">
                  <Wallet className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">
                    Unified Ledger Initialization
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Your organization workspace includes dedicated Consumer (spend) and Provider (earn) ledger accounts.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm mx-auto mt-2">
                  <Card className="border border-slate-200 dark:border-border bg-slate-50/60 dark:bg-slate-900/20 p-0 text-left hover:scale-[1.02] transition-transform duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Free Credits</span>
                      </div>
                      <p className="text-xl font-bold text-slate-800 dark:text-slate-100">$100.00</p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1">Consumer wallet start credit</p>
                    </CardContent>
                  </Card>
                  <Card className="border border-slate-200 dark:border-border bg-slate-50/60 dark:bg-slate-900/20 p-0 text-left hover:scale-[1.02] transition-transform duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Revenue Account</span>
                      </div>
                      <p className="text-xl font-bold text-slate-800 dark:text-slate-100">$0.00</p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1">Provider revenue withdraws</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Workspace Creation Fee and Balance Check */}
                <div className="border border-border rounded-xl p-4 bg-background max-w-sm mx-auto text-left space-y-3 font-mono">
                  <div className="flex justify-between text-xs border-b border-border/60 pb-2">
                    <span className="text-muted-foreground font-semibold">Creation Fee:</span>
                    <span className="font-bold text-foreground">${orgFee.toFixed(2)} Credits</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-semibold">Personal Wallet Balance:</span>
                    <span className={`font-bold ${personalBalance < orgFee ? "text-red-400" : "text-emerald-400"}`}>
                      ${personalBalance.toFixed(2)} Credits
                    </span>
                  </div>
                  
                  {personalBalance < orgFee ? (
                    <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/20 text-[10px] text-red-750 dark:text-red-450 leading-normal">
                      ⚠️ <strong>Insufficient Balance:</strong> You need at least ${orgFee.toFixed(2)} credits in your personal wallet to create an organization workspace. Please top up your wallet in Settings.
                    </div>
                  ) : (
                    <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 text-[10px] text-emerald-700 dark:text-emerald-450 leading-normal">
                      ✓ Wallet balance verified. ${orgFee.toFixed(2)} credits will be charged upon creation.
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/10 flex items-center justify-between font-mono">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((step - 1) as 1 | 2)}
                className="py-2 h-9 text-xs cursor-pointer border-border hover:bg-accent text-foreground transition-all"
                disabled={isSubmitting}
              >
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/")}
                className="py-2 h-9 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}

            {step < 3 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="bg-primary hover:bg-primary/90 text-primary-foreground py-2 h-9 text-xs flex items-center gap-2 cursor-pointer font-bold transition-all hover:translate-x-0.5"
              >
                Next Step <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || personalBalance < orgFee}
                className="py-2 h-9 text-xs flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 border-none shadow-sm shadow-emerald-500/20 text-white cursor-pointer font-bold transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Initialize Workspace <Check className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </form>
    </div>
  );
}
