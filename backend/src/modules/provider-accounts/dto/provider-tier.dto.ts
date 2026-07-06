import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpsertProviderTierDto {
  @IsString()
  code: string;

  @IsString()
  displayName: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsNumber()
  @Min(0)
  monthlyPriceEgp: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  annualPriceEgp?: number | null;

  @IsInt()
  @Min(0)
  @Max(100)
  platformCommissionPercent: number;

  @IsInt()
  @Min(0)
  @Max(100)
  providerSharePercent: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxModels?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxPublicModels?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxVersionsPerModel?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxLLMModels?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxVisionModels?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxNLPModels?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxTabularModels?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDiffusionModels?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxAudioModels?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxEmbeddingModels?: number | null;

  @IsBoolean()
  allowPrivateModels: boolean;

  @IsBoolean()
  allowCustomPricing: boolean;

  @IsBoolean()
  allowPriorityReview: boolean;

  @IsBoolean()
  allowOrgPublishing: boolean;

  @IsBoolean()
  allowDedicatedSupport: boolean;

  @IsBoolean()
  allowFeaturedPlacement: boolean;

  @IsBoolean()
  allowAdvancedAnalytics: boolean;

  @IsBoolean()
  isActive: boolean;

  @IsInt()
  sortOrder: number;
}
