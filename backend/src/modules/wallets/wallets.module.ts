import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletsService } from './services/wallets.service';
import { WalletsController } from './controllers/wallets.controller';
import { StripeModule } from '../../shared/stripe/stripe.module';

/**
 * Module responsible for ledger balance initializations and credit/revenue logic.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet]),
    StripeModule,
  ],
  providers: [WalletsService],
  controllers: [WalletsController],
  exports: [WalletsService],
})
export class WalletsModule {}
