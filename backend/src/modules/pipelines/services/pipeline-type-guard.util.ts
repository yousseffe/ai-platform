import { BadRequestException } from '@nestjs/common';
import { Pipeline } from '../entities/pipeline.entity';
import { PipelineEdge } from '../entities/pipeline-edge.entity';
import { PipelineType } from '../enums/pipeline-type.enum';

/**
 * Enforces that a pipeline's declared `type` preset actually matches its
 * structure before it can be validated/run. `CONTEXT_AUGMENTED` and
 * `SEQUENTIAL_CHAIN`/`PARALLEL` are otherwise just labels — this is the only
 * place `type` has any effect.
 *
 * - `SEQUENTIAL_CHAIN` rejects any stage with more than one step.
 * - `PARALLEL` requires at least one stage with more than one step.
 * - `CONTEXT_AUGMENTED` requires at least one mapper rule that reads a
 *   `steps.<N>` path skipping the stage immediately before its edge's target
 *   — i.e. genuinely reaching back past the adjacent step, not just using
 *   `steps.<N>` as a spelled-out synonym for `previous`.
 *
 * @throws {BadRequestException} If the pipeline's structure doesn't match its declared type.
 */
export function assertTypeMatchesStructure(
  pipeline: Pipeline,
  edges: PipelineEdge[],
): void {
  const stageSizes = new Map<number, number>();
  for (const step of pipeline.steps ?? []) {
    stageSizes.set(step.order, (stageSizes.get(step.order) ?? 0) + 1);
  }
  const hasParallelStage = [...stageSizes.values()].some((count) => count > 1);

  if (pipeline.type === PipelineType.SEQUENTIAL_CHAIN && hasParallelStage) {
    throw new BadRequestException(
      'This pipeline is typed "Sequential (Chain)" but has a stage with more than one parallel step. Switch its type to "Parallel", or remove the extra branch.',
    );
  }
  if (pipeline.type === PipelineType.PARALLEL && !hasParallelStage) {
    throw new BadRequestException(
      'This pipeline is typed "Parallel" but no stage has more than one step. Add a parallel branch, or switch its type to "Sequential (Chain)".',
    );
  }
  if (
    pipeline.type === PipelineType.CONTEXT_AUGMENTED &&
    !edges.some(referencesNonAdjacentStep)
  ) {
    throw new BadRequestException(
      'This pipeline is typed "Context-Augmented" but no mapper pulls from a non-adjacent earlier step (a steps.<N> path skipping the stage right before it). Add such a reference, or switch its type.',
    );
  }
}

/**
 * True if any rule in this edge's mapper reads a `steps.<N>` path where `N`
 * is more than one stage before the edge's target — i.e. it skips the stage
 * immediately before it rather than just addressing the adjacent step.
 */
function referencesNonAdjacentStep(edge: PipelineEdge): boolean {
  const targetOrder = edge.toStep?.order ?? Number.POSITIVE_INFINITY;
  for (const rule of edge.spec?.rules ?? []) {
    const source =
      rule.op === 'template'
        ? rule.template
        : rule.op === 'default'
          ? ''
          : rule.from;
    for (const match of source.matchAll(/steps\.(\d+)/g)) {
      if (Number(match[1]) < targetOrder - 1) {
        return true;
      }
    }
  }
  return false;
}
