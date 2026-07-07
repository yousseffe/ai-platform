import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { TransactionStatus } from '../../wallets/enums/transaction-status.enum';
import { TransactionType } from '../../wallets/enums/transaction-type.enum';
import { Transaction } from '../../wallets/entities/transaction.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';

const SYSTEM_OWNER_ID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class WalletLedgerService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async creditSystemRevenue(
    amountEgp: number,
    reference: string,
    stripeEventId?: string | null,
  ): Promise<Wallet> {
    return this.walletRepository.manager.transaction((manager) =>
      this.creditSystemRevenueWithManager(
        manager,
        amountEgp,
        reference,
        stripeEventId,
      ),
    );
  }

  async creditSystemRevenueWithManager(
    manager: EntityManager,
    amountEgp: number,
    reference: string,
    stripeEventId?: string | null,
  ): Promise<Wallet> {
    if (stripeEventId) {
      const existingTransaction = await manager.findOne(Transaction, {
        where: { stripeEventId },
      });
      if (existingTransaction) {
        const existingWallet = await manager.findOneBy(Wallet, {
          id: existingTransaction.walletId,
        });
        if (existingWallet) {
          return existingWallet;
        }
      }
    }

    let wallet = await manager.findOne(Wallet, {
      where: {
        ownerId: SYSTEM_OWNER_ID,
        ownerType: OwnerType.USER,
        walletType: WalletType.PROVIDER,
      },
    });
    if (!wallet) {
      wallet = manager.create(Wallet, {
        ownerId: SYSTEM_OWNER_ID,
        ownerType: OwnerType.USER,
        walletType: WalletType.PROVIDER,
        balance: 0,
        currency: 'EGP',
      });
      wallet = await manager.save(Wallet, wallet);
    }

    const currentBalance =
      typeof wallet.balance === 'string'
        ? parseFloat(wallet.balance)
        : wallet.balance;
    wallet.balance = currentBalance + amountEgp;
    const savedWallet = await manager.save(Wallet, wallet);

    await manager.save(
      Transaction,
      manager.create(Transaction, {
        walletId: savedWallet.id,
        type: TransactionType.CREDIT,
        amount: amountEgp,
        reference,
        stripeEventId: stripeEventId ?? null,
        status: TransactionStatus.COMPLETED,
      }),
    );

    return savedWallet;
  }
}
