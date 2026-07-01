"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { createPipeline } from "@/lib/actions/pipelines.actions";
import { createPipelineSchema, type CreatePipelineInput } from "@/lib/schemas";
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
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreatePipelineInput>({
    resolver: zodResolver(createPipelineSchema),
    mode: "onTouched",
    defaultValues: { name: "", description: "" },
  });

  /**
   * Submits the create-pipeline form and redirects into the builder on success.
   *
   * @param data - The validated pipeline name/description.
   */
  const onSubmit = async (data: CreatePipelineInput) => {
    setSubmitError("");
    const res = await createPipeline(data.name, data.description);
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
          reset();
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
