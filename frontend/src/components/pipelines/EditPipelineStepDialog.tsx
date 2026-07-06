"use client";

import { ReactElement, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { PipelinePinPolicy, PipelineStep } from "@/types";
import { createStepSchema, type CreateStepInput } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ReadyVersionOption {
  modelVersionId: string;
  label: string;
}

interface EditPipelineStepDialogProps {
  step: PipelineStep;
  stageSteps: PipelineStep[];
  readyVersionOptions: ReadyVersionOption[];
  isSubmitting: boolean;
  onUpdateStep: (
    stepId: string,
    input: {
      modelVersionId: string;
      label?: string;
      role?: string;
      pinPolicy?: PipelinePinPolicy;
      maxRetries?: number;
    },
  ) => Promise<boolean>;
  trigger?: ReactElement;
}

/**
 * Edits a step's bound model version and runtime metadata while preserving
 * its stage position inside the pipeline.
 *
 * @param props - EditPipelineStepDialog component properties.
 * @returns The React component rendering the edit-step trigger + dialog.
 */
export function EditPipelineStepDialog({
  step,
  stageSteps,
  readyVersionOptions,
  isSubmitting,
  onUpdateStep,
  trigger,
}: EditPipelineStepDialogProps) {
  const [open, setOpen] = useState(false);
  const roleRequired = stageSteps.length > 1;

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
    reset,
  } = useForm<CreateStepInput>({
    resolver: zodResolver(createStepSchema),
    mode: "onTouched",
    defaultValues: {
      modelVersionId: step.modelVersion?.id ?? "",
      label: step.label ?? "",
      role: step.role ?? "",
      pinPolicy: step.pinPolicy,
      maxRetries: step.maxRetries,
    },
  });

  const selectedModelVersionId = useWatch({ control, name: "modelVersionId" });
  const pinPolicy = useWatch({ control, name: "pinPolicy" }) ?? PipelinePinPolicy.PINNED;

  const resetDialog = () => {
    reset({
      modelVersionId: step.modelVersion?.id ?? "",
      label: step.label ?? "",
      role: step.role ?? "",
      pinPolicy: step.pinPolicy,
      maxRetries: step.maxRetries,
    });
  };

  const onSubmit = async (data: CreateStepInput) => {
    const nextRole = data.role?.trim();
    if (roleRequired && !nextRole) {
      setError("role", {
        type: "required",
        message: "Role is required because this stage has parallel models.",
      });
      return;
    }

    if (
      roleRequired &&
      stageSteps.some((stageStep) => stageStep.id !== step.id && stageStep.role?.trim() === nextRole)
    ) {
      setError("role", {
        type: "duplicate",
        message: "Another model in this stage already uses that role.",
      });
      return;
    }

    const ok = await onUpdateStep(step.id, {
      modelVersionId: data.modelVersionId,
      label: data.label?.trim() || undefined,
      role: nextRole || undefined,
      pinPolicy: data.pinPolicy,
      maxRetries: data.maxRetries,
    });

    if (ok) {
      setOpen(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetDialog();
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="outline" size="icon-sm" className="cursor-pointer">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Model Step</DialogTitle>
          <DialogDescription>
            Update the bound model version and runtime settings for this stage entry.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Model Version
              </Label>
              <Select
                value={selectedModelVersionId}
                onValueChange={(value) => setValue("modelVersionId", value ?? "", { shouldValidate: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model version" />
                </SelectTrigger>
                <SelectContent>
                  {readyVersionOptions.length === 0 ? (
                    <SelectItem value="__none" disabled>No READY model versions available</SelectItem>
                  ) : (
                    readyVersionOptions.map((opt) => (
                      <SelectItem key={opt.modelVersionId} value={opt.modelVersionId}>
                        {opt.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.modelVersionId && (
                <p className="text-[10px] font-semibold text-destructive">{errors.modelVersionId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`edit-step-label-${step.id}`} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Label
              </Label>
              <Input id={`edit-step-label-${step.id}`} placeholder="customer-router" {...register("label")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`edit-step-role-${step.id}`} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Role {roleRequired ? "(required)" : "(optional)"}
              </Label>
              <Input id={`edit-step-role-${step.id}`} placeholder="classifier" {...register("role")} />
              {errors.role && <p className="text-[10px] font-semibold text-destructive">{errors.role.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Pin Policy
              </Label>
              <Select
                value={pinPolicy}
                onValueChange={(value) =>
                  setValue("pinPolicy", (value as PipelinePinPolicy) ?? PipelinePinPolicy.PINNED, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a pin policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PipelinePinPolicy.PINNED}>Pinned version</SelectItem>
                  <SelectItem value={PipelinePinPolicy.LATEST_READY}>Latest ready</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`edit-step-retries-${step.id}`} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Max Retries
              </Label>
              <Input
                id={`edit-step-retries-${step.id}`}
                type="number"
                min={0}
                max={5}
                {...register("maxRetries", { valueAsNumber: true })}
              />
            </div>
          </div>

          <DialogFooter className="flex sm:flex-row gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
