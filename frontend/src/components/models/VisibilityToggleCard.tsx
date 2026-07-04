"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Model } from "@/types";
import { updateVisibilitySettings } from "@/lib/actions/models.actions";

interface VisibilityToggleCardProps {
  model: Model;
  modelId: string;
}

/**
 * Owner-facing settings card for a model's marketplace visibility. Lets the
 * provider list the model in the public marketplace or keep it private to
 * their personal registry / organization.
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
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-primary font-bold text-sm select-none">
          {isPublic ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          <div>
            <h3 className="font-sans font-bold text-sm text-foreground">
              Marketplace Visibility
            </h3>
            <p className="text-muted-foreground text-[11px] font-sans font-normal mt-0.5">
              Public models are discoverable and callable by any platform
              user in the marketplace. Private models stay restricted to
              your personal registry or organization.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsPublic((prev) => !prev)}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono border cursor-pointer transition-colors ${
            isPublic
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
          }`}
        >
          {isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {isPublic ? "PUBLIC MARKETPLACE" : "PRIVATE REGISTRY"}
        </button>
      </div>

      <div className="w-full h-px bg-border" />

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="font-bold text-xs cursor-pointer"
        >
          {saving ? "Saving..." : "Save Visibility"}
        </Button>
      </div>
    </div>
  );
}
