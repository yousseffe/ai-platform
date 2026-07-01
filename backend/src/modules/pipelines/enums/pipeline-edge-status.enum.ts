/**
 * Review status of a {@link PipelineEdge}'s mapper. `MANUAL` edges were
 * hand-written by the user; future auto-detection will produce `OK` or
 * `NEEDS_REVIEW` depending on detector confidence.
 */
export enum PipelineEdgeStatus {
  MANUAL = 'manual',
  OK = 'ok',
  NEEDS_REVIEW = 'needs_review',
}
