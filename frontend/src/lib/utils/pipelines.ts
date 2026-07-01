import { PipelineRunStatus, PipelineStep } from "@/types";

/**
 * Determines whether a pipeline run is still in flight and worth polling for.
 *
 * @param status - The run's current status.
 * @returns True if the run is `PENDING` or `RUNNING`.
 */
export function isPipelineRunTransient(status: PipelineRunStatus): boolean {
  return status === PipelineRunStatus.PENDING || status === PipelineRunStatus.RUNNING;
}

/**
 * Groups items sharing a common `order` (stage index) into ascending stage
 * buckets. A stage with more than one item is a parallel branch point —
 * steps sharing a stage execute concurrently on the backend.
 *
 * @param items - Steps or step-runs to group, each with an `order` field.
 * @returns Stages sorted by `order` ascending, each a non-empty array.
 */
export function groupByStage<T extends { order: number }>(items: T[]): T[][] {
  const byOrder = new Map<number, T[]>();
  for (const item of items) {
    const bucket = byOrder.get(item.order) ?? [];
    bucket.push(item);
    byOrder.set(item.order, bucket);
  }
  return [...byOrder.keys()]
    .sort((a, b) => a - b)
    .map((order) => byOrder.get(order)!);
}

/**
 * Human-readable label for a step's mapper-context address —
 * `steps.<order>.<role>` when its stage has parallel siblings, or the flat
 * `steps.<order>` form otherwise.
 *
 * @param step - The step to build a namespace path for.
 * @param stageSize - How many steps share this step's stage.
 * @returns The dotted namespace prefix mapper rules should use for this step.
 */
export function stepNamespacePath(step: Pick<PipelineStep, "order" | "role" | "id">, stageSize: number): string {
  if (stageSize <= 1) {
    return `steps.${step.order}`;
  }
  return `steps.${step.order}.${step.role ?? step.id}`;
}
