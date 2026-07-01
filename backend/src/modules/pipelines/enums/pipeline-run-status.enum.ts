/** Overall execution status of a single pipeline run. */
export enum PipelineRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  PARTIAL = 'partial',
}
