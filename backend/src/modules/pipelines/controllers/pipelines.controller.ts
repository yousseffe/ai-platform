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
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { PipelinesService } from '../services/pipelines.service';
import { CreatePipelineDto } from '../dto/create-pipeline.dto';
import { UpdatePipelineDto } from '../dto/update-pipeline.dto';
import { Pipeline } from '../entities/pipeline.entity';

interface RequestWithUser {
  user: { id: string };
}

@Controller('pipelines')
@UseGuards(JwtAuthGuard)
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Post()
  async createPipeline(
    @Body() body: CreatePipelineDto,
    @Request() req: RequestWithUser,
  ): Promise<Pipeline> {
    return this.pipelinesService.createPipeline(req.user.id, body);
  }

  @Get()
  async listPipelines(@Request() req: RequestWithUser): Promise<Pipeline[]> {
    return this.pipelinesService.listPipelines(req.user.id);
  }

  @Get(':id')
  async getPipeline(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<Pipeline> {
    return this.pipelinesService.getPipeline(id, req.user.id);
  }

  @Patch(':id')
  async updatePipeline(
    @Param('id') id: string,
    @Body() body: UpdatePipelineDto,
    @Request() req: RequestWithUser,
  ): Promise<Pipeline> {
    return this.pipelinesService.updatePipeline(id, req.user.id, body);
  }

  @Delete(':id')
  async deletePipeline(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<{ success: boolean }> {
    await this.pipelinesService.deletePipeline(id, req.user.id);
    return { success: true };
  }

  @Post(':id/validate')
  async validatePipeline(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ): Promise<Pipeline> {
    return this.pipelinesService.validatePipeline(id, req.user.id);
  }
}
