"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { SubmitHandler } from "react-hook-form";
import { 
  ShieldCheck, 
  Check, 
  ArrowRight, 
  Loader2 
} from "lucide-react";

import { useUploadModel } from "@/hooks/use-upload-model";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import StepGeneralInfo from "./upload/StepGeneralInfo";
import StepArtifacts from "./upload/StepArtifacts";
import StepInterfaceConfig from "./upload/StepInterfaceConfig";

/**
 * Premium, full-width model upload wizard component.
 * Coordinates stepper transitions, validation warnings, and rendering step presentation panels.
 * Delegates form state and network triggers to the useUploadModel custom hook.
 *
 * @returns The React component rendering the wizard.
 */
export default function UploadModelWizard() {
  const router = useRouter();
  
  const {
    form,
    step,
    setStep,
    isUploading,
    uploadProgress,
    uploadStatus,
    submitError,
    modelFile,
    scalerFile,
    preprocessFile,
    preprocessMode,
    postprocessFile,
    postprocessMode,
    handleNextStep,
    onSubmit,
    onInvalidSubmit,
  } = useUploadModel();

  const { register, setValue, handleSubmit, trigger, formState: { errors } } = form;

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-mono text-xs">
      <form onSubmit={handleSubmit(onSubmit as SubmitHandler<Record<string, unknown>>, onInvalidSubmit as (errors: Record<string, unknown>) => void)} className="space-y-4">
        <Card className="border border-border/70 shadow-xl shadow-slate-200/20 dark:shadow-black/20 p-0 overflow-hidden bg-card/90 text-foreground backdrop-blur-md rounded-2xl transition-all duration-300">
          
          {/* Stepper Wizard Indicator */}
          <div className="px-8 py-6 bg-slate-50/60 dark:bg-slate-900/30 border-b border-border/80 flex items-center justify-between text-[10px] font-semibold font-mono shrink-0 select-none">
            
            {/* Step 1 button */}
            <button
              type="button"
              onClick={() => !isUploading && step > 1 && setStep(1)}
              className={`flex items-center gap-2.5 transition-all duration-300 text-left cursor-pointer group ${
                step >= 1 ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
              disabled={isUploading}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center border text-[10px] transition-all duration-300 shadow-sm ${
                step > 1 
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/10" 
                  : step === 1
                    ? "bg-primary border-primary text-primary-foreground shadow-primary/20 ring-4 ring-primary/10"
                    : "border-border bg-background"
              }`}>
                {step > 1 ? <Check className="w-4 h-4" /> : "1"}
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] tracking-wider uppercase font-extrabold">Step 01</span>
                <span className="text-[9px] text-muted-foreground/80 font-normal">General Info</span>
              </div>
            </button>
            
            {/* Divider 1-2 */}
            <div className={`flex-1 h-0.5 mx-6 transition-all duration-500 ${
              step >= 2 ? "bg-primary/80" : "bg-slate-200 dark:bg-slate-800"
            }`} />
            
            {/* Step 2 button */}
            <button
              type="button"
              onClick={async () => {
                if (!isUploading && (step === 3 || (step === 1 && await trigger(["name", "description"])))) {
                  setStep(2);
                }
              }}
              className={`flex items-center gap-2.5 transition-all duration-300 text-left cursor-pointer group ${
                step >= 2 ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
              disabled={isUploading}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center border text-[10px] transition-all duration-300 shadow-sm ${
                step > 2 
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/10" 
                  : step === 2
                    ? "bg-primary border-primary text-primary-foreground shadow-primary/20 ring-4 ring-primary/10"
                    : "border-border bg-background"
              }`}>
                {step > 2 ? <Check className="w-4 h-4" /> : "2"}
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] tracking-wider uppercase font-extrabold">Step 02</span>
                <span className="text-[9px] text-muted-foreground/80 font-normal">Artifacts & Scripts</span>
              </div>
            </button>
            
            {/* Divider 2-3 */}
            <div className={`flex-1 h-0.5 mx-6 transition-all duration-500 ${
              step >= 3 ? "bg-primary/80" : "bg-slate-200 dark:bg-slate-800"
            }`} />
            
            {/* Step 3 button */}
            <button
              type="button"
              onClick={async () => {
                if (!isUploading) {
                  const isS1Valid = await trigger(["name", "description"]);
                  const isS2Valid = await trigger(["modelFile"]);
                  if (isS1Valid && isS2Valid) {
                    setStep(3);
                  }
                }
              }}
              className={`flex items-center gap-2.5 transition-all duration-300 text-left cursor-pointer group ${
                step === 3 ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
              disabled={isUploading}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center border text-[10px] transition-all duration-300 shadow-sm ${
                step === 3 
                  ? "bg-primary border-primary text-primary-foreground shadow-primary/20 ring-4 ring-primary/10" 
                  : "border-border bg-background"
              }`}>
                3
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] tracking-wider uppercase font-extrabold">Step 03</span>
                <span className="text-[9px] text-muted-foreground/80 font-normal">Configurations</span>
              </div>
            </button>
          </div>

          {/* Form Content */}
          <CardContent className="p-8 space-y-6">
            {submitError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-500/30 dark:text-red-400 text-xs font-semibold leading-relaxed animate-in shake duration-300">
                {submitError}
              </div>
            )}

            {/* STEP 1: General Info */}
            {step === 1 && (
              <StepGeneralInfo
                register={register}
                errors={errors}
                isUploading={isUploading}
              />
            )}

            {/* STEP 2: Artifacts & Scripts */}
            {step === 2 && (
              <StepArtifacts
                register={register}
                setValue={setValue}
                errors={errors}
                isUploading={isUploading}
                modelFile={modelFile}
                scalerFile={scalerFile}
                preprocessFile={preprocessFile}
                preprocessMode={preprocessMode}
                postprocessFile={postprocessFile}
                postprocessMode={postprocessMode}
              />
            )}

            {/* STEP 3: Interface Configuration */}
            {step === 3 && (
              <StepInterfaceConfig
                register={register}
                errors={errors}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                uploadStatus={uploadStatus}
              />
            )}
          </CardContent>

          {/* Footer Actions */}
          <div className="px-8 py-5 border-t border-border/80 bg-slate-50/50 dark:bg-slate-900/10 flex items-center justify-between font-mono">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => !isUploading && setStep((step - 1) as 1 | 2)}
                className="py-2 h-10 text-xs cursor-pointer border-border hover:bg-accent text-foreground transition-all rounded-xl"
                disabled={isUploading}
              >
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/models")}
                className="py-2 h-10 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-all rounded-xl"
                disabled={isUploading}
              >
                Cancel
              </Button>
            )}

            <div className="flex items-center gap-2 font-sans text-[10px] text-muted-foreground hidden sm:flex font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-500 animate-pulse" /> Securing scans enabled
            </div>

            {step < 3 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="bg-primary hover:bg-primary/95 text-primary-foreground py-2 h-10 px-5 text-xs flex items-center gap-2 cursor-pointer font-extrabold transition-all hover:translate-x-0.5 rounded-xl shadow-md shadow-primary/10"
              >
                Next Step <ArrowRight className="w-4 h-4 animate-pulse" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isUploading}
                className="py-2 h-10 px-6 text-xs flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 border-none shadow-md shadow-emerald-500/20 text-white cursor-pointer font-extrabold transition-all disabled:opacity-50 rounded-xl"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Submit to Queue <Check className="w-4 h-4" />
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
