"use client";

import { Split } from "lucide-react";
import { PipelineStep } from "@/types";
import { PipelineStepCard } from "./PipelineStepCard";

interface PipelineStageGroupProps {
  stage: PipelineStep[];
  isSubmitting: boolean;
  onRemoveStep: (stepId: string) => Promise<void>;
}

/**
 * Renders one stage of the pipeline builder: a single step as a plain card,
 * or multiple parallel steps laid out side by side inside a bordered
 * "Parallel" group so fan-out branches are visually obvious.
 *
 * @param props - PipelineStageGroup component properties.
 * @returns The React component rendering one stage's steps.
 */
export function PipelineStageGroup({ stage, isSubmitting, onRemoveStep }: PipelineStageGroupProps) {
  if (stage.length === 1) {
    return <PipelineStepCard step={stage[0]} isSubmitting={isSubmitting} onRemoveStep={onRemoveStep} />;
  }

  return (
    <div className="border border-dashed border-primary/50 rounded-lg p-3 bg-primary/5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary mb-2">
        <Split className="w-3 h-3" /> Parallel — Stage {stage[0].order}
      </div>
      <div className="flex flex-col md:flex-row gap-2">
        {stage.map((step) => (
          <div key={step.id} className="flex-1 min-w-0">
            <PipelineStepCard step={step} isSubmitting={isSubmitting} onRemoveStep={onRemoveStep} />
          </div>
        ))}
      </div>
    </div>
  );
}
