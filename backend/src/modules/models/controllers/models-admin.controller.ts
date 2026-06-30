import {
  Controller,
  Patch,
  Delete,
  Param,
  UseGuards,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { Model } from '../entities/model.entity';
import { ModelsSearchService } from '../services/models-search.service';

/**
 * Controller exposing administrative operations specifically for ML models.
 * Protected by JWT Authentication and Administrator checks.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ModelsAdminController {
  private readonly logger = new Logger(ModelsAdminController.name);

  constructor(
    @InjectRepository(Model)
    private readonly modelRepository: Repository<Model>,
    private readonly modelsSearchService: ModelsSearchService,
  ) {}

  /**
   * Deletes a model registry from both SQL database and OpenSearch.
   *
   * @param id - Model UUID.
   * @returns Success receipt.
   */
  @Delete('models/:id')
  async deleteModel(@Param('id') id: string) {
    const model = await this.modelRepository.findOneBy({ id });
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    await this.modelRepository.remove(model);
    try {
      await this.modelsSearchService.deleteFromIndex(id);
    } catch (err: any) {
      this.logger.error(`Failed to delete model ${id} from OpenSearch: ${err.message}`);
    }
    return { success: true };
  }

  /**
   * Toggles the public marketplace visibility of a model and updates OpenSearch.
   *
   * @param id - Model UUID.
   * @returns Receipt confirming updated state.
   */
  @Patch('models/:id/toggle-visibility')
  async toggleModelVisibility(@Param('id') id: string) {
    const model = await this.modelRepository.findOneBy({ id });
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    model.isPublic = !model.isPublic;
    await this.modelRepository.save(model);

    // Fetch full model with relations for OpenSearch indexing
    const fullModel = await this.modelRepository.findOne({
      where: { id },
      relations: ['organization', 'versions', 'versions.deployments', 'user'],
    });
    if (fullModel) {
      try {
        await this.modelsSearchService.indexModel(fullModel);
      } catch (err: any) {
        this.logger.error(`Failed to index model ${id} in OpenSearch: ${err.message}`);
      }
    }
    return { success: true, isPublic: model.isPublic };
  }
}
