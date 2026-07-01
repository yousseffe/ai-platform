import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PipelinesService } from '../services/pipelines.service';
import { CreatePipelineDto } from '../dto/create-pipeline.dto';
import { UpdatePipelineDto } from '../dto/update-pipeline.dto';
import { Pipeline } from '../entities/pipeline.entity';

interface RequestWithUser {
  user: { id: string };
}

/**
 * Controller exposing CRUD and lifecycle endpoints for pipeline definitions.
 */
@Controller('pipelines')
@UseGuards(JwtAuthGuard)
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  /** Creates a new, empty pipeline in `DRAFT` status. */
  @Post()
  async createPipeline(
    @Body() body: CreatePipelineDto,
    @Request() req: RequestWithUser,
  ): Promise<Pipeline> {
    return this.pipelinesService.createPipeline(req.user.id, body);
  }

  /** Lists all pipelines owned by the authenticated user. */
  @Get()
  async listPipelines(@Request() req: RequestWithUser): Promise<Pipeline[]> {
    return this.pipelinesService.listPipelines(req.user.id);
  }

  /** Fetches a single pipeline with its steps and bound model versions. */
  @Get(':id')
  async getPipeline(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<Pipeline> {
    return this.pipelinesService.getPipeline(id, req.user.id);
  }

  /** Edits a pipeline's name/description. */
  @Patch(':id')
  async updatePipeline(
    @Param('id') id: string,
    @Body() body: UpdatePipelineDto,
    @Request() req: RequestWithUser,
  ): Promise<Pipeline> {
    return this.pipelinesService.updatePipeline(id, req.user.id, body);
  }

  /** Deletes a pipeline and all its steps/edges/runs. */
  @Delete(':id')
  async deletePipeline(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<{ success: boolean }> {
    await this.pipelinesService.deletePipeline(id, req.user.id);
    return { success: true };
  }

  /** Validates the pipeline's structure and marks it runnable. */
  @Post(':id/validate')
  async validatePipeline(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<Pipeline> {
    return this.pipelinesService.validatePipeline(id, req.user.id);
  }
}
