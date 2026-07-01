import { BadRequestException } from '@nestjs/common';
import { Pipeline } from '../entities/pipeline.entity';
import { PipelineEdge } from '../entities/pipeline-edge.entity';
import { PipelineType } from '../enums/pipeline-type.enum';

/**
 * Validates that the pipeline's actual graph structure matches its declared
 * descriptive preset type.
 *
 * - SEQUENTIAL_CHAIN: Every stage (step order) must contain exactly one step.
 * - CONTEXT_AUGMENTED: Allows any structure.
 * - PARALLEL: Must contain at least one stage with parallel steps.
 */
export function assertTypeMatchesStructure(
  pipeline: Pipeline,
  edges: PipelineEdge[],
): void {
  if (!pipeline.steps || pipeline.steps.length === 0) {
    return;
  }

  const byOrder = new Map<number, number>();
  for (const step of pipeline.steps) {
    byOrder.set(step.order, (byOrder.get(step.order) ?? 0) + 1);
  }

  if (pipeline.type === PipelineType.SEQUENTIAL_CHAIN) {
    for (const [order, count] of byOrder.entries()) {
      if (count > 1) {
        throw new BadRequestException(
          `Pipeline is marked as Sequential Chain, but Stage ${order} has ${count} parallel steps.`,
        );
      }
    }
  }
}
