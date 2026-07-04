import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { ProviderAccountStatus } from '../enums/provider-account-status.enum';

/**
 * Admin payload for creating or updating a provider account assignment.
 */
export class UpsertProviderAccountDto {
  /** Provider owner scope. */
  @IsEnum(OwnerType)
  ownerType: OwnerType;

  /** Provider owner UUID. */
  @IsUUID()
  ownerId: string;

  /** Tier definition UUID. */
  @IsUUID()
  tierId: string;

  /** Provider lifecycle status. */
  @IsOptional()
  @IsEnum(ProviderAccountStatus)
  status?: ProviderAccountStatus;

  /** Optional admin notes. */
  @IsOptional()
  @IsString()
  notes?: string | null;
}

/**
 * Admin payload for changing a provider account tier.
 */
export class ChangeProviderTierDto {
  /** Target tier UUID. */
  @IsUUID()
  tierId: string;

  /** Optional assignment notes. */
  @IsOptional()
  @IsString()
  notes?: string | null;
}

/**
 * Admin payload for changing provider account status.
 */
export class ChangeProviderStatusDto {
  /** Target provider status. */
  @IsEnum(ProviderAccountStatus)
  status: ProviderAccountStatus;

  /** Optional lifecycle notes. */
  @IsOptional()
  @IsString()
  notes?: string | null;
}

/**
 * Admin payload for provider-specific tier overrides.
 */
export class ProviderOverridesDto {
  /** Provider commission override percentage. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  customCommissionPercent?: number | null;

  /** Provider payout override percentage. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  customProviderSharePercent?: number | null;

  /** Total model limit override. */
  @IsOptional()
  @IsInt()
  @Min(0)
  customMaxModels?: number | null;

  /** Public model limit override. */
  @IsOptional()
  @IsInt()
  @Min(0)
  customMaxPublicModels?: number | null;

  /** Per-model version limit override. */
  @IsOptional()
  @IsInt()
  @Min(0)
  customMaxVersionsPerModel?: number | null;

  /** LLM model limit override. */
  @IsOptional()
  @IsInt()
  @Min(0)
  customMaxLLMModels?: number | null;

  /** Vision model limit override. */
  @IsOptional()
  @IsInt()
  @Min(0)
  customMaxVisionModels?: number | null;

  /** NLP model limit override. */
  @IsOptional()
  @IsInt()
  @Min(0)
  customMaxNLPModels?: number | null;

  /** Tabular model limit override. */
  @IsOptional()
  @IsInt()
  @Min(0)
  customMaxTabularModels?: number | null;

  /** Diffusion model limit override. */
  @IsOptional()
  @IsInt()
  @Min(0)
  customMaxDiffusionModels?: number | null;

  /** Human-readable override notes. */
  @IsOptional()
  @IsString()
  customNotes?: string | null;
}
