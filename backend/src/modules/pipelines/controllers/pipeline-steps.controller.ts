import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PipelineStepsService } from '../services/pipeline-steps.service';
import { PipelineEdgesService } from '../services/pipeline-edges.service';
import { CreateStepDto } from '../dto/create-step.dto';
import { UpdateStepDto } from '../dto/update-step.dto';
import { UpsertEdgeDto } from '../dto/upsert-edge.dto';
import { PipelineStep } from '../entities/pipeline-step.entity';
import { PipelineEdge } from '../entities/pipeline-edge.entity';

interface RequestWithUser {
  user: { id: string };
}

/**
 * Controller exposing endpoints for editing a pipeline's steps and the
 * mapper edges between them.
 */
@Controller('pipelines/:pipelineId')
@UseGuards(JwtAuthGuard)
export class PipelineStepsController {
  constructor(
    private readonly stepsService: PipelineStepsService,
    private readonly edgesService: PipelineEdgesService,
  ) {}

  /** Adds a step bound to an existing READY model version. */
  @Post('steps')
  async addStep(
    @Param('pipelineId') pipelineId: string,
    @Body() body: CreateStepDto,
    @Request() req: RequestWithUser,
  ): Promise<PipelineStep> {
    return this.stepsService.addStep(pipelineId, req.user.id, body);
  }

  /** Edits an existing step. */
  @Patch('steps/:stepId')
  async updateStep(
    @Param('pipelineId') pipelineId: string,
    @Param('stepId') stepId: string,
    @Body() body: UpdateStepDto,
    @Request() req: RequestWithUser,
  ): Promise<PipelineStep> {
    return this.stepsService.updateStep(pipelineId, stepId, req.user.id, body);
  }

  /** Removes a step from a pipeline. */
  @Delete('steps/:stepId')
  async removeStep(
    @Param('pipelineId') pipelineId: string,
    @Param('stepId') stepId: string,
    @Request() req: RequestWithUser,
  ): Promise<{ success: boolean }> {
    await this.stepsService.removeStep(pipelineId, stepId, req.user.id);
    return { success: true };
  }

  /** Lists all edges defined for a pipeline. */
  @Get('edges')
  async listEdges(
    @Param('pipelineId') pipelineId: string,
    @Request() req: RequestWithUser,
  ): Promise<PipelineEdge[]> {
    return this.edgesService.listEdges(pipelineId, req.user.id);
  }

  /** Creates or replaces the mapper edge for a given from/to step pair. */
  @Post('edges')
  async upsertEdge(
    @Param('pipelineId') pipelineId: string,
    @Body() body: UpsertEdgeDto,
    @Request() req: RequestWithUser,
  ): Promise<PipelineEdge> {
    return this.edgesService.upsertEdge(pipelineId, req.user.id, body);
  }

  /** Deletes an edge by ID. */
  @Delete('edges/:edgeId')
  async removeEdge(
    @Param('pipelineId') pipelineId: string,
    @Param('edgeId') edgeId: string,
    @Request() req: RequestWithUser,
  ): Promise<{ success: boolean }> {
    await this.edgesService.removeEdge(pipelineId, edgeId, req.user.id);
    return { success: true };
  }
}
