import { Injectable } from '@nestjs/common';
import Stripe = require('stripe');
import { OwnerType } from '../enums/owner-type.enum';

export type StripeWebhookKind = 'payments' | 'wallets';

@Injectable()
export class StripeService {
  private stripe: InstanceType<typeof Stripe> | null = null;

  public getStripe(): InstanceType<typeof Stripe> {
    if (this.stripe) {
      return this.stripe;
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is not defined in environment variables',
      );
    }

    this.stripe = new Stripe(secretKey, {});

    return this.stripe;
  }

  async createCheckoutSession(
    amount: number,
    workspaceId: string,
    workspaceType: OwnerType,
    returnPath = '/settings',
  ): Promise<Record<string, unknown>> {
    const amountInCents = Math.round(amount * 100);
    const safeReturnPath = returnPath.startsWith('/')
      ? returnPath
      : '/settings';
    const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}${safeReturnPath}?status=success`;
    const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}${safeReturnPath}?status=cancelled`;

    const stripeInstance = this.getStripe();
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'egp',
            product_data: {
              name: 'َQantara AI Credit Deposit',
              description: `Workspace ID: ${workspaceId}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_intent_data: {
        metadata: {
          workspaceId,
          workspaceType,
          amount: amount.toString(),
        },
      },
      metadata: {
        workspaceId,
        workspaceType,
        amount: amount.toString(),
      },
    });

    return session as unknown as Record<string, unknown>;
  }

  async createOrgCheckoutSession(
    amount: number,
    pendingId: string,
    ownerUserId: string,
  ): Promise<Record<string, unknown>> {
    const amountInCents = Math.round(amount * 100);
    const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard?status=org_success&pending_org=${pendingId}`;
    const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/workspaces/create?status=cancelled`;

    const stripeInstance = this.getStripe();
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'egp',
            product_data: {
              name: 'Qantara AI Organization Creation Fee',
              description: `Pending Org ID: ${pendingId}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        type: 'org_creation',
        pendingId,
        amount: amount.toString(),
        ownerUserId,
      },
    });

    return session as unknown as Record<string, unknown>;
  }

  async createProviderTierCheckoutSession(params: {
    providerAccountId: string;
    tierId: string;
    tierName: string;
    billingCycle: string;
    amountEgp: number;
    offerId?: string | null;
    discountAmountEgp?: number;
  }): Promise<Record<string, unknown>> {
    const stripeInstance = this.getStripe();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const successUrl = `${frontendUrl}/provider/subscriptions?status=provider_subscription_success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendUrl}/provider/subscriptions?status=provider_subscription_cancelled`;

    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'egp',
            product_data: {
              name: `Qantara Provider Tier: ${params.tierName}`,
              description: `${params.billingCycle} provider subscription`,
            },
            unit_amount: Math.round(params.amountEgp * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        type: 'provider_tier_subscription',
        providerAccountId: params.providerAccountId,
        tierId: params.tierId,
        billingCycle: params.billingCycle,
        amountEgp: params.amountEgp.toString(),
        offerId: params.offerId ?? '',
        discountAmountEgp: (params.discountAmountEgp ?? 0).toString(),
      },
    });

    return session as unknown as Record<string, unknown>;
  }

  async retrieveCheckoutSession(
    sessionId: string,
  ): Promise<Record<string, unknown>> {
    const stripeInstance = this.getStripe();
    const session = await stripeInstance.checkout.sessions.retrieve(sessionId);
    return session as unknown as Record<string, unknown>;
  }

  constructEvent(
    rawBody: Buffer,
    signature: string,
    webhookKind: StripeWebhookKind,
  ): Record<string, unknown> {
    const webhookSecret = this.getWebhookSecret(webhookKind);
    const stripeInstance = this.getStripe();
    const event = stripeInstance.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
    return event as unknown as Record<string, unknown>;
  }

  private getWebhookSecret(webhookKind: StripeWebhookKind): string {
    const secretMap: Record<StripeWebhookKind, string | undefined> = {
      payments:
        process.env.STRIPE_PAYMENTS_WEBHOOK_SECRET ||
        process.env.STRIPE_WEBHOOK_SECRET,
      wallets:
        process.env.STRIPE_WALLETS_WEBHOOK_SECRET ||
        process.env.STRIPE_WEBHOOK_SECRET,
    };

    const webhookSecret = secretMap[webhookKind];
    if (!webhookSecret) {
      throw new Error(
        `Stripe webhook secret is missing for "${webhookKind}" endpoint (checked STRIPE_PAYMENTS_WEBHOOK_SECRET, STRIPE_WALLETS_WEBHOOK_SECRET, and STRIPE_WEBHOOK_SECRET)`,
      );
    }

    return webhookSecret;
  }
}
