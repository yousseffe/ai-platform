"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

import { useWorkspace } from "@/hooks/use-workspace";
import { smartFetch } from "@/lib/utils/smart-fetch";
import { OrgRole, OrgType } from "@/types";
import { workspaceCreateSchema, type WorkspaceCreateInput } from "@/lib/schemas/workspaces";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import StepWorkspaceType from "./steps/StepWorkspaceType";
import StepProfileDetails from "./steps/StepProfileDetails";
import StepCollaborators from "./steps/StepCollaborators";
import StepWalletReview from "./steps/StepWalletReview";

/**
 * Highly interactive 4-step organization workspace onboarding wizard.
 * Coordinates input fields, binds react-hook-form schema validations,
 * displays cards for workspace profiles, and redirects to Stripe Checkout.
 *
 * @returns The React component rendering the wizard flow.
 */
export default function CreateWorkspaceWizard() {
  const router = useRouter();
  const { createOrganization } = useWorkspace();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orgFee, setOrgFee] = useState<number>(50);

  // Fetch the creation fee from backend system config
  useEffect(() => {
    const fetchCreationFee = async () => {
      try {
        const feeRes = await smartFetch<{ fee: number }>("/organizations/config/org-creation-fee");
        if (feeRes && typeof feeRes.fee === "number") {
          setOrgFee(feeRes.fee);
        }
      } catch (err) {
        console.error("Failed to fetch organization creation fee:", err);
      }
    };
    fetchCreationFee();
  }, []);

  // Collaborator local invite states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>(OrgRole.CONTRIBUTOR);
  const [inviteError, setInviteError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    trigger,
    watch,
    reset,
    formState: { errors },
  } = useForm<WorkspaceCreateInput>({
    resolver: zodResolver(workspaceCreateSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      slug: "",
      type: OrgType.CONSUMER,
      description: "",
      avatarUrl: "",
      collaborators: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "collaborators",
  });

  const watchType = watch("type");
  const watchName = watch("name");
  const watchSlug = watch("slug");
  const watchDescription = watch("description");

  /**
   * Generates a clean URL slug from the name string.
   */
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue("name", val, { shouldValidate: true });
    const derived = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setValue("slug", derived, { shouldValidate: true });
  };

  /**
   * Manages manual URL slug changes.
   */
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("slug", e.target.value, { shouldValidate: true });
  };

  /**
   * Runs local collaborator checks and updates invitation fields list.
   */
  const handleAddCollaborator = () => {
    setInviteError("");
    if (!inviteEmail.trim()) {
      setInviteError("Email address is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setInviteError("Please enter a valid email address.");
      return;
    }
    const isDuplicate = fields.some((item) => item.email.toLowerCase() === inviteEmail.toLowerCase());
    if (isDuplicate) {
      setInviteError("This email has already been invited.");
      return;
    }

    append({
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
    });

    toast.success(`Invited ${inviteEmail} as ${inviteRole.toLowerCase()}`);
    setInviteEmail("");
    setInviteRole(OrgRole.CONTRIBUTOR);
  };

  /**
   * Steps navigation validating current step fields.
   */
  const handleNextStep = async () => {
    setSubmitError("");
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      const isValid = await trigger(["name", "slug", "description", "avatarUrl"]);
      if (isValid) {
        setStep(3);
      }
    } else if (step === 3) {
      setStep(4);
    }
  };

  /**
   * Wizard submit handler: calls Zustand action to generate checkout redirect URL.
   */
  const onSubmit = async (data: WorkspaceCreateInput) => {
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const res = await createOrganization(
        data.name,
        data.slug,
        data.collaborators,
        data.type,
        data.description,
        data.avatarUrl
      );

      if (res.success && res.data?.url) {
        toast.success("Checkout session created! Redirecting...");
        reset();
        window.location.href = res.data.url;
      } else {
        setSubmitError(res.error || "Failed to create payment session. Please check details.");
        toast.error("Checkout session initiation failed.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to initiate payment session";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Developer bypass action: creates the workspace instantly by debiting local wallet credits.
   */
  const handleBypassCreate = async () => {
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const res = await createOrganization(
        watchName,
        watchSlug,
        watch("collaborators") || [],
        watchType,
        watchDescription,
        watch("avatarUrl"),
        true // bypassPayment = true
      );

      if (res.success) {
        toast.success("Workspace successfully created!");
        reset();
        router.push("/");
        router.refresh();
      } else {
        setSubmitError(res.error || "Failed to create workspace. Please check details.");
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
      {/* Wizard header */}
      <div className="space-y-1 font-mono text-left">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Create New Workspace
        </h1>
        <p className="text-xs text-muted-foreground">Configure profiles, invite members, and initialize secure checkout.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card className="border border-border/80 shadow-md p-0 overflow-hidden bg-card text-foreground backdrop-blur-sm bg-opacity-95">
          {/* Stepper Wizard Progress Indicators */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-b border-border flex items-center justify-between text-[9px] font-semibold font-mono shrink-0 select-none">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => step > 1 && setStep(1)}
              className={`flex items-center gap-1.5 transition-colors duration-200 text-left ${
                step >= 1 ? "text-primary font-bold" : "text-muted-foreground"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[8px] transition-all duration-300 ${
                step > 1 ? "bg-primary border-primary text-primary-foreground" : "border-border"
              }`}>
                {step > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
              </span>
              Type
            </button>

            <div className={`w-6 h-px ${step >= 2 ? "bg-primary" : "bg-border"}`} />

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => step > 2 && setStep(2)}
              className={`flex items-center gap-1.5 transition-colors duration-200 text-left ${
                step >= 2 ? "text-primary font-bold" : "text-muted-foreground"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[8px] transition-all duration-300 ${
                step > 2 ? "bg-primary border-primary text-primary-foreground" : "border-border"
              }`}>
                {step > 2 ? <Check className="w-3.5 h-3.5" /> : "2"}
              </span>
              Profile
            </button>

            <div className={`w-6 h-px ${step >= 3 ? "bg-primary" : "bg-border"}`} />

            {/* Step 3 */}
            <button
              type="button"
              onClick={async () => {
                if (step > 3 || (step === 2 && await trigger(["name", "slug"]))) {
                  setStep(3);
                }
              }}
              className={`flex items-center gap-1.5 transition-colors duration-200 text-left ${
                step >= 3 ? "text-primary font-bold" : "text-muted-foreground"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[8px] transition-all duration-300 ${
                step > 3 ? "bg-primary border-primary text-primary-foreground" : "border-border"
              }`}>
                {step > 3 ? <Check className="w-3.5 h-3.5" /> : "3"}
              </span>
              Teammates
            </button>

            <div className={`w-6 h-px ${step >= 4 ? "bg-primary" : "bg-border"}`} />

            {/* Step 4 */}
            <button
              type="button"
              onClick={async () => {
                const isValid = await trigger(["name", "slug"]);
                if (isValid) {
                  setStep(4);
                }
              }}
              className={`flex items-center gap-1.5 transition-colors duration-200 text-left ${
                step === 4 ? "text-primary font-bold" : "text-muted-foreground"
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[8px] transition-all duration-300 ${
                step === 4 ? "border-primary text-primary" : "border-border"
              }`}>
                4
              </span>
              Review
            </button>
          </div>

          <CardContent className="p-6 space-y-4">
            {submitError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-500/30 dark:text-red-400 text-xs font-semibold leading-relaxed animate-in shake duration-300 font-mono text-left">
                {submitError}
              </div>
            )}

            {/* STEP 1: Workspace Type selection */}
            {step === 1 && (
              <StepWorkspaceType
                value={watchType}
                onChange={(val) => setValue("type", val, { shouldValidate: true })}
              />
            )}

            {/* STEP 2: Profile Details */}
            {step === 2 && (
              <StepProfileDetails
                register={register}
                errors={errors}
                slugValue={watchSlug}
                descriptionValue={watchDescription}
                onNameChange={handleNameChange}
                onSlugChange={handleSlugChange}
              />
            )}

            {/* STEP 3: Collaborators */}
            {step === 3 && (
              <StepCollaborators
                fields={fields}
                remove={remove}
                inviteEmail={inviteEmail}
                setInviteEmail={setInviteEmail}
                inviteRole={inviteRole}
                setInviteRole={setInviteRole}
                inviteError={inviteError}
                setInviteError={setInviteError}
                handleAddCollaborator={handleAddCollaborator}
              />
            )}

            {/* STEP 4: Review & Wallet details */}
            {step === 4 && (
              <StepWalletReview
                orgFee={orgFee}
                orgType={watchType}
                orgName={watchName}
                orgSlug={watchSlug}
                orgDescription={watchDescription}
              />
            )}
          </CardContent>

          {/* Stepper Footer actions */}
          <div className="px-6 py-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/10 flex items-center justify-between font-mono">
            {step > 1 ? (
              <Button
                key="back-btn"
                type="button"
                variant="outline"
                onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                className="py-2 h-9 text-xs cursor-pointer border-border hover:bg-accent text-foreground transition-all"
                disabled={isSubmitting}
              >
                Back
              </Button>
            ) : (
              <Button
                key="cancel-btn"
                type="button"
                variant="ghost"
                onClick={() => router.push("/")}
                className="py-2 h-9 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}

            {step < 4 ? (
              <Button
                key="next-btn"
                type="button"
                onClick={handleNextStep}
                className="bg-primary hover:bg-primary/90 text-primary-foreground py-2 h-9 text-xs flex items-center gap-2 cursor-pointer font-bold transition-all hover:translate-x-0.5"
              >
                Next Step <ArrowRight className="w-3.5 h-3.5 animate-pulse" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  key="bypass-btn"
                  type="button"
                  onClick={handleBypassCreate}
                  disabled={isSubmitting}
                  className="py-2 h-9 px-3.5 text-xs bg-slate-850 dark:bg-slate-800 hover:bg-slate-700 border border-border text-foreground hover:text-foreground cursor-pointer font-semibold transition-all disabled:opacity-50 rounded-lg"
                >
                  Bypass with Credits (Dev)
                </Button>
                <Button
                  key="submit-btn"
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                  className="py-2 h-9 text-xs flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 border-none shadow-sm shadow-emerald-500/20 text-white cursor-pointer font-bold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating payment...
                    </>
                  ) : (
                    <>
                      Checkout with Stripe <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </form>
    </div>
  );
}
