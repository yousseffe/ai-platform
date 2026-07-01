import { PipelineRun } from '../entities/pipeline-run.entity';
import { PredictionActor } from '../../models/interfaces/inference.interface';

/** Builds the {@link PredictionActor} identity used for billing/logging each step of a run. */
export function buildPipelineRunActor(run: PipelineRun): PredictionActor {
  return {
    userId: run.triggeredBy?.id ?? run.workspaceId,
    email: run.triggeredBy?.email ?? 'pipeline-run',
    workspaceId: run.workspaceId,
    workspaceType: run.workspaceType,
  };
}
