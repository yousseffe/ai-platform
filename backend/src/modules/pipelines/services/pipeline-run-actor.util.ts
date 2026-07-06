import { PipelineRun } from '../entities/pipeline-run.entity';
import { PredictionActor } from '../../inference';

export function buildPipelineRunActor(run: PipelineRun): PredictionActor {
  return {
    userId: run.triggeredBy?.id ?? run.workspaceId,
    email: run.triggeredBy?.email ?? 'pipeline-run',
    workspaceId: run.workspaceId,
    workspaceType: run.workspaceType,
  };
}
