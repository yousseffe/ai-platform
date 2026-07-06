import { Injectable, NotFoundException } from '@nestjs/common';
import { ModelsRepository } from '../repositories/models.repository';
import { ModelsSearchService } from './models-search.service';
import { Model } from '../entities/model.entity';

@Injectable()
export class ModelSettingsService {
  constructor(
    private readonly modelsRepository: ModelsRepository,
    private readonly modelsSearchService: ModelsSearchService,
  ) {}

  async updateCacheSettings(
    modelId: string,
    updates: {
      cacheEnabled?: boolean;
      cacheTtlSeconds?: number;
      cacheHitDiscountPercent?: number;
    },
  ): Promise<Model> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    if (updates.cacheEnabled !== undefined) {
      model.cacheEnabled = updates.cacheEnabled;
    }
    if (updates.cacheTtlSeconds !== undefined) {
      model.cacheTtlSeconds = updates.cacheTtlSeconds;
    }
    if (updates.cacheHitDiscountPercent !== undefined) {
      model.cacheHitDiscountPercent = updates.cacheHitDiscountPercent;
    }

    return this.modelsRepository.save(model);
  }

  async updateNetworkSettings(
    modelId: string,
    allowEgress: boolean,
  ): Promise<Model> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    model.allowEgress = allowEgress;
    return this.modelsRepository.save(model);
  }

  async updateVisibilitySettings(
    modelId: string,
    isPublic: boolean,
  ): Promise<Model> {
    const model = await this.modelsRepository.findOne({
      where: { id: modelId },
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    model.isPublic = isPublic;
    return this.modelsRepository.save(model);
  }
}
