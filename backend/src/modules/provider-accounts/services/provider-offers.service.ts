import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { In } from 'typeorm';
import { UpsertProviderOfferDto } from '../dto/provider-offer.dto';
import { ProviderAccount } from '../entities/provider-account.entity';
import { ProviderOfferRedemption } from '../entities/provider-offer-redemption.entity';
import { ProviderOffer } from '../entities/provider-offer.entity';
import { ProviderTierDefinition } from '../entities/provider-tier-definition.entity';
import { BillingCycle } from '../enums/billing-cycle.enum';
import { OfferAppliesTo } from '../enums/offer-applies-to.enum';
import { ProviderEligibility } from '../enums/provider-eligibility.enum';
import { OfferPricingResult } from '../interfaces/offer-pricing.interface';
import { calculateOfferPricing } from '../utils/offer-pricing.util';

/**
 * Manages provider subscription offers, validation, pricing, and redemptions.
 */
@Injectable()
export class ProviderOffersService {
  constructor(
    @InjectRepository(ProviderOffer)
    private readonly offerRepository: Repository<ProviderOffer>,
    @InjectRepository(ProviderOfferRedemption)
    private readonly redemptionRepository: Repository<ProviderOfferRedemption>,
    @InjectRepository(ProviderTierDefinition)
    private readonly tierRepository: Repository<ProviderTierDefinition>,
  ) {}

  /**
   * Lists all admin-created offers.
   *
   * @returns Offer collection.
   */
  async listOffers(): Promise<ProviderOffer[]> {
    return this.offerRepository.find({
      relations: ['tiers'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves an offer by UUID for internal billing workflows.
   *
   * @param offerId - Offer UUID.
   * @returns Provider offer.
   */
  async getOfferById(offerId: string): Promise<ProviderOffer> {
    return this.getOffer(offerId);
  }

  /**
   * Creates a provider offer.
   *
   * @param dto - Offer creation payload.
   * @param createdBy - Admin user UUID.
   * @returns Created offer.
   */
  async createOffer(
    dto: UpsertProviderOfferDto,
    createdBy: string,
  ): Promise<ProviderOffer> {
    const offer = this.offerRepository.create({
      ...this.mapDto(dto),
      createdBy,
      tiers: await this.resolveOfferTiers(dto),
    });
    return this.offerRepository.save(offer);
  }

  /**
   * Updates an existing provider offer.
   *
   * @param offerId - Offer UUID.
   * @param dto - Offer update payload.
   * @returns Updated offer.
   */
  async updateOffer(
    offerId: string,
    dto: UpsertProviderOfferDto,
  ): Promise<ProviderOffer> {
    const offer = await this.getOffer(offerId);
    Object.assign(offer, this.mapDto(dto));
    offer.tiers = await this.resolveOfferTiers(dto);
    return this.offerRepository.save(offer);
  }

  /**
   * Toggles offer availability.
   *
   * @param offerId - Offer UUID.
   * @param isActive - Target active state.
   * @returns Updated offer.
   */
  async setOfferActive(
    offerId: string,
    isActive: boolean,
  ): Promise<ProviderOffer> {
    const offer = await this.getOffer(offerId);
    offer.isActive = isActive;
    return this.offerRepository.save(offer);
  }

  /**
   * Finds and validates an offer code for checkout.
   *
   * @param code - Offer code.
   * @param account - Provider account.
   * @param tier - Target tier.
   * @param billingCycle - Selected billing cycle.
   * @returns Valid offer.
   */
  async validateOfferCode(
    code: string,
    account: ProviderAccount,
    tier: ProviderTierDefinition,
    billingCycle: BillingCycle,
  ): Promise<ProviderOffer> {
    const offer = await this.offerRepository.findOne({
      where: { code: code.trim().toUpperCase() },
      relations: ['tiers'],
    });
    if (!offer) {
      throw new NotFoundException('Offer code not found');
    }
    await this.assertOfferCanApply(offer, account, tier, billingCycle);
    return offer;
  }

  /**
   * Applies a validated offer to an amount.
   *
   * @param originalAmountEgp - Original amount.
   * @param offer - Validated offer.
   * @returns Pricing result.
   */
  calculateDiscount(
    originalAmountEgp: number,
    offer: ProviderOffer | null,
  ): OfferPricingResult {
    if (!offer) {
      return {
        originalAmountEgp,
        discountAmountEgp: 0,
        finalAmountEgp: originalAmountEgp,
      };
    }
    return calculateOfferPricing(
      originalAmountEgp,
      offer.discountType,
      Number(offer.discountValue),
    );
  }

  /**
   * Logs a completed offer redemption.
   */
  async recordRedemption(params: {
    offer: ProviderOffer;
    providerAccount: ProviderAccount;
    tier: ProviderTierDefinition;
    billingCycle: BillingCycle;
    pricing: OfferPricingResult;
    paymentReference?: string | null;
  }): Promise<ProviderOfferRedemption> {
    if (params.paymentReference) {
      const existing = await this.redemptionRepository.findOne({
        where: { paymentReference: params.paymentReference },
      });
      if (existing) {
        return existing;
      }
    }

    const redemption = this.redemptionRepository.create({
      offer: params.offer,
      providerAccount: params.providerAccount,
      tier: params.tier,
      billingCycle: params.billingCycle,
      originalAmountEgp: params.pricing.originalAmountEgp,
      discountAmountEgp: params.pricing.discountAmountEgp,
      finalAmountEgp: params.pricing.finalAmountEgp,
      paymentReference: params.paymentReference ?? null,
    });
    return this.redemptionRepository.save(redemption);
  }

  /**
   * Retrieves an offer with tier relations.
   */
  private async getOffer(offerId: string): Promise<ProviderOffer> {
    const offer = await this.offerRepository.findOne({
      where: { id: offerId },
      relations: ['tiers'],
    });
    if (!offer) {
      throw new NotFoundException('Provider offer not found');
    }
    return offer;
  }

  /**
   * Validates offer business rules for a provider checkout.
   */
  private async assertOfferCanApply(
    offer: ProviderOffer,
    account: ProviderAccount,
    tier: ProviderTierDefinition,
    billingCycle: BillingCycle,
  ): Promise<void> {
    const now = new Date();
    if (!offer.isActive || offer.startDate > now || offer.endDate < now) {
      throw new BadRequestException('Offer is not active for the current date');
    }
    if (offer.billingCycle !== BillingCycle.BOTH && offer.billingCycle !== billingCycle) {
      throw new BadRequestException('Offer does not apply to this billing cycle');
    }
    if (offer.appliesTo === OfferAppliesTo.SPECIFIC_TIERS) {
      const appliesToTier = offer.tiers.some((candidate) => candidate.id === tier.id);
      if (!appliesToTier) {
        throw new BadRequestException('Offer does not apply to this tier');
      }
    }
    this.assertProviderEligibility(offer, account);
    await this.assertRedemptionLimits(offer, account);
  }

  /**
   * Validates new/existing provider eligibility rules.
   */
  private assertProviderEligibility(
    offer: ProviderOffer,
    account: ProviderAccount,
  ): void {
    const isNewProvider = !account.assignedAt;
    if (
      offer.providerEligibility === ProviderEligibility.NEW_PROVIDERS &&
      !isNewProvider
    ) {
      throw new BadRequestException('Offer applies only to new providers');
    }
    if (
      offer.providerEligibility === ProviderEligibility.EXISTING_PROVIDERS &&
      isNewProvider
    ) {
      throw new BadRequestException('Offer applies only to existing providers');
    }
  }

  /**
   * Validates global and per-provider redemption counts.
   */
  private async assertRedemptionLimits(
    offer: ProviderOffer,
    account: ProviderAccount,
  ): Promise<void> {
    if (offer.maxRedemptions !== null) {
      const totalRedemptions = await this.redemptionRepository.count({
        where: { offer: { id: offer.id } },
      });
      if (totalRedemptions >= offer.maxRedemptions) {
        throw new BadRequestException('Offer redemption limit reached');
      }
    }
    if (offer.maxRedemptionsPerProvider !== null) {
      const providerRedemptions = await this.redemptionRepository.count({
        where: {
          offer: { id: offer.id },
          providerAccount: { id: account.id },
        },
      });
      if (providerRedemptions >= offer.maxRedemptionsPerProvider) {
        throw new BadRequestException('Provider redemption limit reached');
      }
    }
  }

  /**
   * Resolves tier relations for an offer payload.
   */
  private async resolveOfferTiers(
    dto: UpsertProviderOfferDto,
  ): Promise<ProviderTierDefinition[]> {
    if (dto.appliesTo === OfferAppliesTo.ALL_TIERS) {
      return [];
    }
    const tierIds = dto.tierIds ?? [];
    if (tierIds.length === 0) {
      throw new BadRequestException('Specific tier offers require tierIds');
    }
    const tiers = await this.tierRepository.find({ where: { id: In(tierIds) } });
    if (tiers.length !== tierIds.length) {
      throw new BadRequestException('One or more offer tiers were not found');
    }
    return tiers;
  }

  /**
   * Normalizes offer DTO into entity fields.
   */
  private mapDto(dto: UpsertProviderOfferDto): Partial<ProviderOffer> {
    return {
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      code: dto.code?.trim().toUpperCase() || null,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      appliesTo: dto.appliesTo,
      billingCycle: dto.billingCycle,
      providerEligibility: dto.providerEligibility,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      maxRedemptions: dto.maxRedemptions ?? null,
      maxRedemptionsPerProvider: dto.maxRedemptionsPerProvider ?? null,
      isActive: dto.isActive,
    };
  }
}
