"use client";

import React from "react";
import { UploadCloud, ShieldCheck, Check, Plus, FileJson, AlertCircle } from "lucide-react";
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
    <div className="space-y-4 animate-in fade-in duration-300 font-sans">
      
      {/* Model Weights Dropzone */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
          Model Weights File <span className="text-red-500 font-bold">*</span>
        </label>
        <div className="border border-dashed border-border/80 hover:border-primary/50 bg-background/50 hover:bg-secondary/20 rounded-xl p-5 flex flex-col items-center text-center transition-all duration-300 cursor-pointer relative group min-h-[110px] justify-center">
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
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1.5 shrink-0 group-hover:scale-105 transition-transform">
            <UploadCloud className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-foreground">Drag & drop your weights file here</p>
          <p className="text-[9.5px] text-muted-foreground mt-0.5">or click to browse</p>
          <div className="flex gap-1 mt-2.5 select-none flex-wrap justify-center">
            {["pt", "bin", "pkl", "joblib", "onnx", "zip"].map((ext) => (
              <span key={ext} className="text-[7.5px] font-bold px-1 py-0.25 rounded border border-border/60 bg-secondary/50 text-muted-foreground font-mono uppercase tracking-wider">{ext}</span>
            ))}
          </div>
        </div>
        
        {/* Attached file list item */}
        {modelFile && (
          <div className="p-2.5 rounded-lg border border-border/80 bg-card/60 flex items-center justify-between shadow-2xs animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-foreground truncate">{modelFile.name}</p>
                <p className="text-[9px] text-muted-foreground font-mono mt-0.25">{(modelFile.size / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">Loaded</span>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </div>
        )}
        
        {errors.modelFile && (
          <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {errors.modelFile.message as string}
          </p>
        )}
      </div>

      {/* Scaler Parameters Dropzone */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 font-mono">
          Scaler Parameters <span className="text-muted-foreground/60 font-normal lowercase font-sans">(optional)</span>
        </label>
        <div className="border border-dashed border-border/80 hover:border-primary/50 bg-background/50 hover:bg-secondary/20 rounded-xl p-5 flex flex-col items-center text-center transition-all duration-300 cursor-pointer relative group min-h-[95px] justify-center">
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
          <div className="w-8 h-8 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mb-1.5 shrink-0 group-hover:scale-105 transition-transform">
            <FileJson className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-foreground">Upload scaler parameters object</p>
          <p className="text-[9.5px] text-muted-foreground mt-0.5">Optional normalization parameters weights</p>
        </div>

        {/* Attached file list item */}
        {scalerFile && (
          <div className="p-2.5 rounded-lg border border-border/80 bg-card/60 flex items-center justify-between shadow-2xs animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-foreground truncate">{scalerFile.name}</p>
                <p className="text-[9px] text-muted-foreground font-mono mt-0.25">{(scalerFile.size / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">Loaded</span>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </div>
        )}
      </div>

      {/* Preprocessing script tabs */}
      <div className="border border-border/80 bg-card/45 backdrop-blur-xs rounded-xl overflow-hidden flex flex-col relative">
        <div className="bg-secondary/15 border-b border-border/80 px-3.5 py-2.5 flex items-center justify-between select-none">
          <span className="text-[10px] font-extrabold text-muted-foreground tracking-wider font-mono">PRE-PROCESSING (preprocess.py)</span>
          <div className="flex bg-background rounded-lg border border-border p-0.5 shadow-2xs">
            {["file", "code"].map((mode) => (
              <button
                key={mode}
                type="button"
                className={`px-3 py-0.5 text-[9px] font-bold rounded-md cursor-pointer transition-all uppercase ${
                  preprocessMode === mode 
                    ? "bg-secondary text-foreground font-semibold shadow-3xs" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setValue("preprocessMode", mode as "file" | "code")}
                disabled={isUploading}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        {preprocessMode === "file" ? (
          <div className={`p-4 flex items-center gap-3.5 hover:bg-secondary/20 cursor-pointer transition-colors relative min-h-[85px] ${
            preprocessFile ? "bg-emerald-500/5" : ""
          }`}>
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
            <div className={`w-8.5 h-8.5 rounded-lg border flex items-center justify-center shrink-0 ${
              preprocessFile 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 animate-pulse" 
                : "bg-background border-border text-muted-foreground"
            }`}>
              <span className="font-mono font-extrabold text-[11px]">&lt;/&gt;</span>
            </div>
            <div className="flex-1 text-left">
              <p className={`text-xs font-bold ${preprocessFile ? "text-emerald-500" : "text-foreground"}`}>
                {preprocessFile ? `Attached: ${preprocessFile.name}` : "Upload preprocess.py script"}
              </p>
              <p className="text-[9px] text-muted-foreground/80 mt-0.25 leading-relaxed">
                Must implement <code className="bg-secondary px-1 py-0.25 rounded text-[8px] text-primary font-mono">preprocess(data: dict)</code>.
              </p>
            </div>
            <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </div>
        ) : (
          <textarea
            className="w-full bg-slate-950 text-indigo-200 font-mono text-[10px] p-3.5 h-[85px] resize-none focus:outline-none border-0 leading-relaxed"
            placeholder="def preprocess(data: dict) -> dict:&#10;    # Process inputs&#10;    return data"
            {...register("preprocessCode")}
            disabled={isUploading}
          />
        )}
      </div>

      {/* Postprocessing script tabs */}
      <div className="border border-border/80 bg-card/45 backdrop-blur-xs rounded-xl overflow-hidden flex flex-col relative">
        <div className="bg-secondary/15 border-b border-border/80 px-3.5 py-2.5 flex items-center justify-between select-none">
          <span className="text-[10px] font-extrabold text-muted-foreground tracking-wider font-mono">POST-PROCESSING (postprocess.py)</span>
          <div className="flex bg-background rounded-lg border border-border p-0.5 shadow-2xs">
            {["file", "code"].map((mode) => (
              <button
                key={mode}
                type="button"
                className={`px-3 py-0.5 text-[9px] font-bold rounded-md cursor-pointer transition-all uppercase ${
                  postprocessMode === mode 
                    ? "bg-secondary text-foreground font-semibold shadow-3xs" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setValue("postprocessMode", mode as "file" | "code")}
                disabled={isUploading}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        {postprocessMode === "file" ? (
          <div className={`p-4 flex items-center gap-3.5 hover:bg-secondary/20 cursor-pointer transition-colors relative min-h-[85px] ${
            postprocessFile ? "bg-emerald-500/5" : ""
          }`}>
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
            <div className={`w-8.5 h-8.5 rounded-lg border flex items-center justify-center shrink-0 ${
              postprocessFile 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 animate-pulse" 
                : "bg-background border-border text-muted-foreground"
            }`}>
              <span className="font-mono font-extrabold text-[11px]">&lt;/&gt;</span>
            </div>
            <div className="flex-1 text-left">
              <p className={`text-xs font-bold ${postprocessFile ? "text-emerald-500" : "text-foreground"}`}>
                {postprocessFile ? `Attached: ${postprocessFile.name}` : "Upload postprocess.py script"}
              </p>
              <p className="text-[9px] text-muted-foreground/80 mt-0.25 leading-relaxed">
                Must implement <code className="bg-secondary px-1 py-0.25 rounded text-[8px] text-primary font-mono">postprocess(prediction)</code>.
              </p>
            </div>
            <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </div>
        ) : (
          <textarea
            className="w-full bg-slate-950 text-indigo-200 font-mono text-[10px] p-3.5 h-[85px] resize-none focus:outline-none border-0 leading-relaxed"
            placeholder="def postprocess(prediction) -> dict:&#10;    # Format output dictionary&#10;    return {'prediction': prediction}"
            {...register("postprocessCode")}
            disabled={isUploading}
          />
        )}
      </div>

    </div>
  );
}
