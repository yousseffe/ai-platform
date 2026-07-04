import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Model } from '../models/entities/model.entity';
import { ModelVersion } from '../models/entities/model-version.entity';
import { WalletsModule } from '../wallets/wallets.module';
import { AuthModule } from '../auth/auth.module';
import { StripeModule } from '../../shared/stripe/stripe.module';
import { BillingModule } from '../billing/billing.module';
import { Transaction } from '../wallets/entities/transaction.entity';
import { ProviderAccountsAdminController } from './controllers/provider-accounts.admin.controller';
import { ProviderAccountsController } from './controllers/provider-accounts.controller';
import { ProviderSubscriptionWebhookController } from './controllers/provider-subscription-webhook.controller';
import { ProviderAccount } from './entities/provider-account.entity';
import { ProviderOfferRedemption } from './entities/provider-offer-redemption.entity';
import { ProviderOffer } from './entities/provider-offer.entity';
import { ProviderTierDefinition } from './entities/provider-tier-definition.entity';
import { ProviderAccountsService } from './services/provider-accounts.service';
import { ProviderLimitsService } from './services/provider-limits.service';
import { ProviderOffersService } from './services/provider-offers.service';
import { ProviderSubscriptionBillingService } from './services/provider-subscription-billing.service';
import { ProviderTierService } from './services/provider-tier.service';
import { ProviderUtilizationService } from './services/provider-utilization.service';

/**
 * Module owning provider accounts, tiers, offers, limits, and subscription checkout.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProviderAccount,
      ProviderTierDefinition,
      ProviderOffer,
      ProviderOfferRedemption,
      User,
      Model,
      ModelVersion,
      Transaction,
    ]),
    forwardRef(() => AuthModule),
    forwardRef(() => WalletsModule),
    StripeModule,
    BillingModule,
  ],
  controllers: [
    ProviderAccountsAdminController,
    ProviderAccountsController,
    ProviderSubscriptionWebhookController,
  ],
  providers: [
    ProviderAccountsService,
    ProviderTierService,
    ProviderLimitsService,
    ProviderUtilizationService,
    ProviderOffersService,
    ProviderSubscriptionBillingService,
  ],
  exports: [
    ProviderAccountsService,
    ProviderTierService,
    ProviderLimitsService,
    ProviderUtilizationService,
    ProviderOffersService,
  ],
})
export class ProviderAccountsModule {}
