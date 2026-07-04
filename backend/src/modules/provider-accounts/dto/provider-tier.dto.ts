import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Admin payload used to create or update provider tier definitions.
 */
export class UpsertProviderTierDto {
  /** Stable admin-facing tier code. */
  @IsString()
  code: string;

  /** Human-readable tier label. */
  @IsString()
  displayName: string;

  /** Optional tier description. */
  @IsOptional()
  @IsString()
  description?: string | null;

  /** Monthly price in EGP. */
  @IsNumber()
  @Min(0)
  monthlyPriceEgp: number;

  /** Optional annual price in EGP. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualPriceEgp?: number | null;

  /** Platform commission percentage. */
  @IsInt()
  @Min(0)
  @Max(100)
  platformCommissionPercent: number;

  /** Provider payout percentage. */
  @IsInt()
  @Min(0)
  @Max(100)
  providerSharePercent: number;

  /** Total model limit, null means unlimited. */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxModels?: number | null;

  /** Public model limit, null means unlimited. */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxPublicModels?: number | null;

  /** Per-model version limit, null means unlimited. */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxVersionsPerModel?: number | null;

  /** LLM model limit, null means unlimited. */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxLLMModels?: number | null;

  /** Vision model limit, null means unlimited. */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxVisionModels?: number | null;

  /** NLP model limit, null means unlimited. */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxNLPModels?: number | null;

  /** Tabular model limit, null means unlimited. */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxTabularModels?: number | null;

  /** Diffusion model limit, null means unlimited. */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiffusionModels?: number | null;

  /** Audio model limit, null means unlimited. */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxAudioModels?: number | null;

  /** Embedding model limit, null means unlimited. */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxEmbeddingModels?: number | null;

  /** Whether private model visibility is included. */
  @IsBoolean()
  allowPrivateModels: boolean;

  /** Whether custom pricing is included. */
  @IsBoolean()
  allowCustomPricing: boolean;

  /** Whether priority review is included. */
  @IsBoolean()
  allowPriorityReview: boolean;

  /** Whether organization publishing is included. */
  @IsBoolean()
  allowOrgPublishing: boolean;

  /** Whether dedicated support is included. */
  @IsBoolean()
  allowDedicatedSupport: boolean;

  /** Whether featured placement is included. */
  @IsBoolean()
  allowFeaturedPlacement: boolean;

  /** Whether advanced analytics is included. */
  @IsBoolean()
  allowAdvancedAnalytics: boolean;

  /** Whether the tier can be assigned. */
  @IsBoolean()
  isActive: boolean;

  /** Admin ordering. */
  @IsInt()
  sortOrder: number;
}
