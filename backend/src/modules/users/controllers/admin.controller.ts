import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Query,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  In,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  ILike,
  FindOptionsWhere,
} from 'typeorm';
import { ApiKeyType } from '../../auth/enums/api-key-type.enum';
import { ApiKey } from '../../auth/entities/api-key.entity';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { Model } from '../../models/entities/model.entity';
import { ModelLog } from '../../models/entities/model-log.entity';
import { DeploymentStatus } from '../../deployments/enums/deployment-status.enum';
import { TransactionStatus } from '../../wallets/enums/transaction-status.enum';
import { TransactionType } from '../../wallets/enums/transaction-type.enum';
import { SystemConfig } from '../../wallets/entities/system-config.entity';
import { Transaction } from '../../wallets/entities/transaction.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { ProviderAccountStatus } from '../../provider-accounts/enums/provider-account-status.enum';
import { ProviderAccountsService } from '../../provider-accounts/services/provider-accounts.service';
import { User } from '../entities/user.entity';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import * as Docker from 'dockerode';
import { getDockerOptions } from '../../../shared/docker/docker.util';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  private readonly docker: Docker;
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Model)
    private readonly modelRepository: Repository<Model>,
    @InjectRepository(SystemConfig)
    private readonly systemConfigRepository: Repository<SystemConfig>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly providerAccountsService: ProviderAccountsService,
  ) {
    this.docker = new Docker(getDockerOptions());
  }

  private async enrichTransactions(transactions: Transaction[]): Promise<
    Array<
      Transaction & {
        walletType: WalletType | null;
        walletCurrency: string | null;
      }
    >
  > {
    const walletIds = [...new Set(transactions.map((tx) => tx.walletId))];
    if (walletIds.length === 0) {
      return transactions.map((tx) => ({
        ...tx,
        walletType: null,
        walletCurrency: null,
      }));
    }

    const wallets = await this.walletRepository.find({
      where: { id: In(walletIds) },
    });
    const walletMap = new Map(
      wallets.map((wallet) => [
        wallet.id,
        {
          walletType: wallet.walletType,
          walletCurrency: wallet.currency,
        },
      ]),
    );

    return transactions.map((tx) => {
      const walletMeta = walletMap.get(tx.walletId);
      return {
        ...tx,
        walletType: walletMeta?.walletType ?? null,
        walletCurrency: walletMeta?.walletCurrency ?? null,
      };
    });
  }

  @Get('models')
  async getModels() {
    const models = await this.modelRepository.find({
      relations: ['versions', 'versions.deployments', 'user'],
    });

    const result: Array<{
      id: string;
      name: string;
      description: string | null;
      tier: string;
      costPerRequest: number;
      providerSharePercent: number;
      status: string;
      port: number | null;
      cpu: string;
      ram: string;
      owner: string;
      isPublic: boolean;
    }> = [];

    for (const model of models) {
      const runningDeployment = model.versions
        .flatMap((v) => v.deployments || [])
        .find((d) => d.status === DeploymentStatus.RUNNING);

      let cpu = '0%';
      let ram = '0 MB';
      let status = 'INACTIVE';
      let port: number | null = null;

      if (runningDeployment) {
        status = 'ACTIVE';
        port = runningDeployment.port;

        if (runningDeployment.containerId) {
          try {
            const container = this.docker.getContainer(
              runningDeployment.containerId,
            );
            const stats = await container.stats({ stream: false });
            const cpuDelta =
              stats.cpu_stats.cpu_usage.total_usage -
              stats.precpu_stats.cpu_usage.total_usage;
            const systemDelta =
              stats.cpu_stats.system_cpu_usage -
              stats.precpu_stats.system_cpu_usage;
            const numCpus = stats.cpu_stats.online_cpus || 1;

            if (systemDelta > 0 && cpuDelta > 0) {
              cpu = ((cpuDelta / systemDelta) * numCpus * 100).toFixed(1) + '%';
            } else {
              cpu = '0.0%';
            }
            const usageBytes = stats.memory_stats.usage || 0;
            ram = (usageBytes / (1024 * 1024)).toFixed(0) + ' MB';
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(
              `Failed to collect Docker container stats: ${message}`,
            );
            cpu = '0.0%';
            ram = '0 MB';
          }
        } else {
          cpu = '0.0%';
          ram = '0 MB';
        }
      }

      result.push({
        id: model.id,
        name: model.name,
        description: model.description,
        tier: model.tier,
        costPerRequest: model.costPerRequest,
        providerSharePercent: model.providerSharePercent,
        status,
        port,
        cpu,
        ram,
        owner: model.user?.email || 'Unknown',
        isPublic: model.isPublic,
      });
    }

    return result;
  }

  @Patch('models/:id/pricing')
  async updateModelPricing(
    @Param('id') id: string,
    @Body()
    body: {
      costPerRequest: number;
      providerSharePercent: number;
    },
  ) {
    const model = await this.modelRepository.findOneBy({ id });
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    if (body.costPerRequest !== undefined) {
      if (body.costPerRequest < 0) {
        throw new BadRequestException('Cost per request cannot be negative');
      }
      model.costPerRequest = body.costPerRequest;
    }

    if (body.providerSharePercent !== undefined) {
      if (body.providerSharePercent < 0 || body.providerSharePercent > 100) {
        throw new BadRequestException(
          'Provider share percentage must be between 0 and 100',
        );
      }
      model.providerSharePercent = body.providerSharePercent;
    }

    model.hasCustomPricing = true;

    await this.modelRepository.save(model);
    return model;
  }

  @Get('config/org-creation-fee')
  async getOrgCreationFee() {
    const config = await this.systemConfigRepository.findOne({
      where: { key: 'org_creation_fee' },
    });
    return { fee: config ? parseFloat(config.value) : 50.0 };
  }

  @Patch('config/org-creation-fee')
  async updateOrgCreationFee(@Body() body: { fee: number }) {
    if (body.fee === undefined || body.fee < 0) {
      throw new BadRequestException('Invalid fee value');
    }

    let config = await this.systemConfigRepository.findOne({
      where: { key: 'org_creation_fee' },
    });

    if (!config) {
      config = this.systemConfigRepository.create({
        key: 'org_creation_fee',
        value: body.fee.toString(),
      });
    } else {
      config.value = body.fee.toString();
    }

    await this.systemConfigRepository.save(config);
    return { success: true, fee: body.fee };
  }

  @Get('config/pricing-defaults')
  async getPricingDefaults() {
    const configs = await this.systemConfigRepository.find();
    const configMap = new Map(configs.map((c) => [c.key, c.value]));

    const float = (key: string, fallback: number): number =>
      configMap.has(key) ? parseFloat(configMap.get(key)!) : fallback;
    const int = (key: string, fallback: number): number =>
      configMap.has(key) ? parseInt(configMap.get(key)!, 10) : fallback;

    return {
      price_tabular: float('price_tabular', 0.00005),
      price_nlp: float('price_nlp', 0.2),
      price_vision: float('price_vision', 0.01),
      price_diffusion: float('price_diffusion', 0.04),

      price_llm_gguf_input: float('price_llm_gguf_input', 2.0),
      price_llm_gguf_output: float('price_llm_gguf_output', 8.0),

      default_provider_share_percent: int('default_provider_share_percent', 80),
      playground_trial_limit: int('playground_trial_limit', 50),
      credits_per_egp: configMap.has('credits_per_egp')
        ? int('credits_per_egp', 10)
        : int('credits_per_usd', 10),

      commission_tier_free: int('commission_tier_free', 20),
      commission_tier_professional: int('commission_tier_professional', 15),
      commission_tier_enterprise: int('commission_tier_enterprise', 10),
    };
  }

  @Patch('config/pricing-defaults')
  async updatePricingDefaults(
    @Body()
    body: {
      price_tabular?: number;
      price_nlp?: number;
      price_vision?: number;
      price_llm_gguf_input?: number;
      price_llm_gguf_output?: number;
      price_diffusion?: number;
      default_provider_share_percent?: number;
      playground_trial_limit?: number;
      credits_per_egp?: number;
      commission_tier_free?: number;
      commission_tier_professional?: number;
      commission_tier_enterprise?: number;
    },
  ) {
    const entries = Object.entries(body) as [string, number | undefined][];
    for (const [key, val] of entries) {
      if (val === undefined || val < 0) {
        throw new BadRequestException(`Invalid value for config field: ${key}`);
      }

      let config = await this.systemConfigRepository.findOne({
        where: { key },
      });
      if (!config) {
        config = this.systemConfigRepository.create({
          key,
          value: val.toString(),
        });
      } else {
        config.value = val.toString();
      }
      await this.systemConfigRepository.save(config);
    }
    return { success: true };
  }

  @Get('stats')
  async getStats() {
    const totalUsers = await this.userRepository.count();
    const totalModels = await this.modelRepository.count();
    const totalOrgs = await this.dataSource.getRepository(Organization).count();

    const platformWallet = await this.walletRepository.findOne({
      where: {
        ownerId: '00000000-0000-0000-0000-000000000000',
        walletType: WalletType.PROVIDER,
      },
    });
    const platformBalance = platformWallet
      ? typeof platformWallet.balance === 'number'
        ? platformWallet.balance
        : parseFloat(platformWallet.balance) || 0.0
      : 0.0;
    const platformCurrency = platformWallet?.currency || 'EGP';

    const recentTransactions = await this.dataSource
      .getRepository(Transaction)
      .find({
        order: { createdAt: 'DESC' },
        take: 15,
      });
    const enrichedRecentTransactions =
      await this.enrichTransactions(recentTransactions);

    return {
      totalUsers,
      totalModels,
      totalOrgs,
      platformBalance,
      platformCurrency,
      recentTransactions: enrichedRecentTransactions,
    };
  }

  @Get('transactions')
  async getTransactions(
    @Query('page') page: number | string = 1,
    @Query('limit') limit: number | string = 20,
    @Query('scope') scope: 'ALL' | 'SYSTEM_REVENUE' = 'ALL',
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = typeof page === 'number' ? page : parseInt(page, 10) || 1;
    const limitNum =
      typeof limit === 'number' ? limit : parseInt(limit, 10) || 20;

    const where: FindOptionsWhere<Transaction> = {};

    if (scope === 'SYSTEM_REVENUE') {
      const platformWallets = await this.walletRepository.find({
        where: { ownerId: '00000000-0000-0000-0000-000000000000' },
      });
      const platformWalletIds = platformWallets.map((w) => w.id);
      if (platformWalletIds.length > 0) {
        where.walletId = In(platformWalletIds);
      } else {
        return {
          success: true,
          data: [],
          total: 0,
          page: pageNum,
          limit: limitNum,
        };
      }
    }

    if (
      type &&
      type !== 'ALL' &&
      Object.values(TransactionType).includes(type as TransactionType)
    ) {
      where.type = type as TransactionType;
    }

    if (startDate || endDate) {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt = Between(start, end);
      } else if (startDate) {
        where.createdAt = MoreThanOrEqual(new Date(startDate));
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt = LessThanOrEqual(end);
      }
    }

    if (search) {
      where.reference = ILike(`%${search}%`);
    }

    const [transactions, total] = await this.dataSource
      .getRepository(Transaction)
      .findAndCount({
        where,
        order: { createdAt: 'DESC' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      });
    const enrichedTransactions = await this.enrichTransactions(transactions);

    return {
      success: true,
      data: enrichedTransactions,
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  @Get('users')
  async getUsers() {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });

    const result: Array<{
      id: string;
      fullName: string;
      email: string;
      isAdmin: boolean;
      providerMode: boolean;
      createdAt: Date;
      consumerBalance: number;
      providerBalance: number;
      apiKey: string | null;
      models: Array<{
        id: string;
        name: string;
        framework: string;
        costPerRequest: number;
        isPublic: boolean;
      }>;
    }> = [];
    for (const user of users) {
      const consumerWallet = await this.walletRepository.findOne({
        where: {
          ownerId: user.id,
          ownerType: OwnerType.USER,
          walletType: WalletType.CONSUMER,
        },
      });
      const providerWallet = await this.walletRepository.findOne({
        where: {
          ownerId: user.id,
          ownerType: OwnerType.USER,
          walletType: WalletType.PROVIDER,
        },
      });

      const apiKeyEntity = await this.dataSource.getRepository(ApiKey).findOne({
        where: { user: { id: user.id }, type: ApiKeyType.LIVE, isActive: true },
      });

      const userModels = await this.dataSource.getRepository(Model).find({
        where: { user: { id: user.id } },
        order: { createdAt: 'DESC' },
      });

      result.push({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        isAdmin: user.isAdmin,
        providerMode: user.providerMode,
        createdAt: user.createdAt,
        consumerBalance: consumerWallet
          ? parseFloat(String(consumerWallet.balance)) || 0.0
          : 0.0,
        providerBalance: providerWallet
          ? parseFloat(String(providerWallet.balance)) || 0.0
          : 0.0,
        apiKey: apiKeyEntity
          ? apiKeyEntity.key.length > 15
            ? `${apiKeyEntity.key.slice(0, 11)}••••••••${apiKeyEntity.key.slice(-4)}`
            : apiKeyEntity.key
          : null,
        models: userModels.map((m) => ({
          id: m.id,
          name: m.name,
          framework: m.framework,
          costPerRequest:
            typeof m.costPerRequest === 'string'
              ? parseFloat(m.costPerRequest)
              : m.costPerRequest,
          isPublic: m.isPublic,
        })),
      });
    }

    return result;
  }

  @Get('users/:id')
  async getUserDetails(@Param('id') id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const consumerWallet = await this.walletRepository.findOne({
      where: {
        ownerId: user.id,
        ownerType: OwnerType.USER,
        walletType: WalletType.CONSUMER,
      },
    });

    const providerWallet = await this.walletRepository.findOne({
      where: {
        ownerId: user.id,
        ownerType: OwnerType.USER,
        walletType: WalletType.PROVIDER,
      },
    });

    const apiKeys = await this.dataSource.getRepository(ApiKey).find({
      where: { user: { id: user.id } },
      relations: ['model'],
      order: { createdAt: 'DESC' },
    });

    const userModels = await this.dataSource.getRepository(Model).find({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
    });

    const consumerStats = await this.dataSource
      .getRepository(ModelLog)
      .createQueryBuilder('log')
      .innerJoinAndSelect('log.model', 'model')
      .select('model.id', 'modelId')
      .addSelect('model.name', 'modelName')
      .addSelect('model.type', 'modelType')
      .addSelect('model.framework', 'modelFramework')
      .addSelect('model.cost_per_request', 'costPerRequest')
      .addSelect('COUNT(log.id)', 'callCount')
      .addSelect(
        "SUM(CASE WHEN log.status = 'SUCCESS' THEN model.cost_per_request ELSE 0 END)",
        'totalSpent',
      )
      .where('log.user_id = :userId', { userId: user.id })
      .groupBy('model.id')
      .addGroupBy('model.name')
      .addGroupBy('model.type')
      .addGroupBy('model.framework')
      .addGroupBy('model.cost_per_request')
      .getRawMany();

    const usageStats = consumerStats.map((s) => ({
      modelId: s.modelId,
      modelName: s.modelName,
      modelType: s.modelType,
      modelFramework: s.modelFramework,
      costPerRequest: parseFloat(s.costPerRequest || '0'),
      callCount: parseInt(s.callCount || '0', 10),
      totalSpent: parseFloat(s.totalSpent || '0'),
    }));

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      isAdmin: user.isAdmin,
      providerMode: user.providerMode,
      status: user.status,
      createdAt: user.createdAt,
      consumerBalance: consumerWallet
        ? typeof consumerWallet.balance === 'string'
          ? parseFloat(consumerWallet.balance)
          : Number(consumerWallet.balance) || 0.0
        : 0.0,
      providerBalance: providerWallet
        ? typeof providerWallet.balance === 'string'
          ? parseFloat(providerWallet.balance)
          : Number(providerWallet.balance) || 0.0
        : 0.0,
      apiKeys: apiKeys
        .filter((k) => k.model !== null)
        .map((k) => ({
          id: k.id,
          key:
            k.key && k.key.length > 15
              ? `${k.key.slice(0, 11)}••••••••${k.key.slice(-4)}`
              : k.key,
          name: k.name,
          type: k.type,
          isActive: k.isActive,
          createdAt: k.createdAt,
          model: k.model ? { id: k.model.id, name: k.model.name } : null,
        })),
      models: userModels.map((m) => ({
        id: m.id,
        name: m.name,
        framework: m.framework,
        costPerRequest:
          typeof m.costPerRequest === 'string'
            ? parseFloat(m.costPerRequest)
            : m.costPerRequest,
        isPublic: m.isPublic,
        createdAt: m.createdAt,
      })),
      usageStats,
    };
  }

  @Patch('users/:id/toggle-admin')
  async toggleAdmin(@Param('id') id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.isAdmin = !user.isAdmin;
    await this.userRepository.save(user);
    return { success: true, isAdmin: user.isAdmin };
  }

  @Patch('users/:id/toggle-provider')
  async toggleProvider(@Param('id') id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.providerMode = !user.providerMode;
    await this.userRepository.save(user);
    const account = await this.providerAccountsService.ensureProviderAccount(
      OwnerType.USER,
      user.id,
      null,
    );
    await this.providerAccountsService.changeStatus(account.id, {
      status: user.providerMode
        ? ProviderAccountStatus.ACTIVE
        : ProviderAccountStatus.SUSPENDED,
      notes: user.providerMode
        ? 'Provider mode activated by admin'
        : 'Provider mode deactivated by admin',
    });
    return { success: true, providerMode: user.providerMode };
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.email.toLowerCase().includes('admin')) {
      throw new BadRequestException('Cannot delete administrator user account');
    }
    await this.userRepository.remove(user);
    return { success: true };
  }

  @Post('users/:id/adjust-wallet')
  async adjustWallet(
    @Param('id') id: string,
    @Body()
    body: {
      walletType: WalletType;
      type: TransactionType;
      amount: number;
    },
  ) {
    const { walletType, type, amount } = body;
    if (amount === undefined || amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    if (type !== TransactionType.CREDIT && type !== TransactionType.DEBIT) {
      throw new BadRequestException('Adjustment type must be CREDIT or DEBIT');
    }
    if (
      walletType !== WalletType.CONSUMER &&
      walletType !== WalletType.PROVIDER
    ) {
      throw new BadRequestException('Wallet type must be CONSUMER or PROVIDER');
    }

    let wallet = await this.walletRepository.findOne({
      where: {
        ownerId: id,
        ownerType: OwnerType.USER,
        walletType,
      },
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        ownerId: id,
        ownerType: OwnerType.USER,
        walletType,
        balance: 0.0,
        currency: walletType === WalletType.CONSUMER ? 'CREDITS' : 'EGP',
      });
      wallet = await this.walletRepository.save(wallet);
    }

    const currentBalance =
      typeof wallet.balance === 'string'
        ? parseFloat(wallet.balance)
        : wallet.balance;

    if (type === TransactionType.DEBIT && currentBalance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    wallet.balance =
      type === TransactionType.CREDIT
        ? currentBalance + amount
        : currentBalance - amount;

    const savedWallet = await this.walletRepository.save(wallet);

    const transaction = this.dataSource.getRepository(Transaction).create({
      walletId: wallet.id,
      type,
      amount,
      reference: `Admin manual ${type.toLowerCase()} ledger adjustment`,
      status: TransactionStatus.COMPLETED,
    });
    await this.dataSource.getRepository(Transaction).save(transaction);

    return savedWallet;
  }
}
