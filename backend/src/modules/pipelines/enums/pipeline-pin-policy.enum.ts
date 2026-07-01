/**
 * Whether a pipeline step is pinned to an exact model version (reproducible)
 * or always tracks the latest READY version of its model.
 */
export enum PipelinePinPolicy {
  PINNED = 'pinned',
  LATEST_READY = 'latest_ready',
}
