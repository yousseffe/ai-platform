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
import { LARGE_MODEL_SCHEMA_DETECTION_THRESHOLD_BYTES } from "@/lib/utils/upload-thresholds";
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
interface UploadModelWizardProps {
  cancelHref?: string;
  successRedirect?: (modelId: string) => string;
}

export default function UploadModelWizard({
  cancelHref = "/models",
  successRedirect,
}: UploadModelWizardProps) {
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
    isDetectingSchema,
    handleDetectSchema,
    hasDetected,
    detectedType,
    detectedFramework,
    detectedTaskType,
  } = useUploadModel({ successRedirect });

  const { register, setValue, handleSubmit, trigger, formState: { errors } } = form;

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans text-xs">
      <form onSubmit={handleSubmit(onSubmit as SubmitHandler<Record<string, unknown>>, onInvalidSubmit as (errors: Record<string, unknown>) => void)} className="space-y-4">
        <Card className="border border-border/80 shadow-xs p-0 overflow-hidden bg-card/70 text-foreground rounded-2xl transition-all duration-300">
          
          {/* Card Step Header */}
          <div className="px-6 py-4 border-b border-border/80 text-left select-none bg-secondary/10">
            <h2 className="text-sm font-extrabold text-foreground tracking-tight">
              {step === 1 ? "Step 1: General Model Info" : "Step 2: Upload Model & Detect Schema"}
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium leading-normal">
              {step === 1 
                ? "Provide your model's name, description, tags and visibility access settings."
                : "Upload your model weights and scripts, and let Qantara automatically analyze and detect the payload schemas."}
            </p>
          </div>
 
          {/* Form Content */}
          <CardContent className="p-6 space-y-5">
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
 
            {/* STEP 2: Upload & Configure (Side-by-Side layout) */}
            {step === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* Left Column: File Uploader & Code Files */}
                <div className="space-y-6">
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

                  {/* Upload security assurance */}
                  <div className="p-4 rounded-xl bg-secondary/15 border border-border/80 flex items-start gap-3 select-none">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                    <div className="text-left text-[10px] text-muted-foreground leading-normal font-medium">
                      We never store your raw weights or scripts. Files are used only for containerized compilation, configuration checking, and dry-run validation.
                    </div>
                  </div>
                </div>

                {/* Right Column: Schema Detection & Editors */}
                <div className="space-y-6">
                  <StepInterfaceConfig
                    register={register}
                    errors={errors}
                    isUploading={isUploading}
                    isDetectingSchema={isDetectingSchema}
                    handleDetectSchema={handleDetectSchema}
                    hasModelFile={!!modelFile}
                    isLargeModel={!!modelFile && modelFile.size > LARGE_MODEL_SCHEMA_DETECTION_THRESHOLD_BYTES}
                    hasDetected={hasDetected}
                    detectedType={detectedType}
                    detectedFramework={detectedFramework}
                    detectedTaskType={detectedTaskType}
                    setValue={setValue}
                  />
                </div>

              </div>
            )}
 
            {/* Global Stepper Loading & Progress Card */}
            {isUploading && (
              <div className="bg-secondary/20 p-6 rounded-2xl border border-border animate-fade-in text-xs space-y-3.5 shadow-sm mt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                    <span className="font-extrabold text-foreground">{uploadStatus}</span>
                  </div>
                  <span className="font-extrabold text-primary font-mono text-xs bg-primary/10 px-2 py-0.5 rounded-full">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-background border border-border/50 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300 ease-out shadow-sm"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal font-sans font-medium text-center">Your weights artifacts are being securely transferred to the containerization build queue.</p>
              </div>
            )}
          </CardContent>
 
          {/* Footer Actions */}
          <div className="px-6 py-3.5 border-t border-border bg-secondary/10 flex items-center justify-between">
            {step === 2 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => !isUploading && setStep(1)}
                className="py-2 h-10 text-xs cursor-pointer border-border hover:bg-accent text-foreground transition-all rounded-xl"
                disabled={isUploading}
              >
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push(cancelHref)}
                className="py-2 h-10 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-all rounded-xl"
                disabled={isUploading}
              >
                Cancel
              </Button>
            )}
 
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground hidden sm:flex font-semibold select-none">
              <ShieldCheck className="w-4 h-4 text-emerald-500 animate-pulse" /> Secure compilation scanning enabled
            </div>
 
            {step === 1 ? (
              <Button
                key="btn-next-step"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNextStep();
                }}
                className="bg-primary hover:bg-primary/95 text-primary-foreground py-2 h-10 px-5 text-xs flex items-center gap-2 cursor-pointer font-extrabold transition-all hover:translate-x-0.5 rounded-xl shadow-md shadow-primary/10"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                key="btn-submit-form"
                type="submit"
                disabled={isUploading}
                className="py-2 h-10 px-6 text-xs flex items-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground cursor-pointer font-extrabold transition-all disabled:opacity-50 rounded-xl shadow-md shadow-primary/10"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Continue to Build <ArrowRight className="w-4 h-4" />
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
