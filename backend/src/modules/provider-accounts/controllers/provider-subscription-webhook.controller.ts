import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from '../../../shared/stripe/stripe.service';
import { ProviderSubscriptionBillingService } from '../services/provider-subscription-billing.service';

/**
 * Stripe webhook endpoint for provider tier subscription payment confirmation.
 */
@Controller('provider-accounts')
export class ProviderSubscriptionWebhookController {
  private readonly logger = new Logger(ProviderSubscriptionWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly subscriptionBillingService: ProviderSubscriptionBillingService,
  ) {}

  /**
   * Processes Stripe checkout completion events for provider subscriptions.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Record<string, unknown>;
    try {
      event = this.stripeService.constructEvent(
        req.rawBody as Buffer,
        signature,
        'payments',
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`Webhook signature validation failed: ${message}`);
    }

    try {
      await this.processEvent(event);
      return { received: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Provider subscription webhook failed: ${message}`);
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Routes supported Stripe events to subscription activation.
   */
  private async processEvent(event: Record<string, unknown>): Promise<void> {
    if (event.type !== 'checkout.session.completed') {
      return;
    }
    const data = event.data as Record<string, unknown> | undefined;
    const object = data?.object as Record<string, unknown> | undefined;
    const metadata = object?.metadata as Record<string, unknown> | undefined;
    if (!metadata || metadata.type !== 'provider_tier_subscription') {
      return;
    }
    await this.subscriptionBillingService.activateSubscriptionFromMetadata(
      metadata,
      String(object?.id ?? event.id ?? ''),
    );
  }
}
