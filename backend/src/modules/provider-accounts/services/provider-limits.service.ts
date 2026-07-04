import { BadRequestException, Injectable } from '@nestjs/common';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { ModelType } from '../../models/enums/model-type.enum';
import { ProviderAccount } from '../entities/provider-account.entity';
import { ProviderAccountStatus } from '../enums/provider-account-status.enum';
import { assertWithinLimit } from '../utils/limit.util';
import { ProviderAccountsService } from './provider-accounts.service';
import { ProviderUtilizationService } from './provider-utilization.service';

/**
 * Reusable provider account, tier, and upload limit guards.
 */
@Injectable()
export class ProviderLimitsService {
  constructor(
    private readonly providerAccountsService: ProviderAccountsService,
    private readonly utilizationService: ProviderUtilizationService,
  ) {}

  /**
   * Verifies a provider can create a model of a requested type and visibility.
   *
   * @param ownerType - USER or ORG publishing owner.
   * @param ownerId - Publishing owner UUID.
   * @param modelType - Requested model type.
   * @param isPublic - Whether the model should be public.
   * @returns Active provider account.
   */
  async assertCanCreateModel(
    ownerType: OwnerType,
    ownerId: string,
    modelType: ModelType,
    isPublic: boolean,
  ): Promise<ProviderAccount> {
    const account = await this.getActiveProviderAccount(ownerType, ownerId);
    const tier = account.tier;
    if (!tier.isActive) {
      throw new BadRequestException('Provider tier is inactive');
    }
    const limits = this.utilizationService.resolveEffectiveLimits(account);
    if (!isPublic && !limits.allowPrivateModels) {
      throw new BadRequestException(
        'Current provider tier does not allow private models',
      );
    }
    const utilization = await this.utilizationService.getUtilization(account);
    assertWithinLimit(
      utilization.totalModels.used,
      limits.maxModels,
      'Provider model limit reached',
    );
    if (isPublic) {
      assertWithinLimit(
        utilization.publicModels.used,
        limits.maxPublicModels,
        'Provider public model limit reached',
      );
    }
    this.assertTypeLimit(modelType, utilization, limits);
    return account;
  }

  /**
   * Verifies a provider can upload another version for a model.
   *
   * @param ownerType - USER or ORG publishing owner.
   * @param ownerId - Publishing owner UUID.
   * @param modelId - Target model UUID.
   * @returns Active provider account.
   */
  async assertCanCreateModelVersion(
    ownerType: OwnerType,
    ownerId: string,
    modelId: string,
  ): Promise<ProviderAccount> {
    const account = await this.getActiveProviderAccount(ownerType, ownerId);
    if (!account.tier.isActive) {
      throw new BadRequestException('Provider tier is inactive');
    }
    const limits = this.utilizationService.resolveEffectiveLimits(account);
    const used = await this.utilizationService.countVersionsForModel(modelId);
    assertWithinLimit(
      used,
      limits.maxVersionsPerModel,
      'Provider model version limit reached',
    );
    return account;
  }

  /**
   * Fetches and validates active provider account state.
   *
   * @param ownerType - Provider owner type.
   * @param ownerId - Provider owner UUID.
   * @returns Active provider account.
   */
  private async getActiveProviderAccount(
    ownerType: OwnerType,
    ownerId: string,
  ): Promise<ProviderAccount> {
    const account = await this.providerAccountsService.findByOwner(
      ownerType,
      ownerId,
    );
    if (!account) {
      throw new BadRequestException('Provider account is required');
    }
    if (account.status !== ProviderAccountStatus.ACTIVE) {
      throw new BadRequestException('Provider account is not active');
    }
    return account;
  }

  /**
   * Checks the per-model-type limit for the requested model type.
   */
  private assertTypeLimit(
    modelType: ModelType,
    utilization: Awaited<
      ReturnType<ProviderUtilizationService['getUtilization']>
    >,
    limits: ReturnType<ProviderUtilizationService['resolveEffectiveLimits']>,
  ): void {
    const limitByType: Partial<Record<ModelType, [number, number | null]>> = {
      [ModelType.LLM_GGUF]: [utilization.llmModels.used, limits.maxLLMModels],
      [ModelType.VISION]: [
        utilization.visionModels.used,
        limits.maxVisionModels,
      ],
      [ModelType.NLP]: [utilization.nlpModels.used, limits.maxNLPModels],
      [ModelType.TABULAR]: [
        utilization.tabularModels.used,
        limits.maxTabularModels,
      ],
      [ModelType.DIFFUSION]: [
        utilization.diffusionModels.used,
        limits.maxDiffusionModels,
      ],
      [ModelType.AUDIO]: [utilization.audioModels.used, limits.maxAudioModels],
      [ModelType.EMBEDDING]: [
        utilization.embeddingModels.used,
        limits.maxEmbeddingModels,
      ],
    };
    const typeLimit = limitByType[modelType];
    if (!typeLimit) {
      return;
    }
    assertWithinLimit(
      typeLimit[0],
      typeLimit[1],
      `${modelType} model limit reached`,
    );
  }
}
