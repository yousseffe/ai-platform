import { ProviderAccount } from '../entities/provider-account.entity';
import { ProviderTierDefinition } from '../entities/provider-tier-definition.entity';
import { ProviderUtilizationService } from './provider-utilization.service';

describe('ProviderUtilizationService', () => {
  const service = new ProviderUtilizationService({} as never, {} as never);

  it('applies provider limit overrides over tier defaults', () => {
    const tier = {
      maxModels: 10,
      maxPublicModels: 5,
      maxVersionsPerModel: 4,
      maxLLMModels: 2,
      maxVisionModels: null,
      maxNLPModels: 3,
      maxTabularModels: 6,
      maxDiffusionModels: 1,
      maxAudioModels: null,
      maxEmbeddingModels: null,
      allowPrivateModels: true,
      allowCustomPricing: false,
      allowPriorityReview: false,
      allowOrgPublishing: false,
      allowDedicatedSupport: false,
      allowFeaturedPlacement: false,
      allowAdvancedAnalytics: false,
    } as ProviderTierDefinition;
    const account = {
      tier,
      customMaxModels: 2,
      customMaxPublicModels: null,
      customMaxVersionsPerModel: undefined,
      customMaxLLMModels: 1,
      customMaxVisionModels: undefined,
      customMaxNLPModels: undefined,
      customMaxTabularModels: undefined,
      customMaxDiffusionModels: undefined,
    } as unknown as ProviderAccount;

    const limits = service.resolveEffectiveLimits(account);

    expect(limits.maxModels).toBe(2);
    expect(limits.maxPublicModels).toBeNull();
    expect(limits.maxVersionsPerModel).toBe(4);
    expect(limits.maxLLMModels).toBe(1);
    expect(limits.maxVisionModels).toBeNull();
  });
});
