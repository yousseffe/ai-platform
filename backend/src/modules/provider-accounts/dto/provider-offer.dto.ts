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

/**
 * Admin payload for creating or updating provider subscription offers.
 */
export class UpsertProviderOfferDto {
  /** Offer title. */
  @IsString()
  title: string;

  /** Optional offer description. */
  @IsOptional()
  @IsString()
  description?: string | null;

  /** Optional redeemable offer code. */
  @IsOptional()
  @IsString()
  code?: string | null;

  /** Discount calculation mode. */
  @IsEnum(OfferDiscountType)
  discountType: OfferDiscountType;

  /** Discount percentage or fixed EGP amount. */
  @IsNumber()
  @Min(0)
  discountValue: number;

  /** Tier scope for this offer. */
  @IsEnum(OfferAppliesTo)
  appliesTo: OfferAppliesTo;

  /** Tier IDs used when appliesTo is SPECIFIC_TIERS. */
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  tierIds?: string[];

  /** Billing period targeted by the offer. */
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  /** Provider eligibility targeted by the offer. */
  @IsEnum(ProviderEligibility)
  providerEligibility: ProviderEligibility;

  /** Offer validity start timestamp. */
  @IsDateString()
  startDate: string;

  /** Offer validity end timestamp. */
  @IsDateString()
  endDate: string;

  /** Optional total redemption limit. */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxRedemptions?: number | null;

  /** Optional per-provider redemption limit. */
  @IsOptional()
  @IsInt()
  @Min(0)
  maxRedemptionsPerProvider?: number | null;

  /** Whether the offer is enabled. */
  @IsBoolean()
  isActive: boolean;
}

/**
 * Provider subscription checkout request payload.
 */
export class ProviderSubscriptionCheckoutDto {
  /** Provider account UUID. Server-side provider routes override this from JWT. */
  @IsOptional()
  @IsUUID()
  providerAccountId?: string;

  /** Tier definition UUID. */
  @IsUUID()
  tierId: string;

  /** Selected billing period. */
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  /** Optional discount code. */
  @IsOptional()
  @IsString()
  offerCode?: string;
}

/**
 * Provider subscription checkout confirmation payload.
 */
export class ProviderSubscriptionConfirmDto {
  /** Stripe Checkout Session ID returned in the success URL. */
  @IsString()
  sessionId: string;
}

/**
 * Offer validation request payload for pricing previews.
 */
export class OfferPreviewDto {
  /** Provider account UUID. */
  @IsUUID()
  providerAccountId: string;

  /** Tier definition UUID. */
  @IsUUID()
  tierId: string;

  /** Selected billing period. */
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  /** Offer code to validate. */
  @IsString()
  code: string;
}
