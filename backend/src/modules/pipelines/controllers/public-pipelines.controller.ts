import { Controller, Get, Param } from '@nestjs/common';
import { PipelinesService } from '../services/pipelines.service';
import { Pipeline } from '../entities/pipeline.entity';

/**
 * Controller exposing the public pipeline marketplace catalog — no
 * authentication required, mirroring `ModelsController`'s `marketplace`
 * routes. Registered ahead of {@link PipelinesController} in the module's
 * `controllers` array so the literal `marketplace` segment is matched before
 * that controller's guarded `:id` route.
 */
@Controller('pipelines')
export class PublicPipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  /** Lists every publicly-listed, runnable pipeline for the marketplace catalog. */
  @Get('marketplace')
  async getPublicPipelines(): Promise<Pipeline[]> {
    return this.pipelinesService.getPublicPipelines();
  }

  /** Fetches a single publicly-listed pipeline by ID. */
  @Get('marketplace/:id')
  async getPublicPipeline(@Param('id') id: string): Promise<Pipeline> {
    return this.pipelinesService.getPublicPipeline(id);
  }
}
