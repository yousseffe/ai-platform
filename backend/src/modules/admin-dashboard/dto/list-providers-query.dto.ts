import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { ProviderAccountStatus } from '../../provider-accounts/enums/provider-account-status.enum';

/**
 * Query parameters supported by the admin providers list endpoint.
 */
export class ListProvidersQueryDto {
  /** Free-text search against provider name/email/tier. */
  @IsOptional()
  @IsString()
  search?: string;

  /** Optional tier filter. */
  @IsOptional()
  @IsUUID()
  tierId?: string;

  /** Optional provider lifecycle filter. */
  @IsOptional()
  @IsEnum(ProviderAccountStatus)
  providerStatus?: ProviderAccountStatus;

  /** Optional owner type filter. */
  @IsOptional()
  @IsEnum(OwnerType)
  ownerType?: OwnerType;

  /** Restrict to providers with paid subscriptions. */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasActiveSubscription?: boolean;

  /** Created-at range lower bound. */
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  /** Created-at range upper bound. */
  @IsOptional()
  @IsDateString()
  toDate?: string;

  /** Minimum earnings filter. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  revenueMin?: number;

  /** Maximum earnings filter. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  revenueMax?: number;

  /** Minimum model count filter. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  modelCountMin?: number;

  /** Maximum model count filter. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  modelCountMax?: number;

  /** Requested page number. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  /** Requested page size. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
