import { OfferDiscountType } from '../enums/offer-discount-type.enum';
import { OfferPricingResult } from '../interfaces/offer-pricing.interface';

/**
 * Applies an offer discount to an EGP amount without allowing negative totals.
 *
 * @param originalAmountEgp - Original checkout amount in EGP.
 * @param discountType - Discount mode.
 * @param discountValue - Percentage or fixed amount value.
 * @returns The calculated original, discount, and final amounts.
 */
export function calculateOfferPricing(
  originalAmountEgp: number,
  discountType: OfferDiscountType,
  discountValue: number,
): OfferPricingResult {
  const discountAmount =
    discountType === OfferDiscountType.PERCENTAGE
      ? originalAmountEgp * (discountValue / 100)
      : discountValue;
  const boundedDiscount = Math.min(Math.max(discountAmount, 0), originalAmountEgp);

  return {
    originalAmountEgp,
    discountAmountEgp: Number(boundedDiscount.toFixed(2)),
    finalAmountEgp: Number((originalAmountEgp - boundedDiscount).toFixed(2)),
  };
}
