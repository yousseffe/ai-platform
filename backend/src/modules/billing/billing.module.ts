import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../wallets/entities/transaction.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { WalletLedgerService } from './services/wallet-ledger.service';

/**
 * Billing module exposing shared ledger services for platform revenue flows.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Wallet, Transaction])],
  providers: [WalletLedgerService],
  exports: [WalletLedgerService],
})
export class BillingModule {}
