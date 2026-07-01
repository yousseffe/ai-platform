"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Play } from "lucide-react";
import { PipelineRun, PipelineRunStatus } from "@/types";
import { runPipelineSchema, type RunPipelineInput } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PipelineRunDetailDialog } from "./PipelineRunDetailDialog";

interface PipelineRunPanelProps {
  runs: PipelineRun[];
  canRun: boolean;
  isTriggering: boolean;
  runError: string;
  onTriggerRun: (inputJson: string) => Promise<boolean>;
}

/**
 * Maps a run's status to a status-dot color, matching the steps/edges panels'
 * status indicator convention.
 *
 * @param status - The run's current status.
 * @returns A Tailwind background-color class for the status dot.
 */
function getRunStatusDotClass(status: PipelineRunStatus): string {
  if (status === PipelineRunStatus.SUCCESS) return "bg-emerald-500";
  if (status === PipelineRunStatus.FAILED) return "bg-red-500";
  if (status === PipelineRunStatus.PARTIAL) return "bg-amber-500";
  return "bg-blue-500 animate-pulse";
}

/**
 * Renders the "Run Pipeline" trigger dialog and the run history table,
 * including a link into each run's full step trace.
 *
 * @param props - PipelineRunPanel component properties.
 * @returns The React component rendering the run panel.
 */
export function PipelineRunPanel({ runs, canRun, isTriggering, runError, onTriggerRun }: PipelineRunPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RunPipelineInput>({
    resolver: zodResolver(runPipelineSchema),
    mode: "onTouched",
    defaultValues: { inputJson: "{}" },
  });

  const onSubmit = async (data: RunPipelineInput) => {
    const ok = await onTriggerRun(data.inputJson);
    if (ok) {
      setDialogOpen(false);
      reset();
    }
  };

  return (
    <div className="border border-border bg-card rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-border bg-background flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground font-mono">Runs</h2>
          {!canRun && (
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              Validate the pipeline before running it.
            </p>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={(next) => { setDialogOpen(next); if (!next) reset(); }}>
          <DialogTrigger className="btn-primary text-xs" disabled={!canRun}>
            <Play className="w-3.5 h-3.5" /> Run Pipeline
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] bg-card border border-border text-foreground font-sans p-5 rounded-xl shadow-xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-sm font-bold text-foreground">Run Pipeline</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Submit a JSON payload to feed into the first step.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="run-input" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Input (JSON)
                </Label>
                <Textarea id="run-input" rows={8} className="font-mono text-xs" {...register("inputJson")} />
                {errors.inputJson && <p className="text-[10px] text-destructive font-semibold">{errors.inputJson.message}</p>}
              </div>
              {runError && <p className="text-[10px] text-destructive font-semibold">{runError}</p>}
              <DialogFooter className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1" disabled={isTriggering}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isTriggering}>
                  {isTriggering ? "Starting..." : "Run"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        {runs.length === 0 ? (
          <p className="text-xs text-muted-foreground font-mono text-center py-6">No runs yet.</p>
        ) : (
          <table className="w-full text-left border-collapse font-mono text-xs text-foreground">
            <thead>
              <tr className="bg-background text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border select-none">
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Cost</th>
                <th className="px-6 py-3">Latency</th>
                <th className="px-6 py-3">Started</th>
                <th className="px-6 py-3 text-right">Trace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-accent/40 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getRunStatusDotClass(run.status)}`} />
                      <span className="font-semibold capitalize">{run.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{run.totalCost} credits</td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {run.totalLatencyMs != null ? `${run.totalLatencyMs}ms` : "-"}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{new Date(run.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedRunId(run.id)}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PipelineRunDetailDialog runId={selectedRunId} onOpenChange={(open) => !open && setSelectedRunId(null)} />
    </div>
  );
}
