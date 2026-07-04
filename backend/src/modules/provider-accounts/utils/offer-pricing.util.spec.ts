import { OfferDiscountType } from '../enums/offer-discount-type.enum';
import { calculateOfferPricing } from './offer-pricing.util';

describe('calculateOfferPricing', () => {
  it('applies percentage discounts and rounds to EGP cents', () => {
    const pricing = calculateOfferPricing(
      199,
      OfferDiscountType.PERCENTAGE,
      12.5,
    );

    expect(pricing).toEqual({
      originalAmountEgp: 199,
      discountAmountEgp: 24.88,
      finalAmountEgp: 174.13,
    });
  });

  it('applies fixed discounts without allowing negative checkout totals', () => {
    const pricing = calculateOfferPricing(
      100,
      OfferDiscountType.FIXED_AMOUNT,
      250,
    );

    expect(pricing.discountAmountEgp).toBe(100);
    expect(pricing.finalAmountEgp).toBe(0);
  });
});
