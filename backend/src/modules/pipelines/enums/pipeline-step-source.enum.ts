/**
 * Where a step's model came from: an upload made while building the pipeline,
 * or a reference to an already-uploaded model the user (or marketplace) owns.
 * Both resolve to a `ModelVersion` — this field is provenance only.
 */
export enum PipelineStepSource {
  NEW_UPLOAD = 'new_upload',
  EXISTING = 'existing',
}
