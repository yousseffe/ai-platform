import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
  BadRequestException,
  Headers,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceInterceptor } from '../../auth/guards/workspace.interceptor';
import { WalletsService } from '../services/wallets.service';
import { StripeService } from '../../../shared/stripe/stripe.service';
import { Request } from 'express';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';

/**
 * Controller exposing endpoints for wallet balances, mock fund additions,
 * Stripe checkout session generation, and Stripe webhook consumption.
 */
@Controller('wallets')
export class WalletsController {
  private readonly logger = new Logger(WalletsController.name);

  constructor(
    private readonly walletsService: WalletsService,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Retrieves the wallet balance for the current active workspace.
   *
   * @param req - Request envelope carrying resolved workspace parameters.
   * @param type - Query parameter specifying CONSUMER or PROVIDER wallet lookups.
   * @returns An object containing the decimal balance.
   */
  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  async getBalance(
    @Req()
    req: Record<string, unknown> & {
      workspaceId: string;
      workspaceType: OwnerType;
    },
    @Query('type') type: WalletType = WalletType.CONSUMER,
  ) {
    if (type !== WalletType.CONSUMER && type !== WalletType.PROVIDER) {
      throw new BadRequestException('Invalid wallet type');
    }

    const balance = await this.walletsService.getBalance(
      req.workspaceId,
      req.workspaceType,
      type,
    );

    return { balance };
  }

  /**
   * Mock endpoint allowing users to top up credits in their active workspace.
   *
   * @param req - Request envelope carrying resolved workspace parameters.
   * @param body - Post parameters containing the decimal value to append.
   * @returns The updated wallet.
   */
  @Post('add-funds')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  async addFunds(
    @Req()
    req: Record<string, unknown> & {
      workspaceId: string;
      workspaceType: OwnerType;
    },
    @Body() body: { amount: number; type?: WalletType },
  ) {
    const type = body.type || WalletType.CONSUMER;
    if (type !== WalletType.CONSUMER && type !== WalletType.PROVIDER) {
      throw new BadRequestException('Invalid wallet type');
    }

    return this.walletsService.addFunds(
      req.workspaceId,
      req.workspaceType,
      type,
      body.amount,
    );
  }

  /**
   * Generates a Stripe Checkout Session redirect URL for credit deposit.
   *
   * @param req - Request envelope carrying resolved workspace parameters.
   * @param body - Body containing deposit amount in USD.
   * @returns REDIRECT Stripe Checkout URL.
   */
  @Post('checkout-session')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  async createCheckoutSession(
    @Req()
    req: Record<string, unknown> & {
      workspaceId: string;
      workspaceType: OwnerType;
    },
    @Body() body: { amount: number },
  ) {
    if (!body.amount || body.amount < 5.0) {
      throw new BadRequestException('Minimum deposit amount is $5.00');
    }

    const session = await this.stripeService.createCheckoutSession(
      body.amount,
      req.workspaceId,
      req.workspaceType,
    );

    return { url: session.url };
  }

  /**
   * Stripe Webhook endpoint. Processes payment confirmation notifications asynchronously.
   *
   * @param signature - Signature value from Stripe-Signature header.
   * @param req - Express raw body request wrapper containing untouched payload buffer.
   * @returns Status receipt confirming receipt of webhook event.
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

    this.logger.log(`[Stripe Webhook Received] Event Type: ${event.type}`);

    try {
      const processed = await this.walletsService.processStripeWebhook(event);
      if (processed) {
        this.logger.log(`[Stripe Webhook Success] Processed event ID: ${event.id}`);
      } else {
        this.logger.log(`[Stripe Webhook Skipped/Duplicate] Event ID: ${event.id}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[Stripe Webhook Error] Failed to process event ${event.id}: ${message}`);
      throw new InternalServerErrorException(
        `Failed to process Stripe webhook: ${message}`,
      );
    }

    return { received: true };
  }

  /**
   * Withdraws funds from the active workspace's wallet.
   *
   * @param req - Request envelope carrying resolved workspace details.
   * @param body - Post parameters containing the amount to withdraw.
   * @returns The updated wallet balance config.
   */
  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  async withdraw(
    @Req()
    req: Record<string, unknown> & {
      workspaceId: string;
      workspaceType: OwnerType;
    },
    @Body() body: { amount: number },
  ) {
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('Amount to withdraw must be positive');
    }

    return this.walletsService.withdrawFunds(
      req.workspaceId,
      req.workspaceType,
      body.amount,
    );
  }

  /**
   * Retrieves the transaction history for the active workspace's wallet.
   *
   * @param req - Request envelope carrying resolved workspace details.
   * @param type - Query parameter specifying CONSUMER or PROVIDER wallet lookups.
   * @param page - Query page index selector.
   * @param limit - Count of items per page.
   * @returns Paginated transactions list.
   */
  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  async getTransactions(
    @Req()
    req: Record<string, unknown> & {
      workspaceId: string;
      workspaceType: OwnerType;
    },
    @Query('type') type: WalletType = WalletType.CONSUMER,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('txType') txType?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    if (type !== WalletType.CONSUMER && type !== WalletType.PROVIDER) {
      throw new BadRequestException('Invalid wallet type');
    }

    return this.walletsService.getTransactions(
      req.workspaceId,
      req.workspaceType,
      type,
      page,
      limit,
      {
        type: txType,
        status,
        startDate,
        endDate,
        search,
      },
    );
  }

  /**
   * Retrieves the current system configuration parameter for credits per EGP.
   *
   * @returns An object containing the credits per EGP multiplier.
   */
  @Get('config/credits-per-egp')
  @UseGuards(JwtAuthGuard)
  async getCreditsPerEgp() {
    const rate = await this.walletsService.getCreditsPerEgp();
    return { credits_per_egp: rate };
  }
}

