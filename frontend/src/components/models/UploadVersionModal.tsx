import React from "react";
import { X, UploadCloud, CheckCircle2, FileCode } from "lucide-react";

interface UploadVersionModalProps {
  onClose: () => void;
  isUploading: boolean;
  modelFile: File | null;
  setModelFile: (file: File | null) => void;
  scalerFile: File | null;
  setScalerFile: (file: File | null) => void;
  preprocessFile: File | null;
  setPreprocessFile: (file: File | null) => void;
  postprocessFile: File | null;
  setPostprocessFile: (file: File | null) => void;
  examplePayload: string;
  setExamplePayload: (payload: string) => void;
  expectedResult: string;
  setExpectedResult: (result: string) => void;
  onUpload: () => void;
}

/**
 * Modal dialog component for uploading a new model version.
 * Displays file drag-and-drop slots and script text areas.
 *
 * @param props - UploadVersionModalProps component properties.
 * @returns The React component rendering the version upload dialog overlay.
 */
export function UploadVersionModal({
  onClose,
  isUploading,
  modelFile,
  setModelFile,
  scalerFile,
  setScalerFile,
  preprocessFile,
  setPreprocessFile,
  postprocessFile,
  setPostprocessFile,
  examplePayload,
  setExamplePayload,
  expectedResult,
  setExpectedResult,
  onUpload,
}: UploadVersionModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-800">Upload New Version</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-slate-500 mb-4 bg-primary-50 p-3 rounded text-primary-700 font-medium">
            You only need to upload the files that have changed. Any files left empty will be automatically carried over from the
            previous version, saving storage and time!
          </p>

          <div
            className={`border border-dashed rounded-lg p-3 flex items-center gap-4 transition-colors relative ${
              modelFile ? "border-emerald-400 bg-emerald-50/50" : "border-slate-300 hover:bg-slate-50"
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
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                modelFile ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
              }`}
            >
              {modelFile ? <CheckCircle2 className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold ${modelFile ? "text-emerald-700" : "text-slate-700"}`}>
                {modelFile ? `Attached: ${modelFile.name}` : "Model Bundle (e.g. model.pkl)"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Leave empty to use previous version&apos;s file</p>
            </div>
          </div>

          <div
            className={`border border-dashed rounded-lg p-3 flex items-center gap-4 transition-colors relative ${
              scalerFile ? "border-emerald-400 bg-emerald-50/50" : "border-slate-300 hover:bg-slate-50"
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
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                scalerFile ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500"
              }`}
            >
              {scalerFile ? <CheckCircle2 className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold ${scalerFile ? "text-emerald-700" : "text-slate-700"}`}>
                {scalerFile ? `Attached: ${scalerFile.name}` : "Scaler Bundle (e.g. scaler.pkl)"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Leave empty to use previous version&apos;s file</p>
            </div>
          </div>

          <div
            className={`border border-dashed rounded-lg p-3 flex items-center gap-4 transition-colors relative ${
              preprocessFile ? "border-indigo-400 bg-indigo-50/50" : "border-slate-300 hover:bg-slate-50"
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
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                preprocessFile ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
              }`}
            >
              {preprocessFile ? <CheckCircle2 className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold ${preprocessFile ? "text-indigo-700" : "text-slate-700"}`}>
                {preprocessFile ? `Attached: ${preprocessFile.name}` : "Pre-processing Script (preprocess.py)"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Leave empty to use previous version&apos;s file</p>
            </div>
          </div>

          <div
            className={`border border-dashed rounded-lg p-3 flex items-center gap-4 transition-colors relative ${
              postprocessFile ? "border-indigo-400 bg-indigo-50/50" : "border-slate-300 hover:bg-slate-50"
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
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                postprocessFile ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
              }`}
            >
              {postprocessFile ? <CheckCircle2 className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-bold ${postprocessFile ? "text-indigo-700" : "text-slate-700"}`}>
                {postprocessFile ? `Attached: ${postprocessFile.name}` : "Post-processing Script (postprocess.py)"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Leave empty to use previous version&apos;s file</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-2">
            <p className="text-sm font-bold text-slate-800 mb-4">Interface Configuration</p>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="form-label text-xs">Example Payload Input (Optional if unchanged)</label>
                <textarea
                  className="form-input text-xs font-mono h-24"
                  value={examplePayload}
                  onChange={(e) => setExamplePayload(e.target.value)}
                  placeholder="Leave empty to use previous version's payload..."
                  disabled={isUploading}
                />
              </div>
              <div>
                <label className="form-label text-xs">Expected Prediction Result (Optional if unchanged)</label>
                <textarea
                  className="form-input text-xs font-mono h-24"
                  value={expectedResult}
                  onChange={(e) => setExpectedResult(e.target.value)}
                  placeholder="Leave empty to use previous version's expected result..."
                  disabled={isUploading}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={onUpload}
            disabled={isUploading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2 transition-all cursor-pointer"
          >
            {isUploading ? "Uploading..." : <><UploadCloud className="w-4 h-4" /> Upload</>}
          </button>
        </div>
      </div>
    </div>
  );
}
