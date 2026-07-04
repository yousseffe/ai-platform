import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import {
  ProviderSubscriptionCheckoutDto,
  ProviderSubscriptionConfirmDto,
} from '../dto/provider-offer.dto';
import { ProviderAccount } from '../entities/provider-account.entity';
import { ProviderTierDefinition } from '../entities/provider-tier-definition.entity';
import { ProviderUtilization } from '../interfaces/provider-limits.interface';
import { ProviderAccountsService } from '../services/provider-accounts.service';
import { ProviderSubscriptionBillingService } from '../services/provider-subscription-billing.service';
import { ProviderTierService } from '../services/provider-tier.service';
import { ProviderUtilizationService } from '../services/provider-utilization.service';

/**
 * Authenticated provider-facing endpoints for tier subscription checkout.
 */
@Controller('provider-accounts')
@UseGuards(JwtAuthGuard)
export class ProviderAccountsController {
  constructor(
    private readonly providerAccountsService: ProviderAccountsService,
    private readonly subscriptionBillingService: ProviderSubscriptionBillingService,
    private readonly tierService: ProviderTierService,
    private readonly utilizationService: ProviderUtilizationService,
  ) {}

  /**
   * Returns the caller's provider account, active tier catalog, and utilization.
   */
  @Get('me')
  async getMyProviderAccount(
    @Req() req: { user: { id: string } },
  ): Promise<{
    account: ProviderAccount;
    tiers: ProviderTierDefinition[];
    utilization: ProviderUtilization;
  }> {
    const account = await this.providerAccountsService.ensureProviderAccount(
      OwnerType.USER,
      req.user.id,
      req.user.id,
    );
    const tiers = (await this.tierService.listTiers()).filter(
      (tier) => tier.isActive,
    );

    return {
      account,
      tiers,
      utilization: await this.utilizationService.getUtilization(account),
    };
  }

  /**
   * Creates a provider tier subscription checkout session.
   */
  @Post('subscription-checkout')
  async createSubscriptionCheckout(
    @Body() body: ProviderSubscriptionCheckoutDto,
    @Req() req: { user: { id: string } },
  ): Promise<{
    session: Record<string, unknown>;
    originalAmountEgp: number;
    discountAmountEgp: number;
    finalAmountEgp: number;
  }> {
    const account = await this.providerAccountsService.ensureProviderAccount(
      OwnerType.USER,
      req.user.id,
      req.user.id,
    );
    return this.subscriptionBillingService.createCheckoutSession({
      ...body,
      providerAccountId: account.id,
    });
  }

  /**
   * Confirms a provider subscription checkout after Stripe redirects back.
   */
  @Post('confirm-checkout')
  async confirmSubscriptionCheckout(
    @Body() body: ProviderSubscriptionConfirmDto,
    @Req() req: { user: { id: string } },
  ): Promise<{ success: boolean }> {
    const account = await this.providerAccountsService.ensureProviderAccount(
      OwnerType.USER,
      req.user.id,
      req.user.id,
    );
    await this.subscriptionBillingService.confirmCheckoutSession(
      body.sessionId,
      account.id,
    );
    return { success: true };
  }

  /**
   * Lists the caller's confirmed provider subscription payments.
   */
  @Get('subscription-payments')
  async listMySubscriptionPayments(
    @Req() req: { user: { id: string } },
  ): Promise<{
    data: Record<string, unknown>[];
    total: number;
    totalPaidEgp: number;
    subscription: Record<string, unknown>;
  }> {
    const account = await this.providerAccountsService.ensureProviderAccount(
      OwnerType.USER,
      req.user.id,
      req.user.id,
    );
    const result = await this.subscriptionBillingService.listSubscriptionPayments(
      account.id,
    );

    return {
      ...result,
      data: result.data.map((payment) => ({
        id: payment.id,
        type: payment.type,
        amount: Number(payment.amount),
        status: payment.status,
        reference: payment.reference,
        stripeEventId: payment.stripeEventId,
        createdAt: payment.createdAt,
      })),
    };
  }
}
