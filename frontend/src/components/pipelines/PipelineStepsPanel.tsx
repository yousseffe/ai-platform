"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, ArrowDown, Box } from "lucide-react";
import { PipelineStep, PipelinePinPolicy } from "@/types";
import { createStepSchema, type CreateStepInput } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReadyVersionOption {
  modelVersionId: string;
  label: string;
}

interface PipelineStepsPanelProps {
  steps: PipelineStep[];
  readyVersionOptions: ReadyVersionOption[];
  isSubmitting: boolean;
  onAddStep: (input: CreateStepInput, nextOrder: number) => Promise<boolean>;
  onRemoveStep: (stepId: string) => Promise<void>;
}

/**
 * Renders the ordered chain of steps in the pipeline builder, plus a dialog
 * for binding a new step to one of the caller's existing READY model versions.
 *
 * @param props - PipelineStepsPanel component properties.
 * @returns The React component rendering the steps panel.
 */
export function PipelineStepsPanel({
  steps,
  readyVersionOptions,
  isSubmitting,
  onAddStep,
  onRemoveStep,
}: PipelineStepsPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateStepInput>({
    resolver: zodResolver(createStepSchema),
    mode: "onTouched",
    defaultValues: { modelVersionId: "", pinPolicy: PipelinePinPolicy.PINNED, maxRetries: 0 },
  });

  const selectedModelVersionId = watch("modelVersionId");

  const onSubmit = async (data: CreateStepInput) => {
    const ok = await onAddStep(data, steps.length);
    if (ok) {
      setDialogOpen(false);
      reset();
    }
  };

  return (
    <div className="border border-border bg-card rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-border bg-background flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground font-mono">Steps</h2>
        <Dialog open={dialogOpen} onOpenChange={(next) => { setDialogOpen(next); if (!next) reset(); }}>
          <DialogTrigger className="btn-outline text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Step
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px] bg-card border border-border text-foreground font-sans p-5 rounded-xl shadow-xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-sm font-bold text-foreground">Add Step</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Bind this step to one of your existing READY model versions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Model Version</Label>
                <Select value={selectedModelVersionId} onValueChange={(value) => setValue("modelVersionId", value ?? "", { shouldValidate: true })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a model version" />
                  </SelectTrigger>
                  <SelectContent>
                    {readyVersionOptions.length === 0 ? (
                      <SelectItem value="__none" disabled>No READY model versions available</SelectItem>
                    ) : (
                      readyVersionOptions.map((opt) => (
                        <SelectItem key={opt.modelVersionId} value={opt.modelVersionId}>{opt.label}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.modelVersionId && <p className="text-[10px] text-destructive font-semibold">{errors.modelVersionId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="step-label" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Label (optional)</Label>
                <Input id="step-label" placeholder="caption-step" {...register("label")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="step-retries" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Max Retries</Label>
                <Input id="step-retries" type="number" min={0} max={5} {...register("maxRetries", { valueAsNumber: true })} />
              </div>

              <DialogFooter className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1" disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Step"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-6">
        {steps.length === 0 ? (
          <p className="text-xs text-muted-foreground font-mono text-center py-6">
            No steps yet. Add your first step to start the chain.
          </p>
        ) : (
          <div className="flex flex-col items-stretch gap-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex items-center justify-between gap-4 border border-border rounded-lg px-4 py-3 bg-background">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded border border-border bg-card flex items-center justify-center text-muted-foreground">
                      <Box className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground font-mono">
                        {step.label || `Step ${step.order}`}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {step.modelVersion
                          ? `${step.modelVersion.model?.name ?? "Model"} · v${step.modelVersion.versionNumber}`
                          : "No model version bound"}
                        {" · "}
                        {step.pinPolicy === PipelinePinPolicy.PINNED ? "pinned" : "latest ready"}
                        {step.maxRetries > 0 ? ` · ${step.maxRetries} retries` : ""}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveStep(step.id)}
                    disabled={isSubmitting}
                    className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {index < steps.length - 1 && (
                  <ArrowDown className="w-3.5 h-3.5 text-muted-foreground mx-auto" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
