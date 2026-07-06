import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StripeService } from '../../../shared/stripe/stripe.service';
import { WalletLedgerService } from '../../billing';
import { Transaction } from '../../wallets/entities/transaction.entity';
import { ProviderSubscriptionCheckoutDto } from '../dto/provider-offer.dto';
import { ProviderTierDefinition } from '../entities/provider-tier-definition.entity';
import { BillingCycle } from '../enums/billing-cycle.enum';
import { ProviderAccountsService } from './provider-accounts.service';
import { ProviderOffersService } from './provider-offers.service';
import { ProviderTierService } from './provider-tier.service';

@Injectable()
export class ProviderSubscriptionBillingService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly providerAccountsService: ProviderAccountsService,
    private readonly tierService: ProviderTierService,
    private readonly offersService: ProviderOffersService,
    private readonly stripeService: StripeService,
    private readonly walletLedgerService: WalletLedgerService,
  ) {}

  async createCheckoutSession(dto: ProviderSubscriptionCheckoutDto): Promise<{
    session: Record<string, unknown>;
    originalAmountEgp: number;
    discountAmountEgp: number;
    finalAmountEgp: number;
  }> {
    if (!dto.providerAccountId) {
      throw new BadRequestException(
        'Provider account is required for checkout',
      );
    }
    const account = await this.providerAccountsService.getProviderAccount(
      dto.providerAccountId,
    );
    const tier = await this.tierService.getTier(dto.tierId);
    if (!tier.isActive) {
      throw new BadRequestException(
        'Cannot subscribe to an inactive provider tier',
      );
    }

    const originalAmount = this.resolveTierPrice(tier, dto.billingCycle);
    const offer = dto.offerCode
      ? await this.offersService.validateOfferCode(
          dto.offerCode,
          account,
          tier,
          dto.billingCycle,
        )
      : null;
    const pricing = this.offersService.calculateDiscount(originalAmount, offer);
    const session = await this.stripeService.createProviderTierCheckoutSession({
      providerAccountId: account.id,
      tierId: tier.id,
      tierName: tier.displayName,
      billingCycle: dto.billingCycle,
      amountEgp: pricing.finalAmountEgp,
      offerId: offer?.id ?? null,
      discountAmountEgp: pricing.discountAmountEgp,
    });

    return { session, ...pricing };
  }

  async listSubscriptionPayments(providerAccountId: string): Promise<{
    data: Transaction[];
    total: number;
    totalPaidEgp: number;
    subscription: {
      billingCycle: BillingCycle | null;
      startedAt: string | null;
      expiresAt: string | null;
      lastPaymentAt: string | null;
      status: 'FREE' | 'ACTIVE' | 'EXPIRED';
      daysRemaining: number | null;
    };
  }> {
    const account =
      await this.providerAccountsService.getProviderAccount(providerAccountId);
    const reference = this.getSubscriptionPaymentReference(providerAccountId);
    const [data, total] = await this.transactionRepository.findAndCount({
      where: { reference },
      order: { createdAt: 'DESC' },
    });
    const totalPaidEgp = data.reduce(
      (sum, tx) => sum + Number(tx.amount ?? 0),
      0,
    );

    return {
      data,
      total,
      totalPaidEgp,
      subscription: this.buildSubscriptionSnapshot(account),
    };
  }

  async activateSubscriptionFromMetadata(
    metadata: Record<string, unknown>,
    paymentReference: string,
  ): Promise<void> {
    const providerAccountId = String(metadata.providerAccountId ?? '');
    const tierId = String(metadata.tierId ?? '');
    const billingCycle = String(
      metadata.billingCycle ?? BillingCycle.MONTHLY,
    ) as BillingCycle;
    const offerId = String(metadata.offerId ?? '');
    const discountAmountEgp = Number(metadata.discountAmountEgp ?? 0);
    const amountEgp = Number(metadata.amountEgp ?? 0);
    if (!providerAccountId || !tierId || amountEgp < 0) {
      throw new BadRequestException('Invalid provider subscription metadata');
    }
    if (paymentReference) {
      const existingPayment = await this.transactionRepository.findOne({
        where: { stripeEventId: paymentReference },
      });
      if (existingPayment) {
        return;
      }
    }

    const tier = await this.tierService.getTier(tierId);
    const account = await this.providerAccountsService.activatePaidSubscription(
      providerAccountId,
      tier,
      billingCycle,
    );
    await this.walletLedgerService.creditSystemRevenue(
      amountEgp,
      this.getSubscriptionPaymentReference(providerAccountId),
      paymentReference,
    );
    if (offerId) {
      const offer = await this.offersService.getOfferById(offerId);
      await this.offersService.recordRedemption({
        offer,
        providerAccount: account,
        tier,
        billingCycle,
        pricing: {
          originalAmountEgp: amountEgp + discountAmountEgp,
          discountAmountEgp,
          finalAmountEgp: amountEgp,
        },
        paymentReference,
      });
    }
  }

  async confirmCheckoutSession(
    sessionId: string,
    expectedProviderAccountId: string,
  ): Promise<void> {
    const session = await this.stripeService.retrieveCheckoutSession(sessionId);
    const metadata = session.metadata as Record<string, unknown> | undefined;
    if (!metadata || metadata.type !== 'provider_tier_subscription') {
      throw new BadRequestException(
        'Checkout session is not a provider subscription',
      );
    }
    if (metadata.providerAccountId !== expectedProviderAccountId) {
      throw new BadRequestException(
        'Checkout session does not belong to this provider',
      );
    }
    if (session.payment_status !== 'paid') {
      throw new BadRequestException(
        'Checkout session payment is not completed',
      );
    }

    await this.activateSubscriptionFromMetadata(metadata, String(session.id));
  }

  private resolveTierPrice(
    tier: ProviderTierDefinition,
    billingCycle: BillingCycle,
  ): number {
    if (billingCycle === BillingCycle.ANNUAL) {
      return Number(tier.annualPriceEgp ?? tier.monthlyPriceEgp * 12);
    }
    if (billingCycle === BillingCycle.MONTHLY) {
      return Number(tier.monthlyPriceEgp);
    }
    throw new BadRequestException(
      'Provider subscription must be monthly or annual',
    );
  }

  private getSubscriptionPaymentReference(providerAccountId: string): string {
    return `Provider tier subscription payment: ${providerAccountId}`;
  }

  private buildSubscriptionSnapshot(
    account: Awaited<ReturnType<ProviderAccountsService['getProviderAccount']>>,
  ): {
    billingCycle: BillingCycle | null;
    startedAt: string | null;
    expiresAt: string | null;
    lastPaymentAt: string | null;
    status: 'FREE' | 'ACTIVE' | 'EXPIRED';
    daysRemaining: number | null;
  } {
    const now = Date.now();
    const expiresAt = account.subscriptionExpiresAt;
    const isPaidTier = Number(account.tier?.monthlyPriceEgp ?? 0) > 0;
    const isExpired = Boolean(expiresAt && expiresAt.getTime() <= now);
    const daysRemaining =
      expiresAt && !isExpired
        ? Math.ceil((expiresAt.getTime() - now) / 86_400_000)
        : null;

    return {
      billingCycle: account.subscriptionBillingCycle,
      startedAt: account.subscriptionStartedAt?.toISOString() ?? null,
      expiresAt: expiresAt?.toISOString() ?? null,
      lastPaymentAt: account.lastSubscriptionPaymentAt?.toISOString() ?? null,
      status:
        isPaidTier && !isExpired ? 'ACTIVE' : isExpired ? 'EXPIRED' : 'FREE',
      daysRemaining,
    };
  }
}
