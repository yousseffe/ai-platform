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

    if (isTrial) {
      return { cost: 0, providerSharePercent };
    }

    if (model.hasCustomPricing) {
      const cost =
        typeof model.costPerRequest === 'string'
          ? parseFloat(model.costPerRequest)
          : model.costPerRequest;
      return { cost, providerSharePercent };
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

    return { cost, providerSharePercent: resolvedSharePercent };
  }
}
