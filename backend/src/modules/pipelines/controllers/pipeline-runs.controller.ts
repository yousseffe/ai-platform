import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceInterceptor } from '../../auth/guards/workspace.interceptor';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { PipelineRunsService } from '../services/pipeline-runs.service';
import { PipelineRun } from '../entities/pipeline-run.entity';

interface RunRequestContext {
  user: { id: string };
  workspaceId: string;
  workspaceType: OwnerType;
}

/**
 * Controller exposing endpoints to trigger pipeline runs and inspect their
 * status — the pipeline equivalent of the model `/predict` endpoint.
 */
@Controller('pipelines')
@UseGuards(JwtAuthGuard)
export class PipelineRunsController {
  constructor(private readonly runsService: PipelineRunsService) {}

  /** Triggers a background run of a `VALIDATED` pipeline. */
  @Post(':id/run')
  @UseInterceptors(WorkspaceInterceptor)
  async triggerRun(
    @Param('id') id: string,
    @Body() body: { input?: Record<string, unknown> },
    @Req() req: Record<string, unknown> & RunRequestContext,
  ): Promise<PipelineRun> {
    return this.runsService.triggerRun(
      id,
      req.user.id,
      req.workspaceId,
      req.workspaceType,
      body.input ?? {},
    );
  }

  /** Lists recent runs for a pipeline, newest first. */
  @Get(':id/runs')
  async listRuns(
    @Param('id') id: string,
    @Req() req: Record<string, unknown> & RunRequestContext,
  ): Promise<PipelineRun[]> {
    return this.runsService.listRuns(id, req.user.id);
  }

  /** Fetches a single run's status, output, and per-step results. */
  @Get('runs/:runId')
  async getRun(
    @Param('runId') runId: string,
    @Req() req: Record<string, unknown> & RunRequestContext,
  ): Promise<PipelineRun> {
    return this.runsService.getRun(runId, req.user.id);
  }
}
