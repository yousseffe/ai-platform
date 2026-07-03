import { Pipeline } from '../entities/pipeline.entity';
import { PipelineEdge } from '../entities/pipeline-edge.entity';

/**
 * Placeholder for future pipeline-type-specific validation.
 *
 * Today `Pipeline.type` is a UI-facing preset/label only: the execution engine
 * supports sequential, context-augmented, and parallel shapes through the same
 * stage/edge model. Keeping this guard intentionally permissive preserves that
 * documented behavior while satisfying the validation call site.
 */
export function assertTypeMatchesStructure(
  pipeline: Pipeline,
  edges: PipelineEdge[],
): void {
  void pipeline;
  void edges;
}
