import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderTierDefinition } from '../entities/provider-tier-definition.entity';
import { ProviderAccount } from '../entities/provider-account.entity';
import { UpsertProviderTierDto } from '../dto/provider-tier.dto';

/**
 * Manages admin-configurable provider tier definitions and default seed tiers.
 */
@Injectable()
export class ProviderTierService implements OnModuleInit {
  constructor(
    @InjectRepository(ProviderTierDefinition)
    private readonly tierRepository: Repository<ProviderTierDefinition>,
    @InjectRepository(ProviderAccount)
    private readonly providerAccountRepository: Repository<ProviderAccount>,
  ) {}

  /**
   * Ensures default provider tiers exist when the application boots.
   */
  async onModuleInit(): Promise<void> {
    await this.seedDefaultTiers();
  }

  /**
   * Lists all provider tiers in admin order.
   *
   * @returns Provider tier definitions.
   */
  async listTiers(): Promise<ProviderTierDefinition[]> {
    return this.tierRepository.find({ order: { sortOrder: 'ASC' } });
  }

  /**
   * Retrieves a tier by UUID.
   *
   * @param tierId - Tier UUID.
   * @returns Provider tier definition.
   * @throws {NotFoundException} If the tier does not exist.
   */
  async getTier(tierId: string): Promise<ProviderTierDefinition> {
    const tier = await this.tierRepository.findOneBy({ id: tierId });
    if (!tier) {
      throw new NotFoundException('Provider tier not found');
    }
    return tier;
  }

  /**
   * Resolves the active FREE tier used for default provider provisioning.
   *
   * @returns The FREE tier definition.
   */
  async getDefaultTier(): Promise<ProviderTierDefinition> {
    let tier = await this.tierRepository.findOne({ where: { code: 'FREE' } });
    if (!tier) {
      await this.seedDefaultTiers();
      tier = await this.tierRepository.findOne({ where: { code: 'FREE' } });
    }
    if (!tier) {
      throw new NotFoundException('Default provider tier is missing');
    }
    return tier;
  }

  /**
   * Creates a new provider tier definition.
   *
   * @param dto - Tier creation payload.
   * @returns Created tier.
   */
  async createTier(dto: UpsertProviderTierDto): Promise<ProviderTierDefinition> {
    this.assertRevenueSplit(dto);
    const existing = await this.tierRepository.findOne({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException('Provider tier code already exists');
    }
    const tier = this.tierRepository.create(this.normalizeTierDto(dto));
    return this.tierRepository.save(tier);
  }

  /**
   * Updates an existing provider tier definition.
   *
   * @param tierId - Target tier UUID.
   * @param dto - Tier update payload.
   * @returns Updated tier.
   */
  async updateTier(
    tierId: string,
    dto: UpsertProviderTierDto,
  ): Promise<ProviderTierDefinition> {
    this.assertRevenueSplit(dto);
    const tier = await this.getTier(tierId);
    Object.assign(tier, this.normalizeTierDto(dto));
    return this.tierRepository.save(tier);
  }

  /**
   * Deletes an unused tier or deactivates one that is assigned to providers.
   *
   * @param tierId - Target tier UUID.
   * @returns Deletion/deactivation receipt.
   */
  async deleteOrDeactivateTier(
    tierId: string,
  ): Promise<{ deleted: boolean; tier?: ProviderTierDefinition }> {
    const tier = await this.getTier(tierId);
    const usageCount = await this.providerAccountRepository.count({
      where: { tier: { id: tierId } },
    });
    if (usageCount === 0) {
      await this.tierRepository.remove(tier);
      return { deleted: true };
    }
    tier.isActive = false;
    const saved = await this.tierRepository.save(tier);
    return { deleted: false, tier: saved };
  }

  /**
   * Seeds the default tier catalog without relying on hardcoded business logic.
   */
  private async seedDefaultTiers(): Promise<void> {
    const defaults: Array<Partial<ProviderTierDefinition>> = [
      {
        code: 'FREE',
        displayName: 'Free',
        monthlyPriceEgp: 0,
        platformCommissionPercent: 20,
        providerSharePercent: 80,
        maxModels: 3,
        maxPublicModels: 1,
        maxVersionsPerModel: 3,
        sortOrder: 10,
      },
      {
        code: 'STARTER',
        displayName: 'Starter',
        monthlyPriceEgp: 199,
        platformCommissionPercent: 18,
        providerSharePercent: 82,
        maxModels: 10,
        maxPublicModels: 5,
        maxVersionsPerModel: 8,
        sortOrder: 20,
      },
      {
        code: 'PRO',
        displayName: 'Pro',
        monthlyPriceEgp: 499,
        platformCommissionPercent: 15,
        providerSharePercent: 85,
        maxModels: 30,
        maxPublicModels: 20,
        maxVersionsPerModel: 15,
        allowCustomPricing: true,
        allowPriorityReview: true,
        sortOrder: 30,
      },
      {
        code: 'BUSINESS',
        displayName: 'Business',
        monthlyPriceEgp: 999,
        platformCommissionPercent: 12,
        providerSharePercent: 88,
        maxModels: null,
        maxPublicModels: null,
        maxVersionsPerModel: null,
        allowCustomPricing: true,
        allowOrgPublishing: true,
        allowAdvancedAnalytics: true,
        sortOrder: 40,
      },
      {
        code: 'ENTERPRISE',
        displayName: 'Enterprise',
        monthlyPriceEgp: 0,
        platformCommissionPercent: 10,
        providerSharePercent: 90,
        maxModels: null,
        maxPublicModels: null,
        maxVersionsPerModel: null,
        allowCustomPricing: true,
        allowPriorityReview: true,
        allowOrgPublishing: true,
        allowDedicatedSupport: true,
        allowFeaturedPlacement: true,
        allowAdvancedAnalytics: true,
        sortOrder: 50,
      },
    ];

    for (const tierDefaults of defaults) {
      const code = tierDefaults.code;
      if (!code) {
        continue;
      }
      const existing = await this.tierRepository.findOne({ where: { code } });
      if (existing) {
        continue;
      }
      await this.tierRepository.save(
        this.tierRepository.create({
          description: null,
          annualPriceEgp: null,
          maxLLMModels: null,
          maxVisionModels: null,
          maxNLPModels: null,
          maxTabularModels: null,
          maxDiffusionModels: null,
          maxAudioModels: null,
          maxEmbeddingModels: null,
          allowPrivateModels: true,
          allowCustomPricing: false,
          allowPriorityReview: false,
          allowOrgPublishing: false,
          allowDedicatedSupport: false,
          allowFeaturedPlacement: false,
          allowAdvancedAnalytics: false,
          isActive: true,
          ...tierDefaults,
        }),
      );
    }
  }

  /**
   * Normalizes tier input before persistence.
   *
   * @param dto - Raw admin DTO.
   * @returns Persistence-safe partial entity.
   */
  private normalizeTierDto(
    dto: UpsertProviderTierDto,
  ): Partial<ProviderTierDefinition> {
    return {
      ...dto,
      code: dto.code.trim().toUpperCase(),
      description: dto.description?.trim() || null,
      annualPriceEgp: dto.annualPriceEgp ?? null,
      maxModels: dto.maxModels ?? null,
      maxPublicModels: dto.maxPublicModels ?? null,
      maxVersionsPerModel: dto.maxVersionsPerModel ?? null,
      maxLLMModels: dto.maxLLMModels ?? null,
      maxVisionModels: dto.maxVisionModels ?? null,
      maxNLPModels: dto.maxNLPModels ?? null,
      maxTabularModels: dto.maxTabularModels ?? null,
      maxDiffusionModels: dto.maxDiffusionModels ?? null,
      maxAudioModels: dto.maxAudioModels ?? null,
      maxEmbeddingModels: dto.maxEmbeddingModels ?? null,
    };
  }

  /**
   * Ensures tier payout percentages describe a full revenue split.
   */
  private assertRevenueSplit(dto: UpsertProviderTierDto): void {
    if (dto.platformCommissionPercent + dto.providerSharePercent !== 100) {
      throw new BadRequestException(
        'Platform commission and provider share must add up to 100',
      );
    }
  }
}
