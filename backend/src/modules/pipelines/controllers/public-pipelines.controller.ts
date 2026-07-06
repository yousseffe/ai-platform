import { Controller, Get, Param } from '@nestjs/common';
import { PipelinesService } from '../services/pipelines.service';
import { Pipeline } from '../entities/pipeline.entity';

@Controller('pipelines')
export class PublicPipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Get('marketplace')
  async getPublicPipelines(): Promise<Pipeline[]> {
    return this.pipelinesService.getPublicPipelines();
  }

  @Get('marketplace/:id')
  async getPublicPipeline(@Param('id') id: string): Promise<Pipeline> {
    return this.pipelinesService.getPublicPipeline(id);
  }
}
