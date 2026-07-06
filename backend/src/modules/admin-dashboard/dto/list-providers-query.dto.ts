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
import { ProviderAccountStatus } from '../../provider-accounts';

export class ListProvidersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  tierId?: string;

  @IsOptional()
  @IsEnum(ProviderAccountStatus)
  providerStatus?: ProviderAccountStatus;

  @IsOptional()
  @IsEnum(OwnerType)
  ownerType?: OwnerType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasActiveSubscription?: boolean;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  revenueMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  revenueMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  modelCountMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  modelCountMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}
