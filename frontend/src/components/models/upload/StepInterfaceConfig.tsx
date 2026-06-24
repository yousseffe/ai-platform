"use client";

import React from "react";
import { AlertCircle, Terminal } from "lucide-react";
import { UseFormRegister, FieldErrors } from "react-hook-form";

import { type UploadModelFormInput } from "@/lib/schemas";
import { Label } from "@/components/ui/label";

interface StepInterfaceConfigProps {
  register: UseFormRegister<UploadModelFormInput>;
  errors: FieldErrors<UploadModelFormInput>;
  isUploading: boolean;
  uploadProgress: number;
  uploadStatus: string;
}

/**
 * Step 3 component of Model Upload: Interface Configuration.
 * Displays editable text areas validating custom sample prediction payloads and expected outputs,
 * showing transfer speeds/progress when submissions are active with a premium dark editor aesthetic.
 *
 * @param props - Form parameters and progress states.
 * @returns The React component rendering Step 3.
 */
export default function StepInterfaceConfig({
  register,
  errors,
  isUploading,
  uploadProgress,
  uploadStatus,
}: StepInterfaceConfigProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Example Payload Code Input */}
        <div className="space-y-2 flex flex-col">
          <Label htmlFor="examplePayload" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
            <Terminal className="w-3.5 h-3.5 text-primary" /> Example Payload Input <span className="text-muted-foreground/60 font-normal lowercase">(optional)</span>
          </Label>
          <div className="relative rounded-2xl overflow-hidden border border-border shadow-sm flex-1 flex flex-col bg-slate-950">
            <div className="bg-slate-900/60 border-b border-border/40 px-4 py-2 flex items-center justify-between text-[8px] font-bold text-slate-500 tracking-wider">
              <span>JSON REQUEST</span>
              <span className="text-emerald-500 font-extrabold uppercase">Validatable</span>
            </div>
            <textarea
              id="examplePayload"
              {...register("examplePayload")}
              className={`w-full bg-transparent text-indigo-200 font-mono text-[11px] p-5 resize-y h-56 focus:outline-none focus:ring-0 leading-relaxed border-0 ${
                errors.examplePayload ? "text-red-400" : ""
              }`}
              spellCheck="false"
              disabled={isUploading}
            />
          </div>
          {errors.examplePayload ? (
            <p className="text-[10px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.examplePayload.message}
            </p>
          ) : (
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans font-medium">Provide a sample request payload. The system performs a dry-run execution with this data inside the compiled container before deploying the active endpoint.</p>
          )}
        </div>

        {/* Expected Result Code Input */}
        <div className="space-y-2 flex flex-col">
          <Label htmlFor="expectedResult" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
            <Terminal className="w-3.5 h-3.5 text-primary" /> Expected Prediction Result <span className="text-muted-foreground/60 font-normal lowercase">(optional)</span>
          </Label>
          <div className="relative rounded-2xl overflow-hidden border border-border shadow-sm flex-1 flex flex-col bg-slate-950">
            <div className="bg-slate-900/60 border-b border-border/40 px-4 py-2 flex items-center justify-between text-[8px] font-bold text-slate-500 tracking-wider">
              <span>JSON RESPONSE</span>
              <span className="text-emerald-500 font-extrabold uppercase">Validatable</span>
            </div>
            <textarea
              id="expectedResult"
              {...register("expectedResult")}
              className={`w-full bg-transparent text-indigo-200 font-mono text-[11px] p-5 resize-y h-56 focus:outline-none focus:ring-0 leading-relaxed border-0 ${
                errors.expectedResult ? "text-red-400" : ""
              }`}
              spellCheck="false"
              disabled={isUploading}
            />
          </div>
          {errors.expectedResult ? (
            <p className="text-[10px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.expectedResult.message}
            </p>
          ) : (
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans font-medium">Provide the expected response JSON structure. Used to auto-generate the prediction schema and build interactive playground sandboxes.</p>
          )}
        </div>
      </div>

      {/* Submission Loading & Progress Card */}
      {isUploading && (
        <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-2xl border border-border/80 animate-fade-in text-xs space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
              <span className="font-extrabold text-slate-800 dark:text-slate-200">{uploadStatus}</span>
            </div>
            <span className="font-extrabold text-primary font-mono text-xs bg-primary/10 px-2 py-0.5 rounded-full">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-background border border-border/50 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-normal font-sans font-medium text-center">Your weights artifacts are being securely transferred to the containerization build queue.</p>
        </div>
      )}
    </div>
  );
}
