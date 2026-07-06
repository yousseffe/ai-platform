"use client";

import React, { useEffect, useState } from "react";
import { Split } from "lucide-react";
import { getPipelineRun } from "@/lib/actions/pipelines.actions";
import { PipelineRun, PipelineStepRun, PipelineStepRunStatus } from "@/types";
import { groupByStage } from "@/lib/utils/pipelines";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface PipelineRunDetailDialogProps {
  runId: string | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Maps a step run's status to a status-dot color.
 *
 * @param status - The step run's status.
 * @returns A Tailwind background-color class for the status dot.
 */
function getStepStatusDotClass(status: PipelineStepRunStatus): string {
  if (status === PipelineStepRunStatus.SUCCESS) return "bg-emerald-500";
  if (status === PipelineStepRunStatus.FAILED) return "bg-red-500";
  if (status === PipelineStepRunStatus.RUNNING) return "bg-blue-500 animate-pulse";
  return "bg-muted-foreground";
}

/**
 * Dialog showing one pipeline run's full per-step trace: mapped input, raw
 * output, cost, latency, and any error for every step that executed.
 *
 * @param props - The run ID to display (or null to stay closed) and a close handler.
 * @returns The React component rendering the run detail dialog.
 */
export function PipelineRunDetailDialog({ runId, onOpenChange }: PipelineRunDetailDialogProps) {
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!runId) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
    }, 0);
    getPipelineRun(runId).then((data) => {
      if (cancelled) return;
      setRun(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [runId]);

  return (
    <Dialog open={runId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Run Trace</DialogTitle>
          <DialogDescription>
            {run ? `Status: ${run.status} · Total cost: ${run.totalCost} credits` : "Loading run details..."}
          </DialogDescription>
        </DialogHeader>

        {loading && <p className="text-xs text-muted-foreground py-6 text-center">Loading...</p>}

        {!loading && run && (
          <div className="space-y-4 pt-2 font-mono text-xs">
            {run.errorMessage && (
              <div className="border border-destructive/30 bg-destructive/10 text-destructive rounded-lg px-3 py-2">
                {run.errorMessage}
              </div>
            )}

            {groupByStage(run.stepRuns ?? []).map((stage) => (
              <div key={stage[0].order}>
                {stage.length > 1 && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5">
                    <Split className="w-3 h-3" /> Parallel — Stage {stage[0].order}
                  </div>
                )}
                <div className={stage.length > 1 ? "flex flex-col md:flex-row gap-2" : undefined}>
                  {stage.map((stepRun) => (
                    <div key={stepRun.id} className="flex-1 min-w-0 border border-border rounded-lg p-3 bg-background space-y-2">
                      <StepRunCard stepRun={stepRun} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {run.output && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Final Output</p>
                <pre className="bg-[#0b0c0e] text-slate-300 rounded-lg p-3 overflow-x-auto text-[10px]">
                  {JSON.stringify(run.output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * One step run's status, timing, and output (or error) within the trace.
 *
 * @param props.stepRun - The step run to render.
 */
function StepRunCard({ stepRun }: { stepRun: PipelineStepRun }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${getStepStatusDotClass(stepRun.status)}`} />
          <span className="font-bold text-foreground">
            {stepRun.step?.label || stepRun.step?.role || `Step ${stepRun.order}`}
          </span>
        </div>
        <span className="text-muted-foreground">
          {stepRun.responseTimeMs != null ? `${stepRun.responseTimeMs}ms` : ""} · {stepRun.cost} credits
        </span>
      </div>
      {stepRun.errorMessage && <p className="text-destructive">{stepRun.errorMessage}</p>}
      {stepRun.output && (
        <pre className="bg-[#0b0c0e] text-slate-300 rounded p-2 overflow-x-auto text-[10px]">
          {JSON.stringify(stepRun.output, null, 2)}
        </pre>
      )}
    </>
  );
}
