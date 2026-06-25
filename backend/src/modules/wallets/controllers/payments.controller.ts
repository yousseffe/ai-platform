import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UseGuards,
  RawBodyRequest,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StripeService } from '../../../shared/stripe/stripe.service';
import { WalletsService } from '../services/wallets.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { Request } from 'express';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { Wallet } from '../entities/wallet.entity';

const PACKAGES: Record<string, { credits: number; price: number }> = {
  pkg_starter: { credits: 100, price: 10.0 },
  pkg_pro: { credits: 500, price: 45.0 },
  pkg_team: { credits: 2000, price: 160.0 },
};

/**
 * Controller handling payments, checkouts, and Stripe webhooks.
 */
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly walletsService: WalletsService,
    private readonly stripeService: StripeService,
    private readonly redisService: RedisService,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
  ) {}

  /**
   * Generates a Stripe Checkout Session redirect URL for credit package purchases.
   * Enforces that checkout is only allowed for the personal consumer wallet.
   *
   * @param req - Request containing user details.
   * @param body - Body containing package_id.
   * @param idempotencyKey - X-Idempotency-Key header value.
   * @returns Redirect Stripe Checkout URL.
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(
    @Req() req: Record<string, unknown> & { user: { id: string } },
    @Body() body: { package_id: string },
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    if (!body.package_id) {
      throw new BadRequestException('package_id is required');
    }

    const pack = PACKAGES[body.package_id];
    if (!pack) {
      throw new NotFoundException('Credit package not found');
    }

    // Resolve user's personal CONSUMER wallet
    const personalWallet = await this.walletRepository.findOne({
      where: {
        ownerId: req.user.id,
        ownerType: OwnerType.USER,
        walletType: WalletType.CONSUMER,
      },
    });

    if (!personalWallet) {
      throw new InternalServerErrorException('User wallet not initialized');
    }

    // Idempotency: check if checkout session has already been generated
    if (idempotencyKey) {
      const cacheKey = `checkout:session:${idempotencyKey}`;
      const cachedUrl = await this.redisService.get(cacheKey);
      if (cachedUrl) {
        return { url: cachedUrl };
      }
    }

    // Call Stripe checkout session creation
    const stripeInstance = (this.stripeService as any).getStripe();
    const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/settings?status=success`;
    const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/settings?status=cancelled`;

    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'egp',
            product_data: {
              name: `MLHub ${body.package_id.replace('pkg_', '').toUpperCase()} Credit Package`,
              description: `Purchase of ${pack.credits} credits.`,
            },
            unit_amount: Math.round(pack.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: req.user.id,
        walletId: personalWallet.id,
        credits: pack.credits.toString(),
        packageId: body.package_id,
      },
    });

    if (idempotencyKey && session.url) {
      const cacheKey = `checkout:session:${idempotencyKey}`;
      await this.redisService.set(cacheKey, session.url, 3600); // cache for 1 hour
    }

    return { url: session.url };
  }

  /**
   * Stripe Webhook consumption endpoint.
   * Processes payment status events asynchronously with HMAC signature validation.
   *
   * @param signature - Signature from Stripe-Signature header.
   * @param req - Express raw body request wrapper.
   * @returns Confirmation indicator.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event;
    try {
      event = this.stripeService.constructEvent(
        req.rawBody as Buffer,
        signature,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Webhook signature validation failed: ${message}`);
      throw new BadRequestException(
        `Webhook signature validation failed: ${message}`,
      );
    }

    this.logger.log(`[Stripe Payments Webhook Received] Event Type: ${event.type}`);

    try {
      const processed = await this.walletsService.processStripeWebhook(event);
      if (processed) {
        this.logger.log(`[Stripe Payments Webhook Success] Processed event ID: ${event.id}`);
      } else {
        this.logger.log(`[Stripe Payments Webhook Skipped/Duplicate] Event ID: ${event.id}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[Stripe Payments Webhook Error] Failed to process event ${event.id}: ${message}`);
      throw new InternalServerErrorException(
        `Failed to process Stripe webhook: ${message}`,
      );
    }

    return { received: true };
  }
}
