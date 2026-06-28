"use client";

import React from "react";
import { AlertCircle, Terminal, Sparkles, Loader2, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";

import { type UploadModelFormInput } from "@/lib/schemas";
import { Label } from "@/components/ui/label";

const TYPE_LABELS: Record<string, string> = {
  TABULAR: "Tabular & Analytics",
  NLP: "Natural Language (NLP)",
  VISION: "Computer Vision",
  LLM_GGUF: "Large Language Model (GGUF)",
  DIFFUSION: "Stable Diffusion",
};

const FRAMEWORK_LABELS: Record<string, string> = {
  SKLEARN: "Scikit-Learn",
  PYTORCH: "PyTorch",
  TENSORFLOW: "TensorFlow",
  ONNX: "ONNX Runtime",
  LLAMA_CPP: "Llama.cpp",
  VLLM: "vLLM",
  CUSTOM: "Custom/Python",
};

const TASK_LABELS: Record<string, string> = {
  CLASSIFICATION: "Classification",
  REGRESSION: "Regression",
  GENERATION: "Generation / Text-to-Image",
  OBJECT_DETECTION: "Object Detection",
  SEGMENTATION: "Segmentation",
  EMBEDDING: "Embedding",
  CHAT: "Chat / Conversational",
  OTHER: "Other / Miscellaneous",
};

interface StepInterfaceConfigProps {
  register: UseFormRegister<UploadModelFormInput>;
  errors: FieldErrors<UploadModelFormInput>;
  isUploading: boolean;
  isDetectingSchema: boolean;
  handleDetectSchema: () => void;
  hasModelFile: boolean;
  hasDetected: boolean;
  detectedType: string;
  detectedFramework: string;
  detectedTaskType: string;
  setValue: UseFormSetValue<UploadModelFormInput>;
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
  hasDetected,
  detectedType,
  detectedFramework,
  detectedTaskType,
  setValue,
}: StepInterfaceConfigProps) {
  const [showOverride, setShowOverride] = React.useState(!hasDetected);

  // Sync state if hasDetected changes
  React.useEffect(() => {
    if (hasDetected) {
      setShowOverride(false);
    }
  }, [hasDetected]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Automated Schema Discovery Card */}
      <div className="bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-border/80 space-y-4">
        <div className="flex items-center justify-between">
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

        {/* Badges Container for Detected Parameters */}
        {hasDetected && (
          <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-500/20 dark:bg-emerald-950/10 dark:border-emerald-500/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                Type: {TYPE_LABELS[detectedType] || detectedType}
              </span>
              <span className="text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                Framework: {FRAMEWORK_LABELS[detectedFramework] || detectedFramework}
              </span>
              <span className="text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                Task: {TASK_LABELS[detectedTaskType] || detectedTaskType}
              </span>
            </div>
            
            <button
              type="button"
              onClick={() => setShowOverride(!showOverride)}
              className="h-7 px-3 text-[9px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-background rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Settings2 className="w-3 h-3" />
              Adjust Parameters
              {showOverride ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        )}

        {/* Collapsible Manual Override selectors */}
        {showOverride && (
          <div className="pt-4 border-t border-dashed border-border/80 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-1.5">
              <label htmlFor="type" className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block font-sans">
                Model Type
              </label>
              <select
                id="type"
                {...register("type")}
                className="h-9 px-3 border border-border focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary rounded-lg bg-background text-[10px] w-full transition-all duration-200 dark:bg-slate-950 dark:border-border/60 dark:text-slate-200"
                disabled={isUploading}
              >
                <option value="TABULAR">Tabular & Analytics</option>
                <option value="NLP">Natural Language (NLP)</option>
                <option value="VISION">Computer Vision</option>
                <option value="LLM_GGUF">Large Language Model (GGUF)</option>
                <option value="DIFFUSION">Stable Diffusion</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="framework" className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block font-sans">
                Framework
              </label>
              <select
                id="framework"
                {...register("framework")}
                className="h-9 px-3 border border-border focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary rounded-lg bg-background text-[10px] w-full transition-all duration-200 dark:bg-slate-950 dark:border-border/60 dark:text-slate-200"
                disabled={isUploading}
              >
                <option value="SKLEARN">Scikit-Learn</option>
                <option value="PYTORCH">PyTorch</option>
                <option value="TENSORFLOW">TensorFlow</option>
                <option value="ONNX">ONNX Runtime</option>
                <option value="LLAMA_CPP">Llama.cpp</option>
                <option value="VLLM">vLLM</option>
                <option value="CUSTOM">Custom/Python</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="taskType" className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block font-sans">
                Task Type
              </label>
              <select
                id="taskType"
                {...register("taskType")}
                className="h-9 px-3 border border-border focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary rounded-lg bg-background text-[10px] w-full transition-all duration-200 dark:bg-slate-950 dark:border-border/60 dark:text-slate-200"
                disabled={isUploading}
              >
                <option value="CLASSIFICATION">Classification</option>
                <option value="REGRESSION">Regression</option>
                <option value="GENERATION">Generation / Text-to-Image</option>
                <option value="OBJECT_DETECTION">Object Detection</option>
                <option value="SEGMENTATION">Segmentation</option>
                <option value="EMBEDDING">Embedding</option>
                <option value="CHAT">Chat / Conversational</option>
                <option value="OTHER">Other / Miscellaneous</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        
        {/* Example Payload Code Input */}
        <div className="space-y-2 flex flex-col">
          <Label htmlFor="examplePayload" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
            <Terminal className="w-3.5 h-3.5 text-primary" /> Example Payload Input <span className="text-red-500 font-extrabold uppercase text-[9px] tracking-wider">(required)</span>
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
            <Terminal className="w-3.5 h-3.5 text-primary" /> Expected Prediction Result <span className="text-red-500 font-extrabold uppercase text-[9px] tracking-wider">(required)</span>
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
