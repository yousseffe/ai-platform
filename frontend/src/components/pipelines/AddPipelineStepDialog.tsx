"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
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

interface AddPipelineStepDialogProps {
  stages: PipelineStep[][];
  readyVersionOptions: ReadyVersionOption[];
  isSubmitting: boolean;
  onAddStep: (input: CreateStepInput, order: number) => Promise<boolean>;
  trigger?: React.ReactElement;
  defaultStageChoice?: string;
}

/** Sentinel stage-selector value meaning "append a brand-new stage after the last one." */
const NEW_STAGE = "__new_stage__";

/**
 * Builds the "Stage" dropdown options: one entry per existing stage (to add
 * a parallel branch into it) plus a "new stage" entry.
 *
 * @param stages - The pipeline's steps already grouped into stages.
 * @returns Select options pairing a stable string value with a display label.
 */
function buildStageOptions(stages: PipelineStep[][]): { value: string; label: string }[] {
  const existing = stages.map((stage) => ({
    value: String(stage[0].order),
    label: `Parallel branch of Stage ${stage[0].order} (${stage.length} step${stage.length === 1 ? "" : "s"})`,
  }));
  const nextOrder = stages.length === 0 ? 0 : stages[stages.length - 1][0].order + 1;
  return [{ value: NEW_STAGE, label: `New Stage ${nextOrder}` }, ...existing];
}

/**
 * "Add Step" dialog: binds a new step to one of the caller's existing READY
 * model versions, letting the user choose whether it starts a brand-new
 * stage or joins an existing one as a parallel branch (in which case a
 * `role` name is required to disambiguate it from its siblings).
 *
 * @param props - AddPipelineStepDialog component properties.
 * @returns The React component rendering the "Add Step" trigger + dialog.
 */
export function AddPipelineStepDialog({
  stages,
  readyVersionOptions,
  isSubmitting,
  onAddStep,
  trigger,
  defaultStageChoice = NEW_STAGE,
}: AddPipelineStepDialogProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stageChoice, setStageChoice] = useState<string>(defaultStageChoice);

  useEffect(() => {
    if (dialogOpen) {
      setStageChoice(defaultStageChoice);
    }
  }, [dialogOpen, defaultStageChoice]);

  const stageOptions = buildStageOptions(stages);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateStepInput>({
    resolver: zodResolver(createStepSchema),
    mode: "onTouched",
    defaultValues: { modelVersionId: "", pinPolicy: PipelinePinPolicy.PINNED, maxRetries: 0 },
  });

  const selectedModelVersionId = watch("modelVersionId");
  const targetStage = stages.find((stage) => String(stage[0].order) === stageChoice);
  const roleRequired = Boolean(targetStage);

  const resetDialog = () => {
    reset();
    setStageChoice(NEW_STAGE);
  };

  const onSubmit = async (data: CreateStepInput) => {
    // Joining an existing stage as a parallel branch requires a role so the
    // pipeline can later validate — see PipelinesService.assertStageRolesAreUnambiguous,
    // which permanently rejects (and blocks running) a stage where any
    // parallel step's role is missing or duplicated.
    if (roleRequired && !data.role?.trim()) {
      setError("role", {
        type: "required",
        message: "Role is required — this stage already has another step.",
      });
      return;
    }
    if (roleRequired && targetStage!.some((s) => s.role === data.role?.trim())) {
      setError("role", {
        type: "duplicate",
        message: "Another step in this stage already uses that role.",
      });
      return;
    }

    const order = targetStage
      ? targetStage[0].order
      : stages.length === 0
        ? 0
        : stages[stages.length - 1][0].order + 1;
    const ok = await onAddStep(data, order);
    if (ok) {
      setDialogOpen(false);
      resetDialog();
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(next) => { setDialogOpen(next); if (!next) resetDialog(); }}>
      <DialogTrigger render={trigger ? trigger : undefined}>
        {!trigger && (
          <Button variant="outline" size="sm" className="h-7 text-xs font-bold gap-1.5 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add Step
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Pipeline Step</DialogTitle>
          <DialogDescription>
            Bind a new stage or parallel branch to one of your active READY model versions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-1.5 text-left">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stage</Label>
              <Select value={stageChoice} onValueChange={(value) => setStageChoice(value ?? NEW_STAGE)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a stage" />
                </SelectTrigger>
                <SelectContent>
                  {stageOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 text-left">
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

            <div className="space-y-1.5 text-left">
              <Label htmlFor="step-label" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Label (optional)</Label>
              <Input id="step-label" placeholder="caption-step" {...register("label")} />
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="step-role" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Role {roleRequired ? "(required — this stage has other steps)" : "(optional)"}
              </Label>
              <Input id="step-role" placeholder="summarizer" {...register("role")} />
              {errors.role ? (
                <p className="text-[10px] text-destructive font-semibold">{errors.role.message}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Names this branch for mappers, e.g.{" "}
                  <code className="bg-secondary/50 px-1 rounded font-mono text-[9.5px]">steps.{targetStage?.[0].order ?? "N"}.summarizer</code>.
                </p>
              )}
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="step-retries" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Max Retries</Label>
              <Input id="step-retries" type="number" min={0} max={5} {...register("maxRetries", { valueAsNumber: true })} />
            </div>
          </div>

          <DialogFooter className="flex sm:flex-row gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 h-9 font-bold text-xs" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 h-9 font-bold text-xs" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Step"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
