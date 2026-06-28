import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from './entities/transaction.entity';
import { ProcessedWebhook } from './entities/processed-webhook.entity';
import { SystemConfig } from './entities/system-config.entity';
import { WalletsService } from './services/wallets.service';
import { WalletsController } from './controllers/wallets.controller';
import { PaymentsController } from './controllers/payments.controller';
import { WalletController } from './controllers/wallet.controller';
import { StripeModule } from '../../shared/stripe/stripe.module';
import { OrganizationsModule } from '../organizations/organizations.module';

/**
 * Module responsible for ledger balance initializations and credit/revenue logic.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Wallet,
      Transaction,
      ProcessedWebhook,
      SystemConfig,
    ]),
    StripeModule,
    forwardRef(() => OrganizationsModule),
  ],
  providers: [WalletsService],
  controllers: [WalletsController, PaymentsController, WalletController],
  exports: [WalletsService, TypeOrmModule],
})
export class WalletsModule {}
