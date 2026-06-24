import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { Transaction } from '../entities/transaction.entity';
import { ProcessedWebhook } from '../entities/processed-webhook.entity';
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
    @InjectRepository(ProcessedWebhook)
    private readonly processedWebhookRepository: Repository<ProcessedWebhook>,
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
    walletType = WalletType.CONSUMER; // Force unified wallet
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
    walletType = WalletType.CONSUMER; // Force unified wallet
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
    reference = 'Credit top-up deposit',
    stripeEventId?: string,
  ): Promise<Wallet> {
    walletType = WalletType.CONSUMER; // Force unified wallet
    if (amount <= 0) {
      throw new BadRequestException('Amount to add must be positive');
    }

    let wallet = await this.walletRepository.findOne({
      where: { ownerId, ownerType, walletType },
    });

    if (!wallet) {
      wallet = await this.createWallet(ownerId, ownerType, walletType, 0);
    }

    // Idempotency: verify if this Stripe event was already processed
    if (stripeEventId) {
      const existingTx = await this.transactionRepository.findOneBy({
        stripeEventId,
      });
      if (existingTx) {
        return wallet; // Skip duplicate processing
      }
    }

    const currentBalance =
      typeof wallet.balance === 'string'
        ? parseFloat(wallet.balance)
        : wallet.balance;
    wallet.balance = currentBalance + amount;
    const savedWallet = await this.walletRepository.save(wallet);

    // Save completed transaction record
    const transaction = this.transactionRepository.create({
      walletId: wallet.id,
      type: TransactionType.CREDIT,
      amount,
      reference,
      stripeEventId,
      status: TransactionStatus.COMPLETED,
    });
    await this.transactionRepository.save(transaction);

    return savedWallet;
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
    walletType = WalletType.CONSUMER; // Force unified wallet
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

  /**
   * Retrieves a paginated history list of transactions associated with a workspace wallet.
   *
   * @param ownerId - UUID of the owner (User or Organization).
   * @param ownerType - USER or ORG.
   * @param walletType - CONSUMER or PROVIDER.
   * @param page - Current page index (1-based).
   * @param limit - Count of items per page.
   * @returns Paginated list of ledger transaction records.
   */
  async getTransactions(
    ownerId: string,
    ownerType: OwnerType,
    walletType: WalletType,
    page = 1,
    limit = 20,
  ): Promise<{
    success: boolean;
    data: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    walletType = WalletType.CONSUMER; // Force unified wallet
    const wallet = await this.walletRepository.findOne({
      where: { ownerId, ownerType, walletType },
    });

    if (!wallet) {
      return {
        success: true,
        data: [],
        total: 0,
        page,
        limit,
      };
    }

    const pageNum =
      typeof page === 'string' ? parseInt(page, 10) : Number(page) || 1;
    const limitNum =
      typeof limit === 'string' ? parseInt(limit, 10) : Number(limit) || 20;

    const [transactions, total] = await this.transactionRepository.findAndCount(
      {
        where: { walletId: wallet.id },
        order: { createdAt: 'DESC' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      },
    );

    return {
      success: true,
      data: transactions,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  /**
   * Processes a verified Stripe Webhook event.
   * Handles both top-up and package purchases, and updates balances/transactions transactionally.
   *
   * @param event - The verified Stripe event payload.
   * @returns A promise resolving to a boolean indicating if processing was performed.
   */
  async processStripeWebhook(event: Record<string, any>): Promise<boolean> {
    const stripeEventId = event.id;
    if (!stripeEventId) {
      return false;
    }

    // 1. Idempotency Check: check if event was already processed
    const alreadyProcessed = await this.processedWebhookRepository.findOneBy({
      stripeEventId,
    });
    if (alreadyProcessed) {
      return false;
    }

    const acceptedEvents = [
      'checkout.session.completed',
      'payment_intent.succeeded',
      'charge.succeeded',
      'payment_intent.payment_failed',
    ];

    if (!acceptedEvents.includes(event.type)) {
      return false;
    }

    const sessionOrIntent = event.data?.object;
    if (!sessionOrIntent) {
      return false;
    }

    const metadata = sessionOrIntent.metadata as Record<string, any> | undefined;
    if (!metadata) {
      return false;
    }

    // 2. Handle Payment Intent Failures
    if (event.type === 'payment_intent.payment_failed') {
      let walletId = '';
      let credits = 0;
      let reference = '';

      if (metadata.walletId && metadata.credits) {
        walletId = metadata.walletId;
        credits = parseFloat(metadata.credits);
        reference = sessionOrIntent.id || 'Stripe package purchase failure';
      } else if (metadata.workspaceId && metadata.workspaceType && metadata.amount) {
        const ownerId = metadata.workspaceId;
        const ownerType = metadata.workspaceType as OwnerType;
        const wallet = await this.walletRepository.findOne({
          where: { ownerId, ownerType, walletType: WalletType.CONSUMER },
        });
        if (wallet) {
          walletId = wallet.id;
        }
        credits = parseFloat(metadata.amount);
        reference = `Stripe checkout deposit failure: ${sessionOrIntent.id}`;
      }

      if (walletId && !isNaN(credits) && credits > 0) {
        const transaction = this.transactionRepository.create({
          walletId,
          type: TransactionType.CREDIT,
          amount: credits,
          stripeEventId,
          reference,
          status: TransactionStatus.FAILED,
        });
        await this.transactionRepository.save(transaction);
        return true;
      }
      return false;
    }

    // 3. Process Successful Payments
    let ownerId = '';
    let ownerType: OwnerType = OwnerType.USER;
    let walletType: WalletType = WalletType.CONSUMER;
    let credits = 0;
    let reference = '';

    // Handle package purchase checkout (Format B)
    if (metadata.walletId && metadata.credits) {
      const walletId = metadata.walletId;
      credits = parseFloat(metadata.credits);
      reference = sessionOrIntent.payment_intent || sessionOrIntent.id || 'Stripe package purchase';

      const wallet = await this.walletRepository.findOneBy({ id: walletId });
      if (!wallet) {
        throw new NotFoundException(`Target wallet with ID ${walletId} does not exist`);
      }
      ownerId = wallet.ownerId;
      ownerType = wallet.ownerType;
      walletType = WalletType.CONSUMER; // Force unified CONSUMER wallet
    }
    // Handle custom top-up checkout (Format A)
    else if (metadata.workspaceId && metadata.workspaceType && metadata.amount) {
      ownerId = metadata.workspaceId;
      ownerType = metadata.workspaceType as OwnerType;
      walletType = WalletType.CONSUMER; // Top-ups are deposited to consumer wallet
      credits = parseFloat(metadata.amount);
      reference = `Stripe checkout deposit: ${sessionOrIntent.payment_intent || sessionOrIntent.id}`;
    } else {
      // Unknown metadata format or missing crucial fields
      return false;
    }

    if (isNaN(credits) || credits <= 0) {
      throw new BadRequestException('Deposit amount must be positive');
    }

    // Run database transaction to commit balance credit, transaction log, and processed webhook idempotency lock
    const queryRunner = this.walletRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Resolve or create wallet
      let wallet = await queryRunner.manager.findOne(Wallet, {
        where: { ownerId, ownerType, walletType },
      });

      if (!wallet) {
        wallet = queryRunner.manager.create(Wallet, {
          ownerId,
          ownerType,
          walletType,
          balance: 0,
        });
        wallet = await queryRunner.manager.save(Wallet, wallet);
      }

      // 1. Insert ProcessedWebhook first (guarantees db transaction uniqueness)
      const processed = queryRunner.manager.create(ProcessedWebhook, {
        stripeEventId,
        walletId: wallet.id,
      });
      await queryRunner.manager.save(ProcessedWebhook, processed);

      // 2. Perform atomic increment balance update
      const currentBalance = typeof wallet.balance === 'string' ? parseFloat(wallet.balance) : wallet.balance;
      wallet.balance = currentBalance + credits;
      await queryRunner.manager.save(Wallet, wallet);

      // 3. Save completed transaction record
      const transaction = queryRunner.manager.create(Transaction, {
        walletId: wallet.id,
        type: TransactionType.CREDIT,
        amount: credits,
        stripeEventId,
        reference,
        status: TransactionStatus.COMPLETED,
      });
      await queryRunner.manager.save(Transaction, transaction);

      await queryRunner.commitTransaction();
      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
