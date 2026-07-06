import { BadRequestException } from '@nestjs/common';
import { Pipeline } from '../entities/pipeline.entity';
import { PipelineEdge } from '../entities/pipeline-edge.entity';
import { PipelineType } from '../enums/pipeline-type.enum';

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
