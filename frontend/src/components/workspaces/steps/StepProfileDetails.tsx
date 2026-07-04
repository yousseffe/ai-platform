"use client";

import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Building, Globe, AlignLeft, Image } from "lucide-react";
import { WorkspaceCreateInput } from "@/lib/schemas/workspaces";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/**
 * Props type structure mapping for StepProfileDetails component.
 */
interface StepProfileDetailsProps {
  /**
   * The hook form register function.
   */
  register: UseFormRegister<WorkspaceCreateInput>;
  /**
   * FieldErrors object containing current validation errors.
   */
  errors: FieldErrors<WorkspaceCreateInput>;
  /**
   * The current slug string value.
   */
  slugValue: string;
  /**
   * The current description string value.
   */
  descriptionValue?: string;
  /**
   * Callback triggered on workspace name input change.
   */
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * Callback triggered on workspace slug input change.
   */
  onSlugChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Step 2 Wizard Component: Profile details configurations.
 * Renders name, slug, description, and avatarUrl inputs with real-time length counters.
 *
 * @param props - Component parameters.
 * @returns The React element.
 */
export default function StepProfileDetails({
  register,
  errors,
  slugValue,
  descriptionValue = "",
  onNameChange,
  onSlugChange,
}: StepProfileDetailsProps) {
  const descCharCount = descriptionValue?.length || 0;
  const descMaxChars = 200;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="text-left font-mono">
        <h3 className="text-sm font-bold text-foreground mb-1">Configure Profile Details</h3>
        <p className="text-[10px] text-muted-foreground">Specify the name, unique URL identifier, and other descriptive details of the workspace.</p>
      </div>

      <div className="space-y-3.5 font-mono text-xs text-left">
        {/* Workspace Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            Workspace Name <span className="text-red-500 font-bold" title="Required">*</span>
          </Label>
          <div className="relative group">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              id="name"
              type="text"
              {...register("name")}
              onChange={onNameChange}
              className={`pl-10 h-10 border-slate-200 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200 ${
                errors.name ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/10" : ""
              }`}
              placeholder="Acme Analytics"
            />
          </div>
          {errors.name && (
            <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
              <span>⚠️</span> {errors.name.message}
            </p>
          )}
        </div>

        {/* URL Slug */}
        <div className="space-y-1.5">
          <Label htmlFor="slug" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            URL Slug <span className="text-red-500 font-bold" title="Required">*</span>
          </Label>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200">
            <span className="px-3 py-2 border-r border-slate-200 bg-slate-100/80 select-none text-xs flex items-center font-semibold text-slate-500">
              qantara.com/
            </span>
            <input
              id="slug"
              type="text"
              {...register("slug")}
              onChange={onSlugChange}
              className={`flex-1 px-3 py-2 bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-800 text-xs font-mono dark:text-slate-100 ${
                errors.slug ? "text-red-500" : ""
              }`}
              placeholder="acme-analytics"
            />
          </div>
          <p className="text-[9px] text-muted-foreground leading-snug">
            Slugs must consist of lowercase letters, numbers, and hyphens. Generated automatically from name.
          </p>
          {errors.slug && (
            <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
              <span>⚠️</span> {errors.slug.message}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Description <span className="text-muted-foreground/60 font-normal lowercase">(optional)</span>
            </Label>
            <span className={`text-[9px] font-bold ${descCharCount > descMaxChars ? "text-red-500" : "text-slate-400"}`}>
              {descCharCount}/{descMaxChars}
            </span>
          </div>
          <div className="relative group">
            <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <textarea
              id="description"
              rows={3}
              {...register("description")}
              className={`flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-10 pt-2.5 border-slate-200 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200 text-xs font-sans ${
                errors.description ? "border-red-500 focus-visible:border-red-500" : ""
              }`}
              placeholder="A brief workspace bio for collaborators..."
            />
          </div>
          {errors.description && (
            <p className="text-[10px] text-red-500 font-semibold mt-1">
              ⚠️ {errors.description.message}
            </p>
          )}
        </div>

        {/* Avatar URL */}
        <div className="space-y-1.5">
          <Label htmlFor="avatarUrl" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Logo/Avatar URL <span className="text-muted-foreground/60 font-normal lowercase">(optional)</span>
          </Label>
          <div className="relative group">
            <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input
              id="avatarUrl"
              type="text"
              {...register("avatarUrl")}
              className={`pl-10 h-10 border-slate-200 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200 ${
                errors.avatarUrl ? "border-red-500" : ""
              }`}
              placeholder="https://company.com/logo.png"
            />
          </div>
          {errors.avatarUrl && (
            <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
              <span>⚠️</span> {errors.avatarUrl.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
