"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Check, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Model } from "@/types";
import { updateVisibilitySettings } from "@/lib/actions/models.actions";

interface VisibilityToggleCardProps {
  model: Model;
  modelId: string;
}

/**
 * Owner-facing settings card for a model's marketplace visibility.
 * Redesigned using a premium dual-card selection interface.
 */
export function VisibilityToggleCard({ model, modelId }: VisibilityToggleCardProps) {
  const [isPublic, setIsPublic] = useState(model.isPublic ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateVisibilitySettings(modelId, isPublic);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-border bg-card rounded-2xl p-6 space-y-6 shadow-sm">
      <div className="flex items-center gap-3 text-primary font-bold text-sm select-none">
        <Globe className="w-5 h-5" />
        <div>
          <h3 className="font-sans font-bold text-sm text-foreground">
            Marketplace Visibility
          </h3>
          <p className="text-muted-foreground text-[11px] font-sans font-normal mt-0.5">
            Choose whether this model is private to your registry or discoverable by the public marketplace.
          </p>
        </div>
      </div>

      <div className="w-full h-px bg-border/60" />

      {/* Modern Two-Card Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Private Option */}
        <div
          onClick={() => setIsPublic(false)}
          className={`relative flex flex-col p-4 rounded-xl border-2 text-left cursor-pointer transition-all select-none ${
            !isPublic
              ? "border-amber-500 bg-amber-500/5 shadow-xs"
              : "border-border hover:border-border-hover bg-background/50 hover:bg-background"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${!isPublic ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
                <Lock className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-foreground">Private Registry</span>
            </div>
            {!isPublic && (
              <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Restricted entirely to your personal registry or organization. Only authorized consumers can invoke this endpoint.
          </p>
        </div>

        {/* Public Option */}
        <div
          onClick={() => setIsPublic(true)}
          className={`relative flex flex-col p-4 rounded-xl border-2 text-left cursor-pointer transition-all select-none ${
            isPublic
              ? "border-emerald-500 bg-emerald-500/5 shadow-xs"
              : "border-border hover:border-border-hover bg-background/50 hover:bg-background"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${isPublic ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                <Eye className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-foreground">Public Marketplace</span>
            </div>
            {isPublic && (
              <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Discoverable, searchable, and callable by any developer on the platform. Ideal for commercial API distribution.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="font-bold text-xs cursor-pointer px-5"
        >
          {saving ? "Saving..." : "Save Visibility Settings"}
        </Button>
      </div>
    </div>
  );
}
