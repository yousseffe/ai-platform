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
import { WorkspaceInterceptor } from '../../../shared/interceptors/workspace.interceptor';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { PipelineRunsService } from '../services/pipeline-runs.service';
import { PipelineRun } from '../entities/pipeline-run.entity';

interface RunRequestContext {
  user: { id: string };
  workspaceId: string;
  workspaceType: OwnerType;
}

@Controller('pipelines')
@UseGuards(JwtAuthGuard)
export class PipelineRunsController {
  constructor(private readonly runsService: PipelineRunsService) {}

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

  @Get(':id/runs')
  async listRuns(
    @Param('id') id: string,
    @Req() req: Record<string, unknown> & RunRequestContext,
  ): Promise<PipelineRun[]> {
    return this.runsService.listRuns(id, req.user.id);
  }

  @Get('runs/:runId')
  async getRun(
    @Param('runId') runId: string,
    @Req() req: Record<string, unknown> & RunRequestContext,
  ): Promise<PipelineRun> {
    return this.runsService.getRun(runId, req.user.id);
  }
}
