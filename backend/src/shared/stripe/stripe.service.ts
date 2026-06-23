import { Injectable } from '@nestjs/common';
import Stripe = require('stripe');
import { OwnerType } from '../enums/owner-type.enum';

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
   * @param amount - The wallet credit count to purchase (in USD).
   * @param workspaceId - The target workspace UUID to credit.
   * @param workspaceType - The workspace type: USER or ORG.
   * @returns A promise resolving to the created Stripe Session object as a record.
   */
  async createCheckoutSession(
    amount: number,
    workspaceId: string,
    workspaceType: OwnerType,
  ): Promise<Record<string, unknown>> {
    const amountInCents = Math.round(amount * 100);
    const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/settings?status=success`;
    const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/settings?status=cancelled`;

    const stripeInstance = this.getStripe();
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
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
      metadata: {
        workspaceId,
        workspaceType,
        amount: amount.toString(),
      },
    });

    return session as unknown as Record<string, unknown>;
  }

  /**
   * Verifies the cryptographic signature of a Stripe webhook event.
   *
   * @param rawBody - The unparsed raw body Buffer.
   * @param signature - The stripe-signature header value.
   * @returns The parsed and verified Stripe Event as a record.
   * @throws {Error} If validation fails or webhook signature is invalid.
   */
  constructEvent(rawBody: Buffer, signature: string): Record<string, unknown> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    const stripeInstance = this.getStripe();
    const event = stripeInstance.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
    return event as unknown as Record<string, unknown>;
  }
}
