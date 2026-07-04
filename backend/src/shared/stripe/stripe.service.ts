import { Injectable } from '@nestjs/common';
import Stripe = require('stripe');
import { OwnerType } from '../enums/owner-type.enum';

export type StripeWebhookKind = 'payments' | 'wallets';

/**
 * Service governing Stripe API integrations (checkout sessions and webhook validation).
 */
@Injectable()
export class StripeService {
  private stripe: InstanceType<typeof Stripe> | null = null;

  /**
   * Lazily initializes and returns the Stripe SDK instance.
   * Prevents app startup crashes when keys are not defined in .env.
   */
  private getStripe(): InstanceType<typeof Stripe> {
    if (this.stripe) {
      return this.stripe;
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is not defined in environment variables',
      );
    }

    this.stripe = new Stripe(secretKey, {
      // Allow Stripe to fallback to your account's default API version
    });

    return this.stripe;
  }

  /**
   * Generates a Stripe Checkout Session for a credit top-up purchase.
   *
   * @param amount - The wallet credit count to purchase (in EGP).
   * @param workspaceId - The target workspace UUID to credit.
   * @param workspaceType - The workspace type: USER or ORG.
   * @returns A promise resolving to the created Stripe Session object as a record.
   */
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
              name: 'ModelOps AI Credit Deposit',
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

  /**
   * Generates a Stripe Checkout Session for organization creation fee payment.
   *
   * @param amount - The organization creation fee amount (in EGP).
   * @param pendingId - The pending organization reference UUID.
   * @param ownerUserId - The owner user UUID.
   * @returns A promise resolving to the created Stripe Session object as a record.
   */
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
              name: 'ModelOps AI Organization Creation Fee',
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

  /**
   * Generates a Stripe Checkout Session for provider tier subscription payments.
   *
   * @param params - Provider subscription checkout parameters.
   * @returns A promise resolving to the created Stripe Session object.
   */
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
              name: `ModelOps Provider Tier: ${params.tierName}`,
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

  /**
   * Retrieves a Stripe Checkout Session by ID for post-redirect confirmation.
   *
   * @param sessionId - Stripe Checkout Session ID.
   * @returns Stripe Checkout Session record.
   */
  async retrieveCheckoutSession(
    sessionId: string,
  ): Promise<Record<string, unknown>> {
    const stripeInstance = this.getStripe();
    const session = await stripeInstance.checkout.sessions.retrieve(sessionId);
    return session as unknown as Record<string, unknown>;
  }

  /**
   * Verifies the cryptographic signature of a Stripe webhook event.
   *
   * @param rawBody - The unparsed raw body Buffer.
   * @param signature - The stripe-signature header value.
   * @param webhookKind - The Stripe webhook endpoint kind used to resolve the correct secret.
   * @returns The parsed and verified Stripe Event as a record.
   * @throws {Error} If validation fails or webhook signature is invalid.
   */
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

  /**
   * Resolves the Stripe webhook secret for a specific endpoint kind.
   *
   * @param webhookKind - The configured webhook endpoint group.
   * @returns The matching webhook signing secret.
   * @throws {Error} If the required secret is missing.
   */
  private getWebhookSecret(webhookKind: StripeWebhookKind): string {
    const secretMap: Record<StripeWebhookKind, string | undefined> = {
      payments: process.env.STRIPE_PAYMENTS_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET,
      wallets: process.env.STRIPE_WALLETS_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET,
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
