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
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StripeService } from '../../../shared/stripe/stripe.service';
import { WalletsService } from '../services/wallets.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { Request } from 'express';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { ProcessedWebhook } from '../entities/processed-webhook.entity';
import { Transaction } from '../entities/transaction.entity';
import { Wallet } from '../entities/wallet.entity';
import { TransactionType } from '../enums/transaction-type.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';

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
  constructor(
    private readonly walletsService: WalletsService,
    private readonly stripeService: StripeService,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
    @InjectRepository(ProcessedWebhook)
    private readonly processedWebhookRepository: Repository<ProcessedWebhook>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
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
            currency: 'usd',
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
   * Processes payment status events asynchronously with HMAC signature validation and database idempotency locks.
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
      throw new BadRequestException(
        `Webhook signature validation failed: ${message}`,
      );
    }

    const stripeEventId = event.id;

    // Idempotency: verify if event was already processed
    const alreadyProcessed = await this.processedWebhookRepository.findOneBy({
      stripeEventId,
    });
    if (alreadyProcessed) {
      return { received: true, duplicate: true };
    }

    // Handle payment_intent.succeeded or checkout.session.completed
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'payment_intent.succeeded'
    ) {
      let metadata: any = null;
      let referenceId = '';

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        metadata = session.metadata;
        referenceId = session.payment_intent || session.id;
      } else {
        const intent = event.data.object;
        metadata = intent.metadata;
        referenceId = intent.id;
      }

      if (metadata && metadata.walletId && metadata.credits) {
        const walletId = metadata.walletId;
        const credits = parseFloat(metadata.credits);

        const wallet = await this.walletRepository.findOneBy({ id: walletId });
        if (!wallet) {
          throw new InternalServerErrorException(
            'Target wallet does not exist',
          );
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          // 1. Insert ProcessedWebhook first (guarantees db transaction uniqueness)
          const processed = queryRunner.manager.create(ProcessedWebhook, {
            stripeEventId,
            walletId,
          });
          await queryRunner.manager.save(ProcessedWebhook, processed);

          // 2. Perform atomic increment balance update
          await queryRunner.manager.query(
            `UPDATE wallets SET balance = balance + $1 WHERE id = $2`,
            [credits, walletId],
          );

          // 3. Save completed transaction record
          const transaction = queryRunner.manager.create(Transaction, {
            walletId,
            type: TransactionType.CREDIT,
            amount: credits,
            stripeEventId,
            reference: referenceId,
            status: TransactionStatus.COMPLETED,
          });
          await queryRunner.manager.save(Transaction, transaction);

          await queryRunner.commitTransaction();

          console.log(
            `[Webhook Success] Credited ${credits} credits to wallet ID: ${walletId}`,
          );
        } catch (error) {
          await queryRunner.rollbackTransaction();
          console.error('[Webhook DB Error] Rollback transaction:', error);

          // Log failed transaction status in non-transactional way
          try {
            const failedTx = this.transactionRepository.create({
              walletId,
              type: TransactionType.CREDIT,
              amount: credits,
              stripeEventId,
              reference: referenceId,
              status: TransactionStatus.FAILED,
            });
            await this.transactionRepository.save(failedTx);
          } catch {}

          throw new InternalServerErrorException(
            'Wallet credit update database execution failed',
          );
        } finally {
          await queryRunner.release();
        }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object;
      const metadata = intent.metadata;

      if (metadata && metadata.walletId && metadata.credits) {
        const transaction = this.transactionRepository.create({
          walletId: metadata.walletId,
          type: TransactionType.CREDIT,
          amount: parseFloat(metadata.credits),
          stripeEventId,
          reference: intent.id,
          status: TransactionStatus.FAILED,
        });
        await this.transactionRepository.save(transaction);
        console.log(
          `[Webhook Payment Intent Failed] Logged transaction failure for wallet: ${metadata.walletId}`,
        );
      }
    }

    return { received: true };
  }
}
