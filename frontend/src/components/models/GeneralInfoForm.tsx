import React from "react";
import { AlertCircle } from "lucide-react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { UploadModelFormInput } from "@/lib/schemas";

interface GeneralInfoFormProps {
  register: UseFormRegister<UploadModelFormInput>;
  errors: FieldErrors<UploadModelFormInput>;
  isUploading: boolean;
}

/**
 * Renders the General Information card section for model creation.
 * Contains inputs for model name, tags, and description.
 *
 * @param props - GeneralInfoForm component properties.
 * @returns The React component layout for general model details.
 */
export function GeneralInfoForm({ register, errors, isUploading }: GeneralInfoFormProps) {
  return (
    <div className="card border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">1</div>
        <h2 className="text-lg font-bold text-slate-800">General Information</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="form-label text-xs">Model Name</label>
          <input
            type="text"
            className={`form-input ${errors.name ? "border-red-500 focus:ring-red-100" : ""}`}
            placeholder="e.g. demand-forecast-v1"
            {...register("name")}
            disabled={isUploading}
          />
          {errors.name && (
            <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.name.message}
            </p>
          )}
        </div>
        <div>
          <label className="form-label text-xs">Model Tags</label>
          <input type="text" className="form-input" placeholder="e.g. regression, pytorch, finance" disabled={isUploading} />
        </div>
      </div>
      <div>
        <label className="form-label text-xs">Description</label>
        <textarea
          className={`form-input h-24 resize-none ${errors.description ? "border-red-500 focus:ring-red-100" : ""}`}
          placeholder="Describe the model's purpose, training data, and intended use cases..."
          {...register("description")}
          disabled={isUploading}
        ></textarea>
        {errors.description && (
          <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {errors.description.message}
          </p>
        )}
      </div>
    </div>
  );
}
