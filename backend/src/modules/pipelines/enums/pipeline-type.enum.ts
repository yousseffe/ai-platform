/**
 * UI-facing preset describing the shape a pipeline is intended to have.
 * Purely descriptive metadata — every pipeline runs through the same
 * stage-grouped mapper engine regardless of `type`; this only drives
 * default copy/affordances in the builder.
 */
export enum PipelineType {
  SEQUENTIAL_CHAIN = 'sequential_chain',
  CONTEXT_AUGMENTED = 'context_augmented',
  PARALLEL = 'parallel',
}
