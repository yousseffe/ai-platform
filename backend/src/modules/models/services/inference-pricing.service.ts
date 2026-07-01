import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Model } from '../entities/model.entity';
import { SystemConfig } from '../../wallets/entities/system-config.entity';
import { InferencePricing } from '../interfaces/inference.interface';

/**
 * Resolves the credit cost and provider revenue share for a single prediction
 * call, reading global per-type defaults from {@link SystemConfig} unless the
 * model owner configured custom pricing.
 */
@Injectable()
export class InferencePricingService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Computes the cost (in credits) and provider share percentage for a call to
   * the given model.
   *
   * @param model - The target model.
   * @param isTrial - Whether the caller is using a trial API key (always free).
   * @returns The resolved {@link InferencePricing}.
   */
  async computeCost(model: Model, isTrial: boolean): Promise<InferencePricing> {
    const providerSharePercent = model.providerSharePercent || 80;
    const isLlm = model.type === 'LLM_GGUF';

    if (isTrial) {
      return { cost: 0, providerSharePercent, isLlm };
    }

    if (model.hasCustomPricing) {
      const cost =
        typeof model.costPerRequest === 'string'
          ? parseFloat(model.costPerRequest)
          : model.costPerRequest;
      return { cost, providerSharePercent, isLlm };
    }

    if (isLlm) {
      const [inputConfig, outputConfig, shareConfig] = await Promise.all([
        this.dataSource
          .getRepository(SystemConfig)
          .findOne({ where: { key: 'price_llm_gguf_input' } }),
        this.dataSource
          .getRepository(SystemConfig)
          .findOne({ where: { key: 'price_llm_gguf_output' } }),
        this.dataSource
          .getRepository(SystemConfig)
          .findOne({ where: { key: 'default_provider_share_percent' } }),
      ]);
      const inputPricePerMToken = inputConfig ? parseFloat(inputConfig.value) : 2.0;
      const outputPricePerMToken = outputConfig ? parseFloat(outputConfig.value) : 8.0;
      const resolvedSharePercent = shareConfig ? parseInt(shareConfig.value, 10) : providerSharePercent;

      return {
        cost: 0,
        providerSharePercent: resolvedSharePercent,
        isLlm: true,
        inputPricePerMToken,
        outputPricePerMToken,
      };
    }

    const configKey = 'price_' + model.type.toLowerCase();
    const priceConfig = await this.dataSource
      .getRepository(SystemConfig)
      .findOne({ where: { key: configKey } });
    const cost = priceConfig ? parseFloat(priceConfig.value) : 0.1;

    const shareConfig = await this.dataSource
      .getRepository(SystemConfig)
      .findOne({ where: { key: 'default_provider_share_percent' } });
    const resolvedSharePercent = shareConfig
      ? parseInt(shareConfig.value, 10)
      : providerSharePercent;

    return { cost, providerSharePercent: resolvedSharePercent, isLlm: false };
  }
}
