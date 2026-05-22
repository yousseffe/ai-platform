import React from "react";
import { AlertCircle } from "lucide-react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { UploadModelFormInput } from "@/lib/schemas";

interface InterfaceConfigFormProps {
  register: UseFormRegister<UploadModelFormInput>;
  errors: FieldErrors<UploadModelFormInput>;
  isUploading: boolean;
}

/**
 * Renders the Interface Configuration cards section for input example payloads
 * and expected schema response outputs.
 *
 * @param props - InterfaceConfigForm component properties.
 * @returns The React component layout for model interfaces.
 */
export function InterfaceConfigForm({ register, errors, isUploading }: InterfaceConfigFormProps) {
  return (
    <div className="card border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">3</div>
        <h2 className="text-lg font-bold text-slate-800">Interface Configuration</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label text-xs mb-3">EXAMPLE PAYLOAD INPUT</label>
          <textarea
            className={`w-full bg-slate-900 rounded-xl p-4 text-indigo-200 font-mono text-xs resize-y h-48 focus:outline-none focus:ring-2 ${
              errors.examplePayload ? "focus:ring-red-500 border border-red-500 text-red-300" : "focus:ring-primary-500"
            }`}
            {...register("examplePayload")}
            spellCheck="false"
            disabled={isUploading}
          />
          {errors.examplePayload ? (
            <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.examplePayload.message}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 mt-2">Provide a sample request structure to help users understand the API interface.</p>
          )}
        </div>

        <div>
          <label className="form-label text-xs mb-3">EXPECTED PREDICTION RESULT</label>
          <textarea
            className={`w-full bg-slate-900 rounded-xl p-4 text-indigo-200 font-mono text-xs resize-y h-48 focus:outline-none focus:ring-2 ${
              errors.expectedResult ? "focus:ring-red-500 border border-red-500 text-red-300" : "focus:ring-primary-500"
            }`}
            {...register("expectedResult")}
            spellCheck="false"
            disabled={isUploading}
          />
          {errors.expectedResult ? (
            <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.expectedResult.message}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 mt-2">Define the schema for successful model inference responses.</p>
          )}
        </div>
      </div>
    </div>
  );
}
