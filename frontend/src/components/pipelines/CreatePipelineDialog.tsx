"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, GitCommit, GitMerge, GitFork, Workflow, Sparkles } from "lucide-react";
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
import { Label } from "@/components/ui/label";

/**
 * Three pipeline options laid out in a 3-column configuration.
 */
const PIPELINE_TYPE_OPTIONS = [
  {
    value: PipelineType.SEQUENTIAL_CHAIN,
    label: "Sequential",
    description: "Linear stage chain",
    icon: <GitCommit className="w-4 h-4 text-indigo-500 shrink-0" />,
  },
  {
    value: PipelineType.CONTEXT_AUGMENTED,
    label: "Augmented",
    description: "Multi-stage context",
    icon: <GitMerge className="w-4 h-4 text-emerald-500 dark:text-emerald-450 shrink-0" />,
  },
  {
    value: PipelineType.PARALLEL,
    label: "Parallel",
    description: "Fork-join pathways",
    icon: <GitFork className="w-4 h-4 text-amber-500 shrink-0" />,
  },
];

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
      <DialogTrigger render={
        <Button className="h-9 px-4 text-xs font-bold gap-1.5 cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] transition-all rounded-xl btn-primary">
          <Plus className="w-4 h-4" /> New Pipeline
        </Button>
      } />
      <DialogContent className="sm:max-w-[480px]">

        <DialogHeader className="flex flex-row items-start gap-4 select-none relative z-10 pr-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
            <Workflow className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <DialogTitle>New Inference Pipeline</DialogTitle>
            <DialogDescription>
              Chain deployed models together by mapping upstream execution outputs to downstream inputs.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
            
            <div className="space-y-2">
              <Label htmlFor="pipeline-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 select-none">
                Pipeline Alias / Identifier
              </Label>
              <input
                id="pipeline-name"
                placeholder="e.g. caption-then-classify"
                className="w-full px-3.5 py-2.5 bg-background/50 border border-border rounded-lg text-xs text-foreground outline-none font-medium focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all form-input h-10 shadow-inner"
                required
                {...register("name")}
              />
              {errors.name && (
                <p className="text-[10px] text-red-500 font-bold mt-1 animate-fade-in">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pipeline-description" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 select-none">
                Description <span className="text-[9px] font-normal text-muted-foreground lowercase font-sans">(optional)</span>
              </Label>
              <textarea
                id="pipeline-description"
                placeholder="Briefly describe what this orchestration pipeline accomplishes..."
                rows={2}
                className="w-full px-3.5 py-2.5 bg-background/50 border border-border rounded-lg text-xs text-foreground outline-none font-sans font-medium focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all form-input resize-none leading-relaxed shadow-inner"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-[10px] text-red-500 font-bold mt-1 animate-fade-in">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 select-none">
                Orchestration Schema Type
              </Label>
              <div className="grid grid-cols-3 gap-3.5">
                {PIPELINE_TYPE_OPTIONS.map((option) => {
                  const isSelected = selectedType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setValue("type", option.value, { shouldValidate: true })}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer select-none hover:-translate-y-0.5 active:scale-[0.98] duration-150 relative overflow-hidden ${
                        isSelected
                          ? "border-primary bg-primary/[0.04] ring-1 ring-primary/80"
                          : "border-border bg-background/30 hover:bg-secondary/40 hover:border-border/80"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border mb-2 shrink-0 shadow-xs ${
                        isSelected ? "bg-primary/10 border-primary/20" : "bg-secondary/40 border-border/50"
                      }`}>
                        {option.icon}
                      </div>
                      <span className="text-[10px] font-bold text-foreground font-sans truncate w-full">
                        {option.label}
                      </span>
                      <span className="text-[8px] text-muted-foreground mt-0.5 leading-tight block w-full font-sans scale-90">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {submitError && (
              <p className="text-[10px] text-red-500 font-bold text-left animate-fade-in">{submitError}</p>
            )}

          <DialogFooter className="flex sm:flex-row gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 h-9 font-bold text-xs"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-9 font-bold text-xs"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Pipeline"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
