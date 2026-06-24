"use client";

import React from "react";
import { AlertCircle, Terminal, Sparkles, Loader2 } from "lucide-react";
import { UseFormRegister, FieldErrors } from "react-hook-form";

import { type UploadModelFormInput } from "@/lib/schemas";
import { Label } from "@/components/ui/label";

interface StepInterfaceConfigProps {
  register: UseFormRegister<UploadModelFormInput>;
  errors: FieldErrors<UploadModelFormInput>;
  isUploading: boolean;
  isDetectingSchema: boolean;
  handleDetectSchema: () => void;
  hasModelFile: boolean;
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
  isDetectingSchema,
  handleDetectSchema,
  hasModelFile,
}: StepInterfaceConfigProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Automated Schema Discovery Card */}
      <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20 p-4 rounded-xl border border-border/80">
        <div className="space-y-0.5">
          <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Automated Schema Discovery</h4>
          <p className="text-[10px] text-muted-foreground">Analyze your uploaded weights file to generate payload templates.</p>
        </div>
        <button
          type="button"
          disabled={!hasModelFile || isDetectingSchema || isUploading}
          onClick={handleDetectSchema}
          className="h-8 px-4 text-[10px] font-extrabold tracking-wide uppercase bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
        >
          {isDetectingSchema ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Detect Schema
            </>
          )}
        </button>
      </div>

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
    </div>
  );
}
