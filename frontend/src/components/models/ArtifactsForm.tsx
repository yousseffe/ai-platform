import React from "react";
import { UploadCloud, FileJson, ShieldCheck, Plus, AlertCircle } from "lucide-react";
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from "react-hook-form";
import { UploadModelFormInput } from "@/lib/schemas";

interface ArtifactsFormProps {
  register: UseFormRegister<UploadModelFormInput>;
  setValue: UseFormSetValue<UploadModelFormInput>;
  watch: UseFormWatch<UploadModelFormInput>;
  errors: FieldErrors<UploadModelFormInput>;
  isUploading: boolean;
}

/**
 * Renders the form section containing file uploads and text editor scripts
 * for model bundles, scalers, and python preprocessing/postprocessing scripts.
 * Managed entirely by React Hook Form.
 *
 * @param props - ArtifactsForm component properties.
 * @returns The React component layout for model artifact files.
 */
export function ArtifactsForm({
  register,
  setValue,
  watch,
  errors,
  isUploading,
}: ArtifactsFormProps) {
  // Watch values from React Hook Form state
  const modelFile = watch("modelFile") as File | null;
  const scalerFile = watch("scalerFile") as File | null;
  const preprocessFile = watch("preprocessFile") as File | null;
  const preprocessMode = watch("preprocessMode") || "file";
  const postprocessFile = watch("postprocessFile") as File | null;
  const postprocessMode = watch("postprocessMode") || "file";

  return (
    <div className="card border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">2</div>
        <h2 className="text-lg font-bold text-slate-800">Artifacts & Scripts</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Model Bundle */}
        <div>
          <div
            className={`border border-dashed rounded-xl p-8 flex flex-col items-center text-center hover:bg-slate-50 transition-colors cursor-pointer relative group ${
              modelFile ? "border-emerald-400 bg-emerald-50/50" : "border-slate-300"
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
            <div className="absolute top-3 left-4 flex gap-2">
              <span className="text-[10px] font-bold text-slate-800 tracking-wider">MODEL BUNDLE (model.pkl)</span>
              <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded">REQUIRED</span>
            </div>
            <span className="absolute top-3 right-4 text-[10px] text-slate-400">Max size: 5GB</span>

            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mt-4 group-hover:scale-110 transition-transform ${
                modelFile ? "bg-emerald-100 text-emerald-600" : "bg-indigo-50 text-indigo-500"
              }`}
            >
              {modelFile ? <ShieldCheck className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
            </div>
            <p className={`text-sm font-semibold ${modelFile ? "text-emerald-700" : "text-slate-700"}`}>
              {modelFile ? `Attached: ${modelFile.name}` : "Click to upload"}
            </p>
            <p className="text-xs text-slate-400 mt-1">Pickle, ONNX, or H5 format</p>
          </div>
          {errors.modelFile && (
            <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.modelFile.message as string}
            </p>
          )}
        </div>

        {/* Scaler Bundle */}
        <div
          className={`border border-dashed rounded-xl p-8 flex flex-col items-center text-center hover:bg-slate-50 transition-colors cursor-pointer relative group ${
            scalerFile ? "border-emerald-400 bg-emerald-50/50" : "border-slate-300"
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
          <div className="absolute top-3 left-4 flex gap-2">
            <span className="text-[10px] font-bold text-slate-800 tracking-wider">SCALER BUNDLE (scaler.pkl)</span>
            <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded">OPTIONAL</span>
          </div>
          <span className="absolute top-3 right-4 text-[10px] text-slate-400">Max size: 500MB</span>

          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mt-4 group-hover:scale-110 transition-transform ${
              scalerFile ? "bg-emerald-100 text-emerald-600" : "bg-slate-50 text-slate-400"
            }`}
          >
            {scalerFile ? <ShieldCheck className="w-6 h-6" /> : <span className="text-xl">⌛</span>}
          </div>
          <p className={`text-sm font-semibold ${scalerFile ? "text-emerald-700" : "text-slate-700"}`}>
            {scalerFile ? `Attached: ${scalerFile.name}` : "Upload scaler object"}
          </p>
          <p className="text-xs text-slate-400 mt-1">Essential for data normalization</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Preprocessing */}
        <div className="border border-slate-200 rounded-lg overflow-hidden relative flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-800 tracking-wider">PRE-PROCESSING (preprocess.py)</span>
            <div className="flex bg-white rounded-md border border-slate-200 p-0.5">
              <button
                type="button"
                className={`px-3 py-1 text-[10px] font-bold rounded cursor-pointer ${
                  preprocessMode === "file" ? "bg-primary-50 text-primary-700" : "text-slate-500"
                }`}
                onClick={() => setValue("preprocessMode", "file")}
                disabled={isUploading}
              >
                FILE
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-[10px] font-bold rounded cursor-pointer ${
                  preprocessMode === "code" ? "bg-primary-50 text-primary-700" : "text-slate-500"
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
              className={`p-6 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors relative ${
                preprocessFile ? "bg-emerald-50/30" : ""
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
                className={`w-10 h-10 rounded border flex items-center justify-center shrink-0 ${
                  preprocessFile ? "bg-emerald-100 border-emerald-200 text-emerald-600" : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                {preprocessFile ? <ShieldCheck className="w-5 h-5" /> : <span className="font-mono font-bold text-xs">&lt;/&gt;</span>}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold ${preprocessFile ? "text-emerald-700" : "text-slate-700"}`}>
                  {preprocessFile ? `Attached: ${preprocessFile.name}` : "Upload preprocess.py"}
                </p>
                <p className="text-xs text-slate-400">Define your feature engineering logic here.</p>
              </div>
              <div className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-slate-400">
                <Plus className="w-3 h-3" />
              </div>
            </div>
          ) : (
            <textarea
              className="w-full bg-slate-900 text-indigo-200 font-mono text-xs p-4 h-32 resize-none focus:outline-none border-0"
              placeholder="def preprocess(data):&#10;    # Your logic here&#10;    return data"
              {...register("preprocessCode")}
              disabled={isUploading}
            />
          )}
        </div>

        {/* Postprocessing */}
        <div className="border border-slate-200 rounded-lg overflow-hidden relative flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-800 tracking-wider">POST-PROCESSING (postprocess.py)</span>
            <div className="flex bg-white rounded-md border border-slate-200 p-0.5">
              <button
                type="button"
                className={`px-3 py-1 text-[10px] font-bold rounded cursor-pointer ${
                  postprocessMode === "file" ? "bg-primary-50 text-primary-700" : "text-slate-500"
                }`}
                onClick={() => setValue("postprocessMode", "file")}
                disabled={isUploading}
              >
                FILE
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-[10px] font-bold rounded cursor-pointer ${
                  postprocessMode === "code" ? "bg-primary-50 text-primary-700" : "text-slate-500"
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
              className={`p-6 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors relative ${
                postprocessFile ? "bg-emerald-50/30" : ""
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
                className={`w-10 h-10 rounded border flex items-center justify-center shrink-0 ${
                  postprocessFile ? "bg-emerald-100 border-emerald-200 text-emerald-600" : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                {postprocessFile ? <ShieldCheck className="w-5 h-5" /> : <FileJson className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold ${postprocessFile ? "text-emerald-700" : "text-slate-700"}`}>
                  {postprocessFile ? `Attached: ${postprocessFile.name}` : "Upload postprocess.py"}
                </p>
                <p className="text-xs text-slate-400">Handle inference results and formatting.</p>
              </div>
              <div className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center text-slate-400">
                <Plus className="w-3 h-3" />
              </div>
            </div>
          ) : (
            <textarea
              className="w-full bg-slate-900 text-indigo-200 font-mono text-xs p-4 h-32 resize-none focus:outline-none border-0"
              placeholder="def postprocess(prediction):&#10;    # Your logic here&#10;    return prediction"
              {...register("postprocessCode")}
              disabled={isUploading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
