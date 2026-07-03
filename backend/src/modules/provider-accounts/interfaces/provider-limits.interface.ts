/**
 * Limit value where null means unlimited.
 */
export type NullableLimit = number | null;

/**
 * Effective provider limits after applying custom overrides over tier defaults.
 */
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

/**
 * Used/limit/remaining triplet displayed in admin and provider dashboards.
 */
export interface LimitUtilization {
  used: number;
  limit: NullableLimit;
  remaining: NullableLimit;
}

/**
 * Provider model usage grouped by supported limit dimensions.
 */
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
