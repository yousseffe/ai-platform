import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Model } from '../../models/entities/model.entity';
import { SystemConfig } from '../../wallets/entities/system-config.entity';
import { ProviderAccountsService } from '../../provider-accounts/services/provider-accounts.service';
import { InferencePricing } from '../interfaces/inference.interface';
import { OwnerType } from '../../../shared/enums/owner-type.enum';

@Injectable()
export class InferencePricingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly providerAccountsService: ProviderAccountsService,
  ) {}

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
      const inputPricePerMToken = inputConfig
        ? parseFloat(inputConfig.value)
        : 2.0;
      const outputPricePerMToken = outputConfig
        ? parseFloat(outputConfig.value)
        : 8.0;
      const resolvedSharePercent = shareConfig
        ? parseInt(shareConfig.value, 10)
        : providerSharePercent;

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
    const fallbackSharePercent = shareConfig
      ? parseInt(shareConfig.value, 10)
      : providerSharePercent;
    const ownerType = model.organization ? OwnerType.ORG : OwnerType.USER;
    const ownerId = model.organization?.id ?? model.user.id;
    const resolvedSharePercent =
      await this.providerAccountsService.resolveProviderSharePercent(
        ownerType,
        ownerId,
        fallbackSharePercent,
      );

    return { cost, providerSharePercent: resolvedSharePercent, isLlm: false };
  }
}
