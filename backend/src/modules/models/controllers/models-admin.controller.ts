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
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Model } from '../entities/model.entity';
import { ModelsSearchService } from '../services/models-search.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ModelsAdminController {
  private readonly logger = new Logger(ModelsAdminController.name);

  constructor(
    @InjectRepository(Model)
    private readonly modelRepository: Repository<Model>,
    private readonly modelsSearchService: ModelsSearchService,
  ) {}

  @Delete('models/:id')
  async deleteModel(@Param('id') id: string) {
    const model = await this.modelRepository.findOneBy({ id });
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    await this.modelRepository.remove(model);
    try {
      await this.modelsSearchService.deleteFromIndex(id);
    } catch (err: unknown) {
      this.logger.error(
        `Failed to delete model ${id} from OpenSearch: ${(err as Error).message}`,
      );
    }
    return { success: true };
  }

  @Patch('models/:id/toggle-visibility')
  async toggleModelVisibility(@Param('id') id: string) {
    const model = await this.modelRepository.findOneBy({ id });
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    model.isPublic = !model.isPublic;
    await this.modelRepository.save(model);

    const fullModel = await this.modelRepository.findOne({
      where: { id },
      relations: ['organization', 'versions', 'versions.deployments', 'user'],
    });
    if (fullModel) {
      try {
        await this.modelsSearchService.indexModel(fullModel);
      } catch (err: unknown) {
        this.logger.error(
          `Failed to index model ${id} in OpenSearch: ${(err as Error).message}`,
        );
      }
    }
    return { success: true, isPublic: model.isPublic };
  }
}
