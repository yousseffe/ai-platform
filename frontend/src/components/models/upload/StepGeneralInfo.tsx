"use client";

import React from "react";
import { AlertCircle, Lock, Globe } from "lucide-react";
import { UseFormRegister, FieldErrors } from "react-hook-form";

import { type UploadModelFormInput } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepGeneralInfoProps {
  register: UseFormRegister<UploadModelFormInput>;
  errors: FieldErrors<UploadModelFormInput>;
  isUploading: boolean;
}

/**
 * Step 1 component of Model Upload: General Info.
 * Renders model name, custom tags, text descriptions, and visibility toggle options with premium aesthetics.
 *
 * @param props - Component parameters including form binder and state checks.
 * @returns The React component rendering Step 1.
 */
export default function StepGeneralInfo({ register, errors, isUploading }: StepGeneralInfoProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 font-sans">
            Model Name <span className="text-red-500 font-extrabold" title="Required">*</span>
          </Label>
          <Input
            id="name"
            type="text"
            {...register("name")}
            className={`h-11 px-4 border-slate-200 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200 rounded-xl bg-background/50 ${
              errors.name ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/10" : ""
            }`}
            placeholder="e.g. demand-forecast-v1"
            disabled={isUploading}
          />
          {errors.name && (
            <p className="text-[10px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
            Model Tags <span className="text-muted-foreground/60 font-normal lowercase">(optional)</span>
          </Label>
          <Input
            id="tags"
            type="text"
            className="h-11 px-4 border-slate-200 focus-visible:ring-primary/20 focus-visible:border-primary rounded-xl bg-background/50"
            placeholder="e.g. regression, pytorch, finance"
            disabled={isUploading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="type" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 font-sans">
            Model Type
          </Label>
          <select
            id="type"
            {...register("type")}
            className="h-11 px-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl bg-background/50 text-xs w-full transition-all duration-200 dark:border-border/60 dark:bg-slate-900/50 dark:text-slate-200"
            disabled={isUploading}
          >
            <option value="TABULAR">Tabular & Analytics</option>
            <option value="NLP">Natural Language (NLP)</option>
            <option value="VISION">Computer Vision</option>
            <option value="LLM_GGUF">Large Language Model (GGUF)</option>
            <option value="DIFFUSION">Stable Diffusion</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="framework" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 font-sans">
            Framework
          </Label>
          <select
            id="framework"
            {...register("framework")}
            className="h-11 px-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl bg-background/50 text-xs w-full transition-all duration-200 dark:border-border/60 dark:bg-slate-900/50 dark:text-slate-200"
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

        <div className="space-y-2">
          <Label htmlFor="taskType" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 font-sans">
            Task Type
          </Label>
          <select
            id="taskType"
            {...register("taskType")}
            className="h-11 px-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary rounded-xl bg-background/50 text-xs w-full transition-all duration-200 dark:border-border/60 dark:bg-slate-900/50 dark:text-slate-200"
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

      <div className="space-y-2">
        <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans">
          Description <span className="text-muted-foreground/60 font-normal lowercase">(optional)</span>
        </Label>
        <textarea
          id="description"
          {...register("description")}
          className={`form-input h-28 w-full resize-none rounded-xl border border-slate-200 bg-background/50 p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs transition-all duration-200 ${
            errors.description ? "border-red-500 focus:ring-red-500/10" : ""
          }`}
          placeholder="Describe the model's purpose, training data, and intended use cases..."
          disabled={isUploading}
        />
        {errors.description && (
          <p className="text-[10px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="mt-6 border-t border-slate-100 dark:border-border/60 pt-6">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-3 font-sans">
          Model Visibility
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="relative flex items-start gap-3.5 p-5 rounded-2xl border border-border bg-background/30 hover:bg-slate-50/20 dark:hover:bg-slate-900/10 hover:border-primary/50 cursor-pointer transition-all duration-200 shadow-sm">
            <input
              type="radio"
              value="false"
              className="mt-1.5 shrink-0 accent-primary"
              {...register("isPublic")}
              defaultChecked
              disabled={isUploading}
            />
            <div className="flex gap-3">
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">Private Mode</span>
                <span className="text-[10px] text-muted-foreground mt-1 block leading-relaxed font-sans font-medium">
                  Only you can view and deploy this model. Restricted access.
                </span>
              </div>
            </div>
          </label>

          <label className="relative flex items-start gap-3.5 p-5 rounded-2xl border border-border bg-background/30 hover:bg-slate-50/20 dark:hover:bg-slate-900/10 hover:border-primary/50 cursor-pointer transition-all duration-200 shadow-sm">
            <input
              type="radio"
              value="true"
              className="mt-1.5 shrink-0 accent-primary"
              {...register("isPublic")}
              disabled={isUploading}
            />
            <div className="flex gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-xl shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">View in Marketplace</span>
                <span className="text-[10px] text-muted-foreground mt-1 block leading-relaxed font-sans font-medium">
                  Make the model public to show in the Marketplace. Anyone can inspect and run it.
                </span>
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
