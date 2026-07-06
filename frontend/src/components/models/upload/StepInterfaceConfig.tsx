"use client";

import React from "react";
import { AlertCircle, Terminal, Sparkles, Loader2, Settings2, ChevronDown, ChevronUp, Check } from "lucide-react";
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
  isLargeModel: boolean;
  hasDetected: boolean;
  detectedType: string;
  detectedFramework: string;
  detectedTaskType: string;
  setValue: UseFormSetValue<UploadModelFormInput>;
}

export default function StepInterfaceConfig({
  register,
  errors,
  isUploading,
  isDetectingSchema,
  handleDetectSchema,
  hasModelFile,
  isLargeModel,
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
      const timer = setTimeout(() => {
        setShowOverride(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [hasDetected]);
  return (
    <div className="space-y-5 animate-in fade-in duration-300 font-sans text-left">
      
      {/* Automated Schema Discovery Box */}
      <div className="p-3.5 bg-card/45 border border-border/80 rounded-2xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-foreground">Automated Schema Discovery</h4>
            <p className="text-[10px] text-muted-foreground leading-normal">
              {hasDetected 
                ? "Qantara detected the following input/output schema from your model weights." 
                : "Analyze your uploaded weights file to generate payload templates."}
            </p>
          </div>
          <button
            type="button"
            disabled={!hasModelFile || isDetectingSchema || isUploading}
            onClick={handleDetectSchema}
            className="h-7.5 px-3 text-[10px] font-bold bg-background hover:bg-secondary border border-border text-foreground rounded-lg disabled:opacity-50 flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98] select-none shrink-0"
          >
            {isDetectingSchema ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                {hasDetected ? "Auto-detect Again" : "Auto-detect Schema"}
              </>
            )}
          </button>
        </div>

        {/* Side-by-side JSON Request & Response editors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          
          {/* Example Payload Code Input */}
          <div className="space-y-2 flex flex-col">
            <div className="relative rounded-xl overflow-hidden border border-border/80 shadow-2xs flex-1 flex flex-col bg-[#0b0b0c]">
              <div className="bg-[#101113] border-b border-border/70 px-3 py-2 flex items-center justify-between text-[10px] font-bold text-muted-foreground select-none">
                <span className="font-mono text-[9.5px]">INPUT (Example)</span>
                <span className="text-[8.5px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.25 rounded border border-emerald-500/10 flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" /> Validated
                </span>
              </div>
              <textarea
                id="examplePayload"
                {...register("examplePayload")}
                className={`w-full bg-transparent text-indigo-200 dark:text-indigo-200/90 font-mono text-[10px] p-3 resize-none h-32 focus:outline-none focus:ring-0 leading-relaxed border-0 ${
                  errors.examplePayload ? "text-red-400" : ""
                }`}
                spellCheck="false"
                disabled={isUploading}
                placeholder={`{\n  "text": "sample input",\n  "max_length": 50\n}`}
              />
            </div>
            {errors.examplePayload && (
              <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.examplePayload.message}
              </p>
            )}
          </div>

          {/* Expected Result Code Input */}
          <div className="space-y-2 flex flex-col">
            <div className="relative rounded-xl overflow-hidden border border-border/80 shadow-2xs flex-1 flex flex-col bg-[#0b0b0c]">
              <div className="bg-[#101113] border-b border-border/70 px-3 py-2 flex items-center justify-between text-[10px] font-bold text-muted-foreground select-none">
                <span className="font-mono text-[9.5px]">OUTPUT (Example)</span>
                <span className="text-[8.5px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.25 rounded border border-emerald-500/10 flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" /> Validated
                </span>
              </div>
              <textarea
                id="expectedResult"
                {...register("expectedResult")}
                className={`w-full bg-transparent text-indigo-200 dark:text-indigo-200/90 font-mono text-[10px] p-3 resize-none h-32 focus:outline-none focus:ring-0 leading-relaxed border-0 ${
                  errors.expectedResult ? "text-red-400" : ""
                }`}
                spellCheck="false"
                disabled={isUploading}
                placeholder={`{\n  "label": "positive",\n  "confidence": 0.98\n}`}
              />
            </div>
            {errors.expectedResult && (
              <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.expectedResult.message}
              </p>
            )}
          </div>
        </div>

        {/* Smart Suggestions alert card */}
        <div className="p-2.5 px-3.5 bg-primary/5 border border-primary/10 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" />
            <div className="text-[10.5px] text-foreground font-semibold">
              Smart Suggestions: <span className="text-muted-foreground font-normal">We will optimize container GPU inference and auto-scaling based on traffic.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowOverride(!showOverride)}
            className="h-7 px-2.5 text-[9.5px] font-bold text-foreground hover:bg-background border border-border/80 rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0 active:scale-[0.98]"
          >
            <Settings2 className="w-3 h-3 text-primary" />
            Customize Settings
            {showOverride ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
          </button>
        </div>

        {/* Collapsible Manual Override selectors */}
        {showOverride && (
          <div className="p-3.5 rounded-xl border border-dashed border-border/80 bg-background/50 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-1.5">
              <label htmlFor="type" className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block font-mono">
                Model Type
              </label>
              <select
                id="type"
                {...register("type")}
                className="h-9 px-3 border border-border focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary rounded-lg bg-background text-[10px] w-full transition-all duration-200"
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
              <label htmlFor="framework" className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block font-mono">
                Framework
              </label>
              <select
                id="framework"
                {...register("framework")}
                className="h-9 px-3 border border-border focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary rounded-lg bg-background text-[10px] w-full transition-all duration-200"
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
              <label htmlFor="taskType" className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block font-mono">
                Task Type
              </label>
              <select
                id="taskType"
                {...register("taskType")}
                className="h-9 px-3 border border-border focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary rounded-lg bg-background text-[10px] w-full transition-all duration-200"
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

    </div>
  );
}
