"use client";

import React from "react";
import { Building } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepProfileInfoProps {
  name: string;
  slug: string;
  onNameChange: (val: string) => void;
  onSlugChange: (val: string) => void;
}

/**
 * Step 1 of Organization Creation: Profiles details (Workspace Name and URL Slug).
 * Migrated to Shadcn UI components.
 *
 * @param props - Component props containing form state and change handlers.
 * @returns The React component rendering the profile setup inputs.
 */
export default function StepProfileInfo({
  name,
  slug,
  onNameChange,
  onSlugChange,
}: StepProfileInfoProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="space-y-2">
        <Label htmlFor="org-name" className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          Workspace Name
        </Label>
        <div className="relative">
          <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id="org-name"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="pl-10 h-10 border-slate-200 focus-visible:ring-primary-500/20 focus-visible:border-primary-500"
            placeholder="Acme Analytics"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="org-slug" className="text-xs font-semibold uppercase tracking-wide text-slate-700">
          URL Slug
        </Label>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500">
          <span className="px-3 py-2 border-r border-slate-200 bg-slate-100 select-none text-xs flex items-center">
            mlhub.com/
          </span>
          <input
            id="org-slug"
            type="text"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-800 text-sm font-mono"
            placeholder="acme-analytics"
          />
        </div>
      </div>
    </div>
  );
}
