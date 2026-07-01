"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { createPipeline } from "@/lib/actions/pipelines.actions";
import { createPipelineSchema, type CreatePipelineInput } from "@/lib/schemas";
import { PipelineType } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * The three pipeline-type presets offered when creating a pipeline. Purely
 * descriptive — every pipeline runs through the same stage-grouped mapper
 * engine regardless of type; this only sets a starting point/expectation.
 */
const PIPELINE_TYPE_OPTIONS: { value: PipelineType; label: string; description: string }[] = [
  {
    value: PipelineType.SEQUENTIAL_CHAIN,
    label: "Sequential (Chain)",
    description: "One step at a time — each step's output maps into the next.",
  },
  {
    value: PipelineType.CONTEXT_AUGMENTED,
    label: "Context-Augmented",
    description: "Later steps pull fields from several earlier steps, not just the one before them.",
  },
  {
    value: PipelineType.PARALLEL,
    label: "Parallel",
    description: "Multiple steps run at once, then a join step combines their outputs.",
  },
];

/**
 * Dialog form for creating a new, empty pipeline. On success, navigates the
 * user straight into the pipeline builder to start adding steps.
 *
 * @returns The React component rendering the "New Pipeline" trigger + dialog.
 */
export function CreatePipelineDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreatePipelineInput>({
    resolver: zodResolver(createPipelineSchema),
    mode: "onTouched",
    defaultValues: { name: "", description: "", type: PipelineType.SEQUENTIAL_CHAIN },
  });

  const selectedType = watch("type");

  /**
   * Submits the create-pipeline form and redirects into the builder on success.
   *
   * @param data - The validated pipeline name/description/type.
   */
  const onSubmit = async (data: CreatePipelineInput) => {
    setSubmitError("");
    const res = await createPipeline(data.name, data.description, data.type);
    if (!res.success) {
      setSubmitError(res.error);
      return;
    }
    setOpen(false);
    reset();
    router.push(`/pipelines/${res.data.id}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset({ name: "", description: "", type: PipelineType.SEQUENTIAL_CHAIN });
          setSubmitError("");
        }
      }}
    >
      <DialogTrigger className="btn-primary">
        <Plus className="w-4 h-4" /> New Pipeline
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px] bg-card border border-border text-foreground font-sans p-5 rounded-xl shadow-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-sm font-bold text-foreground">Create Pipeline</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Start with a name — you&apos;ll add steps and mappers next.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="pipeline-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Name
            </Label>
            <Input id="pipeline-name" placeholder="caption-then-classify" {...register("name")} />
            {errors.name && <p className="text-[10px] text-destructive font-semibold">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pipeline-description" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Description (optional)
            </Label>
            <Textarea
              id="pipeline-description"
              placeholder="What does this chain do?"
              rows={3}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-[10px] text-destructive font-semibold">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Pipeline Type
            </Label>
            <div className="space-y-1.5">
              {PIPELINE_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setValue("type", option.value, { shouldValidate: true })}
                  className={`w-full text-left rounded-lg border px-3 py-2 transition-colors cursor-pointer ${
                    selectedType === option.value
                      ? "border-primary bg-primary/10"
                      : "border-input bg-background hover:bg-secondary/50"
                  }`}
                >
                  <div className="text-xs font-bold text-foreground font-mono">{option.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          {submitError && <p className="text-[10px] text-destructive font-semibold">{submitError}</p>}

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Pipeline"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
