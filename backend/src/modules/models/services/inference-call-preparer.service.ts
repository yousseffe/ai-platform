import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Model } from '../entities/model.entity';
import { ModelType } from '../enums/model-type.enum';
import { ApiKey } from '../../auth/entities/api-key.entity';
import { ApiKeyType } from '../../auth/enums/api-key-type.enum';
import { WalletsService } from '../../wallets/services/wallets.service';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { RedisService } from '../../../shared/redis/redis.service';
import { InferencePricingService } from './inference-pricing.service';
import {
  ContainerCallTarget,
  PredictionActor,
} from '../interfaces/inference.interface';

/** Pricing and container target resolved ahead of an inference call. */
export interface PreparedCall extends ContainerCallTarget {
  cost: number;
  providerSharePercent: number;
}

/**
 * Validates a caller can afford a prediction call and resolves the
 * container-facing endpoint/headers needed to make it. Also tracks
 * deployment activity for idle/eviction scheduling.
 */
@Injectable()
export class InferenceCallPreparerService {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly redisService: RedisService,
    private readonly pricingService: InferencePricingService,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  /**
   * @param model - The target model.
   * @param actor - The caller, used to resolve the consumer wallet to check.
   * @returns Cost, provider share, and container call target.
   * @throws {BadRequestException} If the consumer wallet balance is insufficient.
   */
  async prepareCall(
    model: Model,
    actor: PredictionActor,
  ): Promise<PreparedCall> {
    const isTrial = actor.apiKeyType === ApiKeyType.TRIAL;
    const { cost, providerSharePercent } =
      await this.pricingService.computeCost(model, isTrial);

    if (cost > 0) {
      const balance = await this.walletsService.getBalance(
        actor.workspaceId,
        actor.workspaceType,
        WalletType.CONSUMER,
      );
      if (balance < cost) {
        throw new BadRequestException(
          'Insufficient credits to perform prediction',
        );
      }
    }

    const { endpoint, headers } = await this.getContainerCallTarget(model);
    return { cost, providerSharePercent, endpoint, headers };
  }

  /** Marks a deployment as recently active for idle/eviction tracking. */
  async markActive(deploymentId: string): Promise<void> {
    await this.redisService.set(
      `model:last-active:${deploymentId}`,
      Date.now().toString(),
    );
  }

  /** Resolves the container-facing endpoint path and auth headers for a model. */
  private async getContainerCallTarget(
    model: Model,
  ): Promise<ContainerCallTarget> {
    const ownerApiKey = await this.apiKeyRepository.findOne({
      where: {
        user: { id: model.user.id },
        type: ApiKeyType.LIVE,
        isActive: true,
      },
    });
    const containerApiKey = ownerApiKey?.key || '';
    const endpoint =
      model.type === ModelType.LLM_GGUF ? '/v1/chat/completions' : '/predict';
    return {
      endpoint,
      headers: {
        Authorization: `Bearer ${containerApiKey}`,
        'x-api-key': containerApiKey,
      },
    };
  }
}
