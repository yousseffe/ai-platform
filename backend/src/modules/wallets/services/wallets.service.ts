import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { Transaction } from '../entities/transaction.entity';
import { TransactionType } from '../enums/transaction-type.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';

/**
 * Service governing ledger balance operations, wallet initializations, additions, and deductions.
 */
@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  /**
   * Initializes a wallet ledger for a user or organization.
   *
   * @param ownerId - UUID of the owner.
   * @param ownerType - USER or ORG.
   * @param walletType - CONSUMER or PROVIDER.
   * @param initialBalance - Default credit value.
   * @returns Fully created Wallet entity.
   */
  async createWallet(
    ownerId: string,
    ownerType: OwnerType,
    walletType: WalletType,
    initialBalance = 0.0,
  ): Promise<Wallet> {
    const existing = await this.walletRepository.findOne({
      where: { ownerId, ownerType, walletType },
    });

    if (existing) {
      return existing;
    }

    const wallet = this.walletRepository.create({
      ownerId,
      ownerType,
      walletType,
      balance: initialBalance,
    });

    return this.walletRepository.save(wallet);
  }

  /**
   * Retrieves a wallet balance.
   *
   * @param ownerId - UUID of the owner.
   * @param ownerType - USER or ORG.
   * @param walletType - CONSUMER or PROVIDER.
   * @returns The balance value.
   */
  async getBalance(
    ownerId: string,
    ownerType: OwnerType,
    walletType: WalletType,
  ): Promise<number> {
    const wallet = await this.walletRepository.findOne({
      where: { ownerId, ownerType, walletType },
    });

    if (!wallet) {
      return 0.0;
    }

    // Convert decimal database string to float
    return typeof wallet.balance === 'string'
      ? parseFloat(wallet.balance)
      : wallet.balance;
  }

  /**
   * Appends funds to a wallet.
   *
   * @param ownerId - UUID of the owner.
   * @param ownerType - USER or ORG.
   * @param walletType - CONSUMER or PROVIDER.
   * @param amount - Funds value to add.
   * @returns Updated Wallet.
   */
  async addFunds(
    ownerId: string,
    ownerType: OwnerType,
    walletType: WalletType,
    amount: number,
  ): Promise<Wallet> {
    if (amount <= 0) {
      throw new BadRequestException('Amount to add must be positive');
    }

    let wallet = await this.walletRepository.findOne({
      where: { ownerId, ownerType, walletType },
    });

    if (!wallet) {
      wallet = await this.createWallet(ownerId, ownerType, walletType, 0);
    }

    const currentBalance =
      typeof wallet.balance === 'string'
        ? parseFloat(wallet.balance)
        : wallet.balance;
    wallet.balance = currentBalance + amount;
    return this.walletRepository.save(wallet);
  }

  /**
   * Deducts funds from a wallet.
   *
   * @param ownerId - UUID of the owner.
   * @param ownerType - USER or ORG.
   * @param walletType - CONSUMER or PROVIDER.
   * @param amount - Funds value to subtract.
   * @returns Updated Wallet.
   */
  async deductFunds(
    ownerId: string,
    ownerType: OwnerType,
    walletType: WalletType,
    amount: number,
  ): Promise<Wallet> {
    if (amount <= 0) {
      throw new BadRequestException('Amount to deduct must be positive');
    }

    const wallet = await this.walletRepository.findOne({
      where: { ownerId, ownerType, walletType },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const currentBalance =
      typeof wallet.balance === 'string'
        ? parseFloat(wallet.balance)
        : wallet.balance;
    if (currentBalance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    wallet.balance = currentBalance - amount;
    return this.walletRepository.save(wallet);
  }

  /**
   * Withdraws funds from the wallet and registers a DEBIT transaction.
   *
   * @param ownerId - Owner user/org UUID.
   * @param ownerType - USER or ORG.
   * @param amount - Capital amount to cash out.
   * @returns Updated Wallet configuration.
   */
  async withdrawFunds(
    ownerId: string,
    ownerType: OwnerType,
    amount: number,
  ): Promise<Wallet> {
    if (amount <= 0) {
      throw new BadRequestException('Amount to withdraw must be positive');
    }

    const wallet = await this.walletRepository.findOne({
      where: { ownerId, ownerType, walletType: WalletType.CONSUMER },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const currentBalance =
      typeof wallet.balance === 'string'
        ? parseFloat(wallet.balance)
        : wallet.balance;
    if (currentBalance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    wallet.balance = currentBalance - amount;
    const savedWallet = await this.walletRepository.save(wallet);

    const transaction = this.transactionRepository.create({
      walletId: wallet.id,
      type: TransactionType.DEBIT,
      amount,
      reference: 'User cash-out withdrawal',
      status: TransactionStatus.COMPLETED,
    });
    await this.transactionRepository.save(transaction);

    return savedWallet;
  }
}
