import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { ProviderAccountStatus } from '../enums/provider-account-status.enum';

export class UpsertProviderAccountDto {
  @IsEnum(OwnerType)
  ownerType: OwnerType;

  @IsUUID()
  ownerId: string;

  @IsUUID()
  tierId: string;

  @IsOptional()
  @IsEnum(ProviderAccountStatus)
  status?: ProviderAccountStatus;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class ChangeProviderTierDto {
  @IsUUID()
  tierId: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class ChangeProviderStatusDto {
  @IsEnum(ProviderAccountStatus)
  status: ProviderAccountStatus;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class ProviderOverridesDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  customCommissionPercent?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  customProviderSharePercent?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  customMaxModels?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  customMaxPublicModels?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  customMaxVersionsPerModel?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  customMaxLLMModels?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  customMaxVisionModels?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  customMaxNLPModels?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  customMaxTabularModels?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  customMaxDiffusionModels?: number | null;

  @IsOptional()
  @IsString()
  customNotes?: string | null;
}
