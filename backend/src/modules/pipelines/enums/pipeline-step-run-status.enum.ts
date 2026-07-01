/** Execution status of a single step within a {@link PipelineRun}. */
export enum PipelineStepRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}
