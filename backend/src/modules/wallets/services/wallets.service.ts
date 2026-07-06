import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  ILike,
} from 'typeorm';
import { Wallet } from '../entities/wallet.entity';
import { Transaction } from '../entities/transaction.entity';
import { ProcessedWebhook } from '../entities/processed-webhook.entity';
import { SystemConfig } from '../entities/system-config.entity';
import { TransactionType } from '../enums/transaction-type.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { RedisService } from '../../../shared/redis/redis.service';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { OrgType } from '../../organizations/enums/org-type.enum';
import { OrgRole } from '../../../shared/enums/org-role.enum';
import { ApiKey } from '../../auth/entities/api-key.entity';

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
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepository: Repository<SystemConfig>,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => OrganizationsService))
    private readonly orgsService: OrganizationsService,
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
      currency: walletType === WalletType.PROVIDER ? 'EGP' : 'CREDITS',
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
   * Retrieves all wallets belonging to an organization after validating membership.
   *
   * @param orgId - Organization UUID.
   * @param userId - Requesting user UUID.
   * @returns Array of organization wallet records.
   * @throws {ForbiddenException} If the requester is not an organization member.
   */
  async getOrganizationWallets(
    orgId: string,
    userId: string,
  ): Promise<Wallet[]> {
    await this.assertBillingAccess(orgId, OwnerType.ORG, userId);

    return this.walletRepository.find({
      where: {
        ownerId: orgId,
        ownerType: OwnerType.ORG,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  /**
   * Enforces that organization billing data is visible only to workspace owners.
   * Personal wallets keep their existing authenticated-user behavior.
   *
   * @param ownerId - Workspace owner UUID.
   * @param ownerType - USER or ORG workspace type.
   * @param userId - Authenticated user UUID.
   */
  async assertBillingAccess(
    ownerId: string,
    ownerType: OwnerType,
    userId: string,
  ): Promise<void> {
    if (ownerType !== OwnerType.ORG) {
      return;
    }

    const memberRole = await this.orgsService.getMemberRole(ownerId, userId);
    if (!memberRole) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (memberRole !== OrgRole.OWNER) {
      throw new ForbiddenException(
        'Only organization owners can access billing data',
      );
    }
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

    let finalAmount = amount;
    let finalReference = reference;
    if (walletType === WalletType.CONSUMER) {
      // Input is EGP amount, convert to credits
      let config = await this.systemConfigRepository.findOne({
        where: { key: 'credits_per_egp' },
      });
      if (!config) {
        config = await this.systemConfigRepository.findOne({
          where: { key: 'credits_per_usd' },
        });
      }
      const creditsPerEgp = config ? parseInt(config.value, 10) || 10 : 10;
      finalAmount = amount * creditsPerEgp;
      finalReference = `${reference} (${finalAmount} credits purchased at ${creditsPerEgp} credits/EGP)`;
    }

    const currentBalance =
      typeof wallet.balance === 'string'
        ? parseFloat(wallet.balance)
        : wallet.balance;
    wallet.balance = currentBalance + finalAmount;
    const savedWallet = await this.walletRepository.save(wallet);

    // Save completed transaction record
    const transaction = this.transactionRepository.create({
      walletId: wallet.id,
      type: TransactionType.CREDIT,
      amount: finalAmount,
      reference: finalReference,
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
      where: { ownerId, ownerType, walletType: WalletType.PROVIDER },
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
    if (
      wallet.walletType === WalletType.PROVIDER &&
      wallet.currency !== 'EGP'
    ) {
      wallet.currency = 'EGP';
    }
    const savedWallet = await this.walletRepository.save(wallet);

    const transaction = this.transactionRepository.create({
      walletId: wallet.id,
      type: TransactionType.DEBIT,
      amount,
      reference:
        ownerType === OwnerType.ORG
          ? 'Organization provider wallet withdrawal'
          : 'User cash-out withdrawal',
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
    filters?: {
      type?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    },
  ): Promise<{
    success: boolean;
    data: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
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

    const where: any = { walletId: wallet.id };
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.startDate || filters?.endDate) {
      if (filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate);
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt = Between(start, end);
      } else if (filters.startDate) {
        where.createdAt = MoreThanOrEqual(new Date(filters.startDate));
      } else if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt = LessThanOrEqual(end);
      }
    }
    if (filters?.search) {
      where.reference = ILike(`%${filters.search}%`);
    }

    const [transactions, total] = await this.transactionRepository.findAndCount(
      {
        where,
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

    const metadata = sessionOrIntent.metadata as
      | Record<string, any>
      | undefined;
    if (!metadata) {
      return false;
    }

    // Handle Organization Creation Checkout Session
    if (metadata.type === 'org_creation') {
      const pendingId = metadata.pendingId;
      const ownerUserId = metadata.ownerUserId;

      if (!pendingId || !ownerUserId) {
        return false;
      }

      const cacheKey = `pending_org:${pendingId}`;
      const cachedDataStr = await this.redisService.get(cacheKey);
      if (!cachedDataStr) {
        throw new NotFoundException(
          `Pending organization data not found or expired in Redis: ${pendingId}`,
        );
      }

      const orgData = JSON.parse(cachedDataStr) as {
        name: string;
        slug?: string;
        type?: OrgType;
        description?: string;
        avatarUrl?: string;
        ownerUserId?: string;
        collaborators?: Array<{ email: string; role: OrgRole }>;
      };

      // Call createOrganization on OrganizationsService
      const organization = await this.orgsService.createOrganization(
        orgData.name,
        orgData.slug,
        ownerUserId,
        orgData.collaborators || [],
        orgData.type || OrgType.CONSUMER,
        orgData.description,
        orgData.avatarUrl,
        true, // isPaidViaStripe = true
        stripeEventId,
      );

      // Clean up cached key
      await this.redisService.del(cacheKey);
      await this.redisService.set(
        `completed_org:${pendingId}`,
        JSON.stringify({
          ownerUserId,
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          },
        }),
        3600,
      );

      return true;
    }

    let config = await this.systemConfigRepository.findOne({
      where: { key: 'credits_per_egp' },
    });
    if (!config) {
      config = await this.systemConfigRepository.findOne({
        where: { key: 'credits_per_usd' },
      });
    }
    const creditsPerEgp = config ? parseInt(config.value, 10) || 10 : 10;

    // 2. Handle Payment Intent Failures
    if (event.type === 'payment_intent.payment_failed') {
      let walletId = '';
      let credits = 0;
      let reference = '';

      if (metadata.walletId && metadata.credits) {
        walletId = metadata.walletId;
        credits = parseFloat(metadata.credits);
        reference = sessionOrIntent.id || 'Stripe package purchase failure';
      } else if (
        metadata.workspaceId &&
        metadata.workspaceType &&
        metadata.amount
      ) {
        const ownerId = metadata.workspaceId;
        const ownerType = metadata.workspaceType as OwnerType;
        const wallet = await this.walletRepository.findOne({
          where: { ownerId, ownerType, walletType: WalletType.CONSUMER },
        });
        if (wallet) {
          walletId = wallet.id;
        }
        const egpAmount = parseFloat(metadata.amount);
        credits = egpAmount * creditsPerEgp;
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
    let paymentId = '';

    // Handle package purchase checkout (Format B)
    if (metadata.walletId && metadata.credits) {
      const walletId = metadata.walletId;
      credits = parseFloat(metadata.credits);
      paymentId = String(sessionOrIntent.payment_intent || sessionOrIntent.id);
      reference = paymentId || 'Stripe package purchase';

      const wallet = await this.walletRepository.findOneBy({ id: walletId });
      if (!wallet) {
        throw new NotFoundException(
          `Target wallet with ID ${walletId} does not exist`,
        );
      }
      ownerId = wallet.ownerId;
      ownerType = wallet.ownerType;
      walletType = WalletType.CONSUMER;
    }
    // Handle custom top-up checkout (Format A)
    else if (
      metadata.workspaceId &&
      metadata.workspaceType &&
      metadata.amount
    ) {
      ownerId = metadata.workspaceId;
      ownerType = metadata.workspaceType as OwnerType;
      walletType = WalletType.CONSUMER; // Top-ups are deposited to consumer wallet
      const egpAmount = parseFloat(metadata.amount);
      credits = egpAmount * creditsPerEgp;
      paymentId = String(sessionOrIntent.payment_intent || sessionOrIntent.id);
      reference = `Stripe checkout deposit: ${paymentId} (${credits} credits purchased at ${creditsPerEgp} credits/EGP)`;
    } else {
      // Unknown metadata format or missing crucial fields
      return false;
    }

    if (isNaN(credits) || credits <= 0) {
      throw new BadRequestException('Deposit amount must be positive');
    }

    const paymentIdempotencyKey = paymentId ? `payment:${paymentId}` : '';
    if (paymentIdempotencyKey) {
      const alreadyCredited = await this.processedWebhookRepository.findOneBy({
        stripeEventId: paymentIdempotencyKey,
      });
      if (alreadyCredited) {
        return false;
      }
    }

    // Run database transaction to commit balance credit, transaction log, and processed webhook idempotency lock
    const queryRunner =
      this.walletRepository.manager.connection.createQueryRunner();
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

      if (paymentIdempotencyKey) {
        const processedPayment = queryRunner.manager.create(ProcessedWebhook, {
          stripeEventId: paymentIdempotencyKey,
          walletId: wallet.id,
        });
        await queryRunner.manager.save(ProcessedWebhook, processedPayment);
      }

      // 2. Perform atomic increment balance update
      const currentBalance =
        typeof wallet.balance === 'string'
          ? parseFloat(wallet.balance)
          : wallet.balance;
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

  /**
   * Retrieves the conversion rate of credits per one EGP from system config database.
   *
   * @returns A promise resolving to the credits per EGP multiplier.
   */
  async getCreditsPerEgp(): Promise<number> {
    let config = await this.systemConfigRepository.findOne({
      where: { key: 'credits_per_egp' },
    });
    if (!config) {
      config = await this.systemConfigRepository.findOne({
        where: { key: 'credits_per_usd' },
      });
    }
    return config ? parseInt(config.value, 10) || 10 : 10;
  }

  async getWalletAnalytics(
    ownerId: string,
    ownerType: OwnerType,
    walletType: WalletType,
  ): Promise<{
    dailyTransactions: { date: string; credits: number; debits: number }[];
    apiKeysUsage: {
      id: string;
      name: string;
      keyPrefix: string;
      modelName: string;
      maxDailySpendCredits: number | null;
      todaySpend: number;
      maxRequestsPerMinute: number | null;
    }[];
  }> {
    const wallet = await this.walletRepository.findOne({
      where: { ownerId, ownerType, walletType },
    });

    if (!wallet) {
      return { dailyTransactions: [], apiKeysUsage: [] };
    }

    // 1. Fetch daily transaction summaries for the last 30 days
    const rows: { date: string; type: TransactionType; total: string }[] = await this.transactionRepository
      .createQueryBuilder('tx')
      .select("DATE_TRUNC('day', tx.created_at)::text", 'date')
      .addSelect('tx.type', 'type')
      .addSelect('SUM(tx.amount)', 'total')
      .where('tx.wallet_id = :walletId', { walletId: wallet.id })
      .andWhere('tx.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere("tx.created_at >= NOW() - INTERVAL '30 days'")
      .groupBy("DATE_TRUNC('day', tx.created_at)")
      .addGroupBy('tx.type')
      .orderBy("DATE_TRUNC('day', tx.created_at)", 'ASC')
      .getRawMany();

    // Pivot by date
    const dailyMap = new Map<string, { date: string; credits: number; debits: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap.set(dateStr, { date: dateStr, credits: 0, debits: 0 });
    }

    for (const row of rows) {
      const dateStr = row.date.split(' ')[0];
      const entry = dailyMap.get(dateStr) || { date: dateStr, credits: 0, debits: 0 };
      const amount = parseFloat(row.total);
      if (row.type === TransactionType.CREDIT) {
        entry.credits = amount;
      } else if (row.type === TransactionType.DEBIT) {
        entry.debits = amount;
      }
      dailyMap.set(dateStr, entry);
    }

    const dailyTransactions = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 2. Fetch active API keys for this owner to check caps and today's spend
    const apiKeysUsage: any[] = [];
    if (ownerType === OwnerType.USER) {
      const apiKeys = await this.walletRepository.manager.getRepository(ApiKey).find({
        where: { user: { id: ownerId }, isActive: true },
        relations: ['model'],
      });

      const today = new Date().toISOString().slice(0, 10);
      for (const key of apiKeys) {
        const spendKey = `spend:${key.id}:${today}`;
        const rawSpend = await this.redisService.get(spendKey);
        const todaySpend = rawSpend ? parseFloat(rawSpend) : 0;

        apiKeysUsage.push({
          id: key.id,
          name: key.name,
          keyPrefix: key.key.slice(0, 12) + '...',
          modelName: key.model?.name || 'All Models',
          maxDailySpendCredits: key.maxDailySpendCredits ? parseFloat(key.maxDailySpendCredits as any) : null,
          todaySpend,
          maxRequestsPerMinute: key.maxRequestsPerMinute,
        });
      }
    }

    return { dailyTransactions, apiKeysUsage };
  }
}
