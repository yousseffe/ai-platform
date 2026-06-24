import React from "react";
import { 
  UploadCloud, 
  ShieldCheck, 
  Plus, 
  FileJson, 
  Sparkles, 
  Loader2, 
  Terminal, 
  FileCode 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PushVersionFormProps {
  modelId: string;
  onCancel: () => void;
  modelFile: File | null;
  setModelFile: (file: File | null) => void;
  scalerFile: File | null;
  setScalerFile: (file: File | null) => void;
  preprocessFile: File | null;
  setPreprocessFile: (file: File | null) => void;
  postprocessFile: File | null;
  setPostprocessFile: (file: File | null) => void;
  preprocessMode: "file" | "code";
  setPreprocessMode: (mode: "file" | "code") => void;
  preprocessCode: string;
  setPreprocessCode: (code: string) => void;
  postprocessMode: "file" | "code";
  setPostprocessMode: (mode: "file" | "code") => void;
  postprocessCode: string;
  setPostprocessCode: (code: string) => void;
  examplePayload: string;
  setExamplePayload: (payload: string) => void;
  expectedResult: string;
  setExpectedResult: (result: string) => void;
  onUpload: () => void;
  uploadProgress: number;
  uploadStatus: string;
  isUploading: boolean;
  isDetectingSchema: boolean;
  onDetectSchema: () => void;
}

/**
 * Standalone form card component for version upload, mimicking the Upload Model wizard layout.
 */
export default function PushVersionForm({
  onCancel,
  modelFile,
  setModelFile,
  scalerFile,
  setScalerFile,
  preprocessFile,
  setPreprocessFile,
  postprocessFile,
  setPostprocessFile,
  preprocessMode,
  setPreprocessMode,
  preprocessCode,
  setPreprocessCode,
  postprocessMode,
  setPostprocessMode,
  postprocessCode,
  setPostprocessCode,
  examplePayload,
  setExamplePayload,
  expectedResult,
  setExpectedResult,
  onUpload,
  uploadProgress,
  uploadStatus,
  isUploading,
  isDetectingSchema,
  onDetectSchema,
}: PushVersionFormProps) {
  return (
    <Card className="border border-border/70 shadow-xl shadow-slate-200/20 dark:shadow-black/20 p-0 overflow-hidden bg-card/90 text-foreground backdrop-blur-md rounded-2xl transition-all duration-300 font-mono text-xs">
      
      {/* Form Title Header bar */}
      <div className="px-8 py-6 bg-slate-50/60 dark:bg-slate-900/30 border-b border-border/80 flex items-center justify-between text-[10px] font-semibold font-mono shrink-0 select-none">
        <div className="flex flex-col">
          <span className="text-[10px] tracking-wider uppercase font-extrabold text-primary">PUSH PARAMETERS</span>
          <span className="text-[9px] text-muted-foreground/80 font-normal">Define code overrides or model weights below</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-[9px] font-sans font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-500 animate-pulse" /> Carry-over sync active
        </div>
      </div>

      {/* Form Content */}
      <CardContent className="p-8 space-y-6">
        
        {/* Info Banner */}
        <p className="text-[10px] text-primary bg-primary/5 p-4 rounded-xl border border-primary/10 leading-relaxed font-sans font-medium">
          <Sparkles className="w-3.5 h-3.5 text-primary inline mr-1.5 animate-pulse" />
          <strong>Carry-over synchronization enabled:</strong> You only need to upload files that have changed. Any files left empty are carried over from the previous version automatically, saving storage and build time!
        </p>

        {/* Row 1: Dropzones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Model Bundle Dropzone */}
          <div className="space-y-2">
            <div
              className={`border border-dashed rounded-2xl p-8 flex flex-col items-center text-center hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-all duration-300 cursor-pointer relative group min-h-[170px] justify-center ${
                modelFile 
                  ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm shadow-emerald-500/5" 
                  : "border-slate-300 bg-background/50 hover:border-primary/60"
              }`}
            >
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={(e) => {
                  if (e.target.files?.length) setModelFile(e.target.files[0]);
                }}
                disabled={isUploading}
              />
              <div className="absolute top-4 left-5 flex gap-2">
                <span className="text-[8px] font-bold text-slate-800 dark:text-slate-200 tracking-wider">MODEL WEIGHTS</span>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px] font-extrabold px-2 py-0.5 rounded-full border border-border">CARRY OVER IF EMPTY</span>
              </div>
              <span className="absolute top-4 right-5 text-[8px] text-slate-400 font-sans font-semibold">Max: 5GB</span>

              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 mt-4 group-hover:scale-105 transition-transform duration-300 ${
                  modelFile 
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 shadow-sm shadow-emerald-500/10" 
                    : "bg-indigo-50 text-indigo-500 dark:bg-indigo-950 dark:text-indigo-400"
                }`}
              >
                {modelFile ? <ShieldCheck className="w-6 h-6" /> : <UploadCloud className="w-6 h-6 animate-pulse" />}
              </div>
              <p className={`text-xs font-extrabold ${modelFile ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
                {modelFile ? `Attached: ${modelFile.name}` : "Drop weights file or click to browse"}
              </p>
              <p className="text-[9px] text-slate-400 mt-1 font-sans font-medium">Pickle (.pkl), ONNX (.onnx), or H5 (.h5) binaries</p>
            </div>
          </div>

          {/* Scaler Bundle Dropzone */}
          <div className="space-y-2">
            <div
              className={`border border-dashed rounded-2xl p-8 flex flex-col items-center text-center hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-all duration-300 cursor-pointer relative group min-h-[170px] justify-center ${
                scalerFile 
                  ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm shadow-emerald-500/5" 
                  : "border-slate-300 bg-background/50 hover:border-primary/60"
              }`}
            >
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={(e) => {
                  if (e.target.files?.length) setScalerFile(e.target.files[0]);
                }}
                disabled={isUploading}
              />
              <div className="absolute top-4 left-5 flex gap-2">
                <span className="text-[8px] font-bold text-slate-800 dark:text-slate-200 tracking-wider">SCALER PARAMETERS</span>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8px] font-extrabold px-2 py-0.5 rounded-full border border-border">CARRY OVER IF EMPTY</span>
              </div>
              <span className="absolute top-4 right-5 text-[8px] text-slate-400 font-sans font-semibold">Max: 500MB</span>

              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 mt-4 group-hover:scale-105 transition-transform duration-300 ${
                  scalerFile 
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 shadow-sm shadow-emerald-500/10" 
                    : "bg-slate-50 text-slate-400 dark:bg-slate-850 dark:text-slate-500"
                }`}
              >
                {scalerFile ? <ShieldCheck className="w-6 h-6" /> : <FileJson className="w-6 h-6" />}
              </div>
              <p className={`text-xs font-extrabold ${scalerFile ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
                {scalerFile ? `Attached: ${scalerFile.name}` : "Upload scaler object weights"}
              </p>
              <p className="text-[9px] text-slate-400 mt-1 font-sans font-medium">Essential for preprocessing normalization weights</p>
            </div>
          </div>
        </div>

        {/* Row 2: Scripts Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Preprocessing script tabs */}
          <div className="border border-slate-200 dark:border-border rounded-2xl overflow-hidden relative flex flex-col bg-background/50 backdrop-blur-sm shadow-sm transition-all duration-300">
            <div className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-border px-5 py-3.5 flex items-center justify-between">
              <span className="text-[9px] font-extrabold text-slate-700 dark:text-slate-300 tracking-wider">PRE-PROCESSING (preprocess.py)</span>
              <div className="flex bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-border p-0.5 shadow-sm">
                <button
                  type="button"
                  className={`px-3 py-1 text-[8px] font-extrabold rounded-md cursor-pointer transition-all ${
                    preprocessMode === "file" 
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10" 
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  onClick={() => setPreprocessMode("file")}
                  disabled={isUploading}
                >
                  FILE
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 text-[8px] font-extrabold rounded-md cursor-pointer transition-all ${
                    preprocessMode === "code" 
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10" 
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  onClick={() => setPreprocessMode("code")}
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
                    if (e.target.files?.length) setPreprocessFile(e.target.files[0]);
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
                  {preprocessFile ? <ShieldCheck className="w-6 h-6 animate-pulse" /> : <FileCode className="w-6 h-6 text-slate-450" />}
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-bold ${preprocessFile ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
                    {preprocessFile ? `Attached: ${preprocessFile.name}` : "Upload preprocess.py script"}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-1 font-sans font-medium">Or leave empty to carry over.</p>
                </div>
                <div className="w-7 h-7 rounded-full border border-slate-200 dark:border-border flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </div>
            ) : (
              <textarea
                className="w-full bg-slate-950 text-emerald-400 font-mono text-[10px] p-5 h-[140px] resize-none focus:outline-none border-0 leading-relaxed"
                placeholder="def preprocess(data):&#10;    # Input features processing&#10;    # return dict / lists&#10;    return data"
                value={preprocessCode}
                onChange={(e) => setPreprocessCode(e.target.value)}
                disabled={isUploading}
              />
            )}
          </div>

          {/* Postprocessing script tabs */}
          <div className="border border-slate-200 dark:border-border rounded-2xl overflow-hidden relative flex flex-col bg-background/50 backdrop-blur-sm shadow-sm transition-all duration-300">
            <div className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-border px-5 py-3.5 flex items-center justify-between">
              <span className="text-[9px] font-extrabold text-slate-700 dark:text-slate-350 tracking-wider">POST-PROCESSING (postprocess.py)</span>
              <div className="flex bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-border p-0.5 shadow-sm">
                <button
                  type="button"
                  className={`px-3 py-1 text-[8px] font-extrabold rounded-md cursor-pointer transition-all ${
                    postprocessMode === "file" 
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10" 
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  onClick={() => setPostprocessMode("file")}
                  disabled={isUploading}
                >
                  FILE
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 text-[8px] font-extrabold rounded-md cursor-pointer transition-all ${
                    postprocessMode === "code" 
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10" 
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  onClick={() => setPostprocessMode("code")}
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
                    if (e.target.files?.length) setPostprocessFile(e.target.files[0]);
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
                  {postprocessFile ? <ShieldCheck className="w-6 h-6 animate-pulse" /> : <FileCode className="w-6 h-6 text-slate-450" />}
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-bold ${postprocessFile ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
                    {postprocessFile ? `Attached: ${postprocessFile.name}` : "Upload postprocess.py script"}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-1 font-sans font-medium">Or leave empty to carry over.</p>
                </div>
                <div className="w-7 h-7 rounded-full border border-slate-200 dark:border-border flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </div>
            ) : (
              <textarea
                className="w-full bg-slate-950 text-emerald-400 font-mono text-[10px] p-5 h-[140px] resize-none focus:outline-none border-0 leading-relaxed"
                placeholder="def postprocess(prediction):&#10;    # Format output dictionary&#10;    # return dict&#10;    return prediction"
                value={postprocessCode}
                onChange={(e) => setPostprocessCode(e.target.value)}
                disabled={isUploading}
              />
            )}
          </div>
        </div>

        {/* Row 3: Interface Config */}
        <div className="space-y-4 border-t border-border/80 pt-6">
          
          {/* Automated Schema Discovery Card */}
          <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/20 p-4 rounded-xl border border-border/80">
            <div className="space-y-0.5">
              <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200">Automated Schema Discovery</h4>
              <p className="text-[9px] text-muted-foreground font-sans">Analyze your attached weights file to generate payload templates.</p>
            </div>
            <button
              type="button"
              disabled={!modelFile || isDetectingSchema || isUploading}
              onClick={onDetectSchema}
              className="h-8 px-4 text-[9px] font-extrabold tracking-wide uppercase bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              {isDetectingSchema ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 font-bold" />
                  Auto-Detect
                </>
              )}
            </button>
          </div>

          {/* Payloads Textareas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Example Payload Input */}
            <div className="space-y-2 flex flex-col">
              <label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
                <Terminal className="w-3.5 h-3.5 text-primary" /> Example Payload Input <span className="text-muted-foreground/60 font-normal lowercase font-sans">(optional if unchanged)</span>
              </label>
              <div className="relative rounded-2xl overflow-hidden border border-border shadow-sm flex-1 flex flex-col bg-slate-950">
                <div className="bg-slate-900/60 border-b border-border/40 px-4 py-2 flex items-center justify-between text-[8px] font-bold text-slate-500 tracking-wider">
                  <span>JSON REQUEST</span>
                  <span className="text-emerald-500 font-extrabold uppercase">Validatable</span>
                </div>
                <textarea
                  className="w-full bg-transparent text-indigo-200 font-mono text-[10px] p-5 h-44 resize-y focus:outline-none focus:ring-0 leading-relaxed border-0"
                  value={examplePayload}
                  onChange={(e) => setExamplePayload(e.target.value)}
                  placeholder="Leave empty to carry over previous version's payload..."
                  disabled={isUploading}
                  spellCheck="false"
                />
              </div>
              <p className="text-[9px] text-slate-400 leading-relaxed font-sans font-medium">Provide a sample request structure to help users understand the API interface.</p>
            </div>

            {/* Expected Prediction Result */}
            <div className="space-y-2 flex flex-col">
              <label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
                <Terminal className="w-3.5 h-3.5 text-primary" /> Expected Prediction Result <span className="text-muted-foreground/60 font-normal lowercase font-sans">(optional if unchanged)</span>
              </label>
              <div className="relative rounded-2xl overflow-hidden border border-border shadow-sm flex-1 flex flex-col bg-slate-950">
                <div className="bg-slate-900/60 border-b border-border/40 px-4 py-2 flex items-center justify-between text-[8px] font-bold text-slate-500 tracking-wider">
                  <span>JSON RESPONSE</span>
                  <span className="text-emerald-500 font-extrabold uppercase">Validatable</span>
                </div>
                <textarea
                  className="w-full bg-transparent text-indigo-200 font-mono text-[10px] p-5 h-44 resize-y focus:outline-none focus:ring-0 leading-relaxed border-0"
                  value={expectedResult}
                  onChange={(e) => setExpectedResult(e.target.value)}
                  placeholder="Leave empty to carry over previous version's expected result..."
                  disabled={isUploading}
                  spellCheck="false"
                />
              </div>
              <p className="text-[9px] text-slate-400 leading-relaxed font-sans font-medium">Define the schema for successful model inference responses.</p>
            </div>
          </div>
        </div>

        {/* Dynamic upload progress bar */}
        {isUploading && (
          <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-2xl border border-border/80 animate-fade-in text-xs space-y-3.5 shadow-sm mt-6">
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
            <p className="text-[9px] text-slate-400 leading-normal font-sans font-medium text-center">Your version artifacts are being securely transferred to the registry build queue.</p>
          </div>
        )}

      </CardContent>

      {/* Footer */}
      <div className="px-8 py-5 border-t border-border/80 bg-slate-50/50 dark:bg-slate-900/10 flex justify-between items-center font-mono select-none">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="py-2 h-10 text-xs cursor-pointer border-border hover:bg-accent text-foreground transition-all rounded-xl"
          disabled={isUploading}
        >
          Cancel
        </Button>
        <button
          onClick={onUpload}
          disabled={isUploading}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50 h-10"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" /> Push Version
            </>
          )}
        </button>
      </div>

    </Card>
  );
}
