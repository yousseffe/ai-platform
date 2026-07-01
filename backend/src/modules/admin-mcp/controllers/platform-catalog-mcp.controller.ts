import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeyOrJwtGuard } from '../../auth/guards/api-key-or-jwt.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { Model } from '../../models/entities/model.entity';
import { SystemConfig } from '../../wallets/entities/system-config.entity';

/**
 * Read-only platform model catalog and configuration surface consumed by the
 * `admin_list_models` and `admin_get_platform_config` MCP tools. Mirrors
 * `AdminController.getModels()`/`getPricingDefaults()`/`getOrgCreationFee()`
 * but is guarded for API-key/MCP-token access instead of JWT-only.
 */
@Controller('admin-mcp')
@UseGuards(ApiKeyOrJwtGuard, AdminGuard)
export class PlatformCatalogMcpController {
  constructor(
    @InjectRepository(Model)
    private readonly modelRepository: Repository<Model>,
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepository: Repository<SystemConfig>,
  ) {}

  /**
   * Lists every model registered on the platform (catalog view, no live container stats).
   *
   * @returns Model catalog summary.
   */
  @Get('models')
  async listModels() {
    const models = await this.modelRepository.find({
      relations: ['user', 'organization'],
    });
    return models.map((model) => ({
      id: model.id,
      name: model.name,
      type: model.type,
      framework: model.framework,
      tier: model.tier,
      costPerRequest: Number(model.costPerRequest),
      providerSharePercent: model.providerSharePercent,
      isPublic: model.isPublic,
      marketplaceVerified: model.marketplaceVerified,
      averageRating: Number(model.averageRating),
      reviewCount: model.reviewCount,
      owner: model.user?.email ?? 'Unknown',
      organization: model.organization?.name ?? null,
      createdAt: model.createdAt,
    }));
  }

  /**
   * Returns the platform's global pricing defaults and org creation fee.
   *
   * @returns Combined platform configuration.
   */
  @Get('config')
  async getConfig() {
    const configs = await this.systemConfigRepository.find();
    const configMap = new Map(configs.map((c) => [c.key, c.value]));
    const float = (key: string, fallback: number): number =>
      configMap.has(key) ? parseFloat(configMap.get(key) as string) : fallback;
    const int = (key: string, fallback: number): number =>
      configMap.has(key)
        ? parseInt(configMap.get(key) as string, 10)
        : fallback;

    return {
      orgCreationFee: float('org_creation_fee', 50.0),
      priceTabular: float('price_tabular', 0.00005),
      priceNlp: float('price_nlp', 0.2),
      priceVision: float('price_vision', 0.01),
      priceDiffusion: float('price_diffusion', 0.04),
      priceLlmGgufInput: float('price_llm_gguf_input', 2.0),
      priceLlmGgufOutput: float('price_llm_gguf_output', 8.0),
      defaultProviderSharePercent: int('default_provider_share_percent', 80),
      playgroundTrialLimit: int('playground_trial_limit', 50),
      creditsPerEgp: int('credits_per_egp', 10),
      commissionTierFree: int('commission_tier_free', 20),
      commissionTierProfessional: int('commission_tier_professional', 15),
      commissionTierEnterprise: int('commission_tier_enterprise', 10),
    };
  }
}
