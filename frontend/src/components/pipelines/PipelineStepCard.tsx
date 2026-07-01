"use client";

import { Trash2, Box } from "lucide-react";
import { PipelineStep, PipelinePinPolicy } from "@/types";

interface PipelineStepCardProps {
  step: PipelineStep;
  isSubmitting: boolean;
  onRemoveStep: (stepId: string) => Promise<void>;
}

/**
 * One step's summary card, showing its label/role, bound model version, and
 * execution config, with a button to remove it.
 *
 * @param props - PipelineStepCard component properties.
 * @returns The React component rendering a single step's card.
 */
export function PipelineStepCard({ step, isSubmitting, onRemoveStep }: PipelineStepCardProps) {
  return (
    <div className="flex items-center justify-between gap-4 border border-border rounded-lg px-4 py-3 bg-background h-full">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 shrink-0 rounded border border-border bg-card flex items-center justify-center text-muted-foreground">
          <Box className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-foreground font-mono truncate">
            {step.label || (step.role ? step.role : `Step ${step.order}`)}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
            {step.modelVersion
              ? `${step.modelVersion.model?.name ?? "Model"} · v${step.modelVersion.versionNumber}`
              : "No model version bound"}
            {" · "}
            {step.pinPolicy === PipelinePinPolicy.PINNED ? "pinned" : "latest ready"}
            {step.maxRetries > 0 ? ` · ${step.maxRetries} retries` : ""}
            {step.role ? ` · role: ${step.role}` : ""}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemoveStep(step.id)}
        disabled={isSubmitting}
        className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
