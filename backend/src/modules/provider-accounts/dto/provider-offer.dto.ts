import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { BillingCycle } from '../enums/billing-cycle.enum';
import { OfferAppliesTo } from '../enums/offer-applies-to.enum';
import { OfferDiscountType } from '../enums/offer-discount-type.enum';
import { ProviderEligibility } from '../enums/provider-eligibility.enum';

export class UpsertProviderOfferDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  code?: string | null;

  @IsEnum(OfferDiscountType)
  discountType: OfferDiscountType;

  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsEnum(OfferAppliesTo)
  appliesTo: OfferAppliesTo;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  tierIds?: string[];

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsEnum(ProviderEligibility)
  providerEligibility: ProviderEligibility;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxRedemptions?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxRedemptionsPerProvider?: number | null;

  @IsBoolean()
  isActive: boolean;
}

export class ProviderSubscriptionCheckoutDto {
  @IsOptional()
  @IsUUID()
  providerAccountId?: string;

  @IsUUID()
  tierId: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsOptional()
  @IsString()
  offerCode?: string;
}

export class ProviderSubscriptionConfirmDto {
  @IsString()
  sessionId: string;
}

export class OfferPreviewDto {
  @IsUUID()
  providerAccountId: string;

  @IsUUID()
  tierId: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @IsString()
  code: string;
}
