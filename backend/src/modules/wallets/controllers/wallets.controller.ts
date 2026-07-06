import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
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
import { WorkspaceInterceptor } from '../../../shared/interceptors/workspace.interceptor';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { WalletsService } from '../services/wallets.service';
import { StripeService } from '../../../shared/stripe/stripe.service';
import { Request } from 'express';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';

@Controller('wallets')
export class WalletsController {
  private readonly logger = new Logger(WalletsController.name);

  constructor(
    private readonly walletsService: WalletsService,
    private readonly stripeService: StripeService,
  ) {}

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  async getBalance(
    @Req()
    req: Record<string, unknown> & {
      user: { id: string };
      workspaceId: string;
      workspaceType: OwnerType;
    },
    @Query('type') type: WalletType = WalletType.CONSUMER,
  ) {
    if (type !== WalletType.CONSUMER && type !== WalletType.PROVIDER) {
      throw new BadRequestException('Invalid wallet type');
    }

    await this.walletsService.assertBillingAccess(
      req.workspaceId,
      req.workspaceType,
      req.user.id,
    );

    const balance = await this.walletsService.getBalance(
      req.workspaceId,
      req.workspaceType,
      type,
    );

    return { balance };
  }

  @Get('org/:orgId')
  @UseGuards(JwtAuthGuard)
  async getOrganizationWallets(
    @Param('orgId') orgId: string,
    @Req() req: Record<string, unknown> & { user: { id: string } },
  ) {
    return this.walletsService.getOrganizationWallets(orgId, req.user.id);
  }

  @Post('add-funds')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  async addFunds(
    @Req()
    req: Record<string, unknown> & {
      user: { id: string };
      workspaceId: string;
      workspaceType: OwnerType;
    },
    @Body() body: { amount: number; type?: WalletType },
  ) {
    const type = body.type || WalletType.CONSUMER;
    if (type !== WalletType.CONSUMER && type !== WalletType.PROVIDER) {
      throw new BadRequestException('Invalid wallet type');
    }

    await this.walletsService.assertBillingAccess(
      req.workspaceId,
      req.workspaceType,
      req.user.id,
    );

    return this.walletsService.addFunds(
      req.workspaceId,
      req.workspaceType,
      type,
      body.amount,
    );
  }

  @Post('checkout-session')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  async createCheckoutSession(
    @Req()
    req: Record<string, unknown> & {
      user: { id: string };
      workspaceId: string;
      workspaceType: OwnerType;
    },
    @Body() body: { amount: number; returnPath?: string },
  ) {
    if (!body.amount || body.amount < 5.0) {
      throw new BadRequestException('Minimum deposit amount is $5.00');
    }

    await this.walletsService.assertBillingAccess(
      req.workspaceId,
      req.workspaceType,
      req.user.id,
    );

    const session = await this.stripeService.createCheckoutSession(
      body.amount,
      req.workspaceId,
      req.workspaceType,
      body.returnPath,
    );

    return { url: session.url };
  }

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
        'wallets',
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
        this.logger.log(
          `[Stripe Webhook Success] Processed event ID: ${event.id}`,
        );
      } else {
        this.logger.log(
          `[Stripe Webhook Skipped/Duplicate] Event ID: ${event.id}`,
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[Stripe Webhook Error] Failed to process event ${event.id}: ${message}`,
      );
      throw new InternalServerErrorException(
        `Failed to process Stripe webhook: ${message}`,
      );
    }

    return { received: true };
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  async withdraw(
    @Req()
    req: Record<string, unknown> & {
      user: { id: string };
      workspaceId: string;
      workspaceType: OwnerType;
    },
    @Body() body: { amount: number },
  ) {
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('Amount to withdraw must be positive');
    }

    await this.walletsService.assertBillingAccess(
      req.workspaceId,
      req.workspaceType,
      req.user.id,
    );

    return this.walletsService.withdrawFunds(
      req.workspaceId,
      req.workspaceType,
      body.amount,
    );
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  async getTransactions(
    @Req()
    req: Record<string, unknown> & {
      user: { id: string };
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

    await this.walletsService.assertBillingAccess(
      req.workspaceId,
      req.workspaceType,
      req.user.id,
    );

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

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(WorkspaceInterceptor)
  async getAnalytics(
    @Req()
    req: Record<string, unknown> & {
      user: { id: string };
      workspaceId: string;
      workspaceType: OwnerType;
    },
    @Query('type') type: WalletType = WalletType.CONSUMER,
  ) {
    if (type !== WalletType.CONSUMER && type !== WalletType.PROVIDER) {
      throw new BadRequestException('Invalid wallet type');
    }

    await this.walletsService.assertBillingAccess(
      req.workspaceId,
      req.workspaceType,
      req.user.id,
    );

    return this.walletsService.getWalletAnalytics(
      req.workspaceId,
      req.workspaceType,
      type,
    );
  }

  @Get('config/credits-per-egp')
  @UseGuards(JwtAuthGuard)
  async getCreditsPerEgp() {
    const rate = await this.walletsService.getCreditsPerEgp();
    return { credits_per_egp: rate };
  }
}
