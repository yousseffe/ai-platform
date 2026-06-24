"use client";

import React from "react";
import { UploadCloud, ShieldCheck, Plus, FileJson, AlertCircle } from "lucide-react";
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";

import { type UploadModelFormInput } from "@/lib/schemas";

interface StepArtifactsProps {
  register: UseFormRegister<UploadModelFormInput>;
  setValue: UseFormSetValue<UploadModelFormInput>;
  errors: FieldErrors<UploadModelFormInput>;
  isUploading: boolean;
  modelFile: File | null;
  scalerFile: File | null;
  preprocessFile: File | null;
  preprocessMode: "file" | "code";
  postprocessFile: File | null;
  postprocessMode: "file" | "code";
}

/**
 * Step 2 component of Model Upload: Artifacts & Scripts.
 * Renders drag-and-drop file inputs for model weights and support normalizer scripts,
 * allowing code execution code text overrides.
 *
 * @param props - Subcomponent props checking form structures and dynamic watches.
 * @returns The React component layout for Step 2.
 */
export default function StepArtifacts({
  register,
  setValue,
  errors,
  isUploading,
  modelFile,
  scalerFile,
  preprocessFile,
  preprocessMode,
  postprocessFile,
  postprocessMode,
}: StepArtifactsProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Model Bundle Dropzone */}
        <div className="space-y-2">
          <div
            className={`border border-dashed rounded-2xl p-10 flex flex-col items-center text-center hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-all duration-300 cursor-pointer relative group min-h-[190px] justify-center ${
              modelFile 
                ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm shadow-emerald-500/5" 
                : "border-slate-300 bg-background/50 hover:border-primary/60"
            }`}
          >
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              onChange={(e) => {
                if (e.target.files?.length) {
                  setValue("modelFile", e.target.files[0], { shouldValidate: true });
                }
              }}
              disabled={isUploading}
            />
            <div className="absolute top-4 left-5 flex gap-2">
              <span className="text-[9px] font-bold text-slate-800 dark:text-slate-200 tracking-wider">MODEL WEIGHTS</span>
              <span className="bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-[8px] font-extrabold px-2 py-0.5 rounded-full flex items-center border border-red-500/15">REQUIRED *</span>
            </div>
            <span className="absolute top-4 right-5 text-[9px] text-slate-400 font-sans font-semibold">Max: 5GB</span>

            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mt-6 group-hover:scale-105 transition-transform duration-300 ${
                modelFile 
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 shadow-sm shadow-emerald-500/10" 
                  : "bg-indigo-50 text-indigo-500 dark:bg-indigo-950 dark:text-indigo-400"
              }`}
            >
              {modelFile ? <ShieldCheck className="w-7 h-7" /> : <UploadCloud className="w-7 h-7 animate-pulse" />}
            </div>
            <p className={`text-xs font-extrabold ${modelFile ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
              {modelFile ? `Attached: ${modelFile.name}` : "Drop weights file or click to browse"}
            </p>
            <p className="text-[10px] text-slate-400 mt-1.5 font-sans font-medium">Pickle (.pkl), ONNX (.onnx), or H5 (.h5) binaries</p>
          </div>
          {errors.modelFile && (
            <p className="text-[10px] text-red-500 font-bold mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.modelFile.message as string}
            </p>
          )}
        </div>

        {/* Scaler Bundle Dropzone */}
        <div className="space-y-2">
          <div
            className={`border border-dashed rounded-2xl p-10 flex flex-col items-center text-center hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-all duration-300 cursor-pointer relative group min-h-[190px] justify-center ${
              scalerFile 
                ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm shadow-emerald-500/5" 
                : "border-slate-300 bg-background/50 hover:border-primary/60"
            }`}
          >
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              onChange={(e) => {
                if (e.target.files?.length) {
                  setValue("scalerFile", e.target.files[0], { shouldValidate: true });
                }
              }}
              disabled={isUploading}
            />
            <div className="absolute top-4 left-5 flex gap-2">
              <span className="text-[9px] font-bold text-slate-800 dark:text-slate-200 tracking-wider">SCALER PARAMETERS</span>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[8px] font-extrabold px-2 py-0.5 rounded-full border border-border">OPTIONAL</span>
            </div>
            <span className="absolute top-4 right-5 text-[9px] text-slate-400 font-sans font-semibold">Max: 500MB</span>

            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mt-6 group-hover:scale-105 transition-transform duration-300 ${
                scalerFile 
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 shadow-sm shadow-emerald-500/10" 
                  : "bg-slate-50 text-slate-400 dark:bg-slate-850 dark:text-slate-500"
              }`}
            >
              {scalerFile ? <ShieldCheck className="w-7 h-7" /> : <FileJson className="w-7 h-7" />}
            </div>
            <p className={`text-xs font-extrabold ${scalerFile ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
              {scalerFile ? `Attached: ${scalerFile.name}` : "Upload scaler object weights"}
            </p>
            <p className="text-[10px] text-slate-400 mt-1.5 font-sans font-medium">Essential for preprocessing normalization weights</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Preprocessing script tabs */}
        <div className="border border-slate-200 dark:border-border rounded-xl overflow-hidden relative flex flex-col bg-background/50 backdrop-blur-sm shadow-sm transition-all duration-300">
          <div className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-border px-5 py-3.5 flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 tracking-wider">PRE-PROCESSING (preprocess.py)</span>
            <div className="flex bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-border p-0.5 shadow-sm">
              <button
                type="button"
                className={`px-3 py-1 text-[9px] font-extrabold rounded-md cursor-pointer transition-all ${
                  preprocessMode === "file" 
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setValue("preprocessMode", "file")}
                disabled={isUploading}
              >
                FILE
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-[9px] font-extrabold rounded-md cursor-pointer transition-all ${
                  preprocessMode === "code" 
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setValue("preprocessMode", "code")}
                disabled={isUploading}
              >
                CODE
              </button>
            </div>
          </div>
          {preprocessMode === "file" ? (
            <div
              className={`p-6 flex items-center gap-4 hover:bg-slate-50/30 dark:hover:bg-slate-900/5 cursor-pointer transition-colors relative min-h-[140px] ${
                preprocessFile ? "bg-emerald-500/5 dark:bg-emerald-500/5" : ""
              }`}
            >
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    setValue("preprocessFile", e.target.files[0], { shouldValidate: true });
                  }
                }}
                disabled={isUploading}
              />
              <div
                className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                  preprocessFile 
                    ? "bg-emerald-100 border-emerald-200 text-emerald-600 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-400" 
                    : "bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-border"
                }`}
              >
                {preprocessFile ? <ShieldCheck className="w-6 h-6 animate-pulse" /> : <span className="font-mono font-extrabold text-sm">&lt;/&gt;</span>}
              </div>
              <div className="flex-1">
                <p className={`text-xs font-bold ${preprocessFile ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
                  {preprocessFile ? `Attached: ${preprocessFile.name}` : "Upload preprocess.py script"}
                </p>
                <p className="text-[9.5px] text-muted-foreground/80 mt-1 font-sans font-medium">
                  Must implement <code className="bg-secondary dark:bg-slate-800 px-1.5 py-0.5 rounded text-[8.5px] text-primary">preprocess(data: dict) -&gt; list/dict</code>.
                </p>
              </div>
              <div className="w-7 h-7 rounded-full border border-slate-200 dark:border-border flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </div>
            </div>
          ) : (
            <textarea
              className="w-full bg-slate-950 text-emerald-400 font-mono text-[11px] p-5 h-[140px] resize-none focus:outline-none border-0 leading-relaxed"
              placeholder="def preprocess(data: dict) -> dict:&#10;    # Input features processing&#10;    # return dict or numpy array&#10;    return data"
              {...register("preprocessCode")}
              disabled={isUploading}
            />
          )}
        </div>

        {/* Postprocessing script tabs */}
        <div className="border border-slate-200 dark:border-border rounded-xl overflow-hidden relative flex flex-col bg-background/50 backdrop-blur-sm shadow-sm transition-all duration-300">
          <div className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-border px-5 py-3.5 flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 tracking-wider">POST-PROCESSING (postprocess.py)</span>
            <div className="flex bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-border p-0.5 shadow-sm">
              <button
                type="button"
                className={`px-3 py-1 text-[9px] font-extrabold rounded-md cursor-pointer transition-all ${
                  postprocessMode === "file" 
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setValue("postprocessMode", "file")}
                disabled={isUploading}
              >
                FILE
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-[9px] font-extrabold rounded-md cursor-pointer transition-all ${
                  postprocessMode === "code" 
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10" 
                    : "text-slate-500 hover:text-slate-700"
                }`}
                onClick={() => setValue("postprocessMode", "code")}
                disabled={isUploading}
              >
                CODE
              </button>
            </div>
          </div>
          {postprocessMode === "file" ? (
            <div
              className={`p-6 flex items-center gap-4 hover:bg-slate-50/30 dark:hover:bg-slate-900/5 cursor-pointer transition-colors relative min-h-[140px] ${
                postprocessFile ? "bg-emerald-500/5 dark:bg-emerald-500/5" : ""
              }`}
            >
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    setValue("postprocessFile", e.target.files[0], { shouldValidate: true });
                  }
                }}
                disabled={isUploading}
              />
              <div
                className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                  postprocessFile 
                    ? "bg-emerald-100 border-emerald-200 text-emerald-600 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-400" 
                    : "bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-border"
                }`}
              >
                {postprocessFile ? <ShieldCheck className="w-6 h-6 animate-pulse" /> : <FileJson className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <p className={`text-xs font-bold ${postprocessFile ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
                  {postprocessFile ? `Attached: ${postprocessFile.name}` : "Upload postprocess.py script"}
                </p>
                <p className="text-[9.5px] text-muted-foreground/80 mt-1 font-sans font-medium">
                  Must implement <code className="bg-secondary dark:bg-slate-800 px-1.5 py-0.5 rounded text-[8.5px] text-primary">postprocess(prediction: any) -&gt; dict</code>.
                </p>
              </div>
              <div className="w-7 h-7 rounded-full border border-slate-200 dark:border-border flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </div>
            </div>
          ) : (
            <textarea
              className="w-full bg-slate-950 text-emerald-405 font-mono text-[11px] p-5 h-[140px] resize-none focus:outline-none border-0 leading-relaxed"
              placeholder="def postprocess(prediction) -> dict:&#10;    # Format output dictionary&#10;    # return JSON serializable dict&#10;    return {'prediction': prediction}"
              {...register("postprocessCode")}
              disabled={isUploading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
