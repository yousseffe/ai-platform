export type NullableLimit = number | null;

export interface EffectiveProviderLimits {
  maxModels: NullableLimit;
  maxPublicModels: NullableLimit;
  maxVersionsPerModel: NullableLimit;
  maxLLMModels: NullableLimit;
  maxVisionModels: NullableLimit;
  maxNLPModels: NullableLimit;
  maxTabularModels: NullableLimit;
  maxDiffusionModels: NullableLimit;
  maxAudioModels: NullableLimit;
  maxEmbeddingModels: NullableLimit;
  allowPrivateModels: boolean;
  allowCustomPricing: boolean;
  allowPriorityReview: boolean;
  allowOrgPublishing: boolean;
  allowDedicatedSupport: boolean;
  allowFeaturedPlacement: boolean;
  allowAdvancedAnalytics: boolean;
}

export interface LimitUtilization {
  used: number;
  limit: NullableLimit;
  remaining: NullableLimit;
}

export interface ProviderUtilization {
  totalModels: LimitUtilization;
  publicModels: LimitUtilization;
  llmModels: LimitUtilization;
  visionModels: LimitUtilization;
  nlpModels: LimitUtilization;
  tabularModels: LimitUtilization;
  diffusionModels: LimitUtilization;
  audioModels: LimitUtilization;
  embeddingModels: LimitUtilization;
}
