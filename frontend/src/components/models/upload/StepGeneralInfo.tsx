"use client";

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
    <div className="space-y-4 animate-in fade-in duration-300 font-sans text-left">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            Model Name <span className="text-red-500 font-bold" title="Required">*</span>
          </Label>
          <Input
            id="name"
            type="text"
            {...register("name")}
            className={`h-9.5 px-3 border-border focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200 rounded-lg bg-background/50 text-xs ${
              errors.name ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/10" : ""
            }`}
            placeholder="e.g. demand-forecast-v1"
            disabled={isUploading}
          />
          {errors.name ? (
            <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.name.message}
            </p>
          ) : (
            <p className="text-[9px] text-muted-foreground mt-0.5">Must be lowercase alphanumeric characters and hyphens only.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tags" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Model Tags <span className="text-muted-foreground/60 font-normal lowercase">(optional)</span>
          </Label>
          <Input
            id="tags"
            type="text"
            className="h-9.5 px-3 border-border focus-visible:ring-primary/20 focus-visible:border-primary rounded-lg bg-background/50 text-xs"
            placeholder="e.g. regression, pytorch, finance"
            disabled={isUploading}
          />
        </div>
      </div>


      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Description <span className="text-muted-foreground/60 font-normal lowercase">(optional)</span>
        </Label>
        <textarea
          id="description"
          {...register("description")}
          className={`form-input h-20 w-full resize-none rounded-lg border border-border bg-background/50 p-3 focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary text-xs transition-all duration-200 ${
            errors.description ? "border-red-500 focus:ring-red-500/10" : ""
          }`}
          placeholder="Describe the model's purpose, training data, and intended use cases..."
          disabled={isUploading}
        />
        {errors.description && (
          <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="mt-4 border-t border-border/50 pt-4">
        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
          Model Visibility
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="relative flex items-start gap-3 p-3.5 rounded-xl border border-border bg-background/30 hover:bg-secondary/20 hover:border-primary/50 cursor-pointer transition-all duration-200 shadow-2xs">
            <input
              type="radio"
              value="false"
              className="mt-1 shrink-0 accent-primary"
              {...register("isPublic")}
              defaultChecked
              disabled={isUploading}
            />
            <div className="flex gap-2.5">
              <div className="p-2 bg-secondary rounded-lg text-muted-foreground shrink-0">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-foreground block">Private Mode</span>
                <span className="text-[9.5px] text-muted-foreground mt-0.5 block leading-normal font-medium">
                  Only you can view and deploy this model. Restricted access.
                </span>
              </div>
            </div>
          </label>

          <label className="relative flex items-start gap-3 p-3.5 rounded-xl border border-border bg-background/30 hover:bg-secondary/20 hover:border-primary/50 cursor-pointer transition-all duration-200 shadow-2xs">
            <input
              type="radio"
              value="true"
              className="mt-1 shrink-0 accent-primary"
              {...register("isPublic")}
              disabled={isUploading}
            />
            <div className="flex gap-2.5">
              <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-foreground block">View in Marketplace</span>
                <span className="text-[9.5px] text-muted-foreground mt-0.5 block leading-normal font-medium">
                  Make the model public to show in the Marketplace. Anyone can inspect it.
                </span>
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
