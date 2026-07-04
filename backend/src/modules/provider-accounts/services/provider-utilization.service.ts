import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { Model } from '../../models/entities/model.entity';
import { ModelVersion } from '../../models/entities/model-version.entity';
import { ModelType } from '../../models/enums/model-type.enum';
import { ProviderAccount } from '../entities/provider-account.entity';
import {
  EffectiveProviderLimits,
  LimitUtilization,
  ProviderUtilization,
} from '../interfaces/provider-limits.interface';
import { remainingLimit, resolveLimit } from '../utils/limit.util';

/**
 * Calculates current provider usage against effective tier limits.
 */
@Injectable()
export class ProviderUtilizationService {
  constructor(
    @InjectRepository(Model)
    private readonly modelRepository: Repository<Model>,
    @InjectRepository(ModelVersion)
    private readonly modelVersionRepository: Repository<ModelVersion>,
  ) {}

  /**
   * Resolves limits after provider custom overrides are applied over tier defaults.
   *
   * @param account - Provider account with assigned tier.
   * @returns Effective provider limits.
   */
  resolveEffectiveLimits(account: ProviderAccount): EffectiveProviderLimits {
    const tier = account.tier;
    return {
      maxModels: resolveLimit(account.customMaxModels, tier.maxModels),
      maxPublicModels: resolveLimit(
        account.customMaxPublicModels,
        tier.maxPublicModels,
      ),
      maxVersionsPerModel: resolveLimit(
        account.customMaxVersionsPerModel,
        tier.maxVersionsPerModel,
      ),
      maxLLMModels: resolveLimit(account.customMaxLLMModels, tier.maxLLMModels),
      maxVisionModels: resolveLimit(
        account.customMaxVisionModels,
        tier.maxVisionModels,
      ),
      maxNLPModels: resolveLimit(account.customMaxNLPModels, tier.maxNLPModels),
      maxTabularModels: resolveLimit(
        account.customMaxTabularModels,
        tier.maxTabularModels,
      ),
      maxDiffusionModels: resolveLimit(
        account.customMaxDiffusionModels,
        tier.maxDiffusionModels,
      ),
      maxAudioModels: tier.maxAudioModels,
      maxEmbeddingModels: tier.maxEmbeddingModels,
      allowPrivateModels: tier.allowPrivateModels,
      allowCustomPricing: tier.allowCustomPricing,
      allowPriorityReview: tier.allowPriorityReview,
      allowOrgPublishing: tier.allowOrgPublishing,
      allowDedicatedSupport: tier.allowDedicatedSupport,
      allowFeaturedPlacement: tier.allowFeaturedPlacement,
      allowAdvancedAnalytics: tier.allowAdvancedAnalytics,
    };
  }

  /**
   * Calculates model usage for an account owner.
   *
   * @param account - Provider account.
   * @returns Current utilization metrics.
   */
  async getUtilization(account: ProviderAccount): Promise<ProviderUtilization> {
    const limits = this.resolveEffectiveLimits(account);
    const models = await this.findProviderModels(account);

    return {
      totalModels: this.toUtilization(models.length, limits.maxModels),
      publicModels: this.toUtilization(
        models.filter((model) => model.isPublic).length,
        limits.maxPublicModels,
      ),
      llmModels: this.toUtilization(
        models.filter((model) => model.type === ModelType.LLM_GGUF).length,
        limits.maxLLMModels,
      ),
      visionModels: this.toUtilization(
        models.filter((model) => model.type === ModelType.VISION).length,
        limits.maxVisionModels,
      ),
      nlpModels: this.toUtilization(
        models.filter((model) => model.type === ModelType.NLP).length,
        limits.maxNLPModels,
      ),
      tabularModels: this.toUtilization(
        models.filter((model) => model.type === ModelType.TABULAR).length,
        limits.maxTabularModels,
      ),
      diffusionModels: this.toUtilization(
        models.filter((model) => model.type === ModelType.DIFFUSION).length,
        limits.maxDiffusionModels,
      ),
      audioModels: this.toUtilization(
        models.filter((model) => model.type === ModelType.AUDIO).length,
        limits.maxAudioModels,
      ),
      embeddingModels: this.toUtilization(
        models.filter((model) => model.type === ModelType.EMBEDDING).length,
        limits.maxEmbeddingModels,
      ),
    };
  }

  /**
   * Counts versions currently attached to a model.
   *
   * @param modelId - Model UUID.
   * @returns Current version count.
   */
  async countVersionsForModel(modelId: string): Promise<number> {
    return this.modelVersionRepository.count({
      where: { model: { id: modelId } },
    });
  }

  /**
   * Returns all models owned by a provider account.
   *
   * @param account - Provider account.
   * @returns Provider-owned model records.
   */
  async findProviderModels(account: ProviderAccount): Promise<Model[]> {
    if (account.ownerType === OwnerType.ORG) {
      return this.modelRepository.find({
        where: { organization: { id: account.ownerId } },
      });
    }
    return this.modelRepository.find({ where: { user: { id: account.ownerId } } });
  }

  /**
   * Converts a used/limit pair into admin-friendly utilization shape.
   *
   * @param used - Current usage count.
   * @param limit - Effective limit.
   * @returns Utilization triplet.
   */
  private toUtilization(used: number, limit: number | null): LimitUtilization {
    return { used, limit, remaining: remainingLimit(used, limit) };
  }
}
