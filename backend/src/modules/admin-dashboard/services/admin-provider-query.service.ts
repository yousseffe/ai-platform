import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { ModelType } from '../../models/enums/model-type.enum';
import { Model } from '../../models/entities/model.entity';
import { ProviderAccount } from '../../provider-accounts/entities/provider-account.entity';
import { ProviderAccountsService } from '../../provider-accounts/services/provider-accounts.service';
import { ProviderUtilizationService } from '../../provider-accounts/services/provider-utilization.service';
import { Transaction } from '../../wallets/entities/transaction.entity';
import { ListProvidersQueryDto } from '../dto/list-providers-query.dto';
import { AdminAuditLogService } from './admin-audit-log.service';
import { AdminProviderMetricsService } from './admin-provider-metrics.service';
import {
  AdminProviderDetailsResponse,
  AdminProviderListItem,
  AdminProvidersListResponse,
} from '../types/admin-dashboard.types';

@Injectable()
export class AdminProviderQueryService {
  constructor(
    @InjectRepository(ProviderAccount)
    private readonly providerAccountRepository: Repository<ProviderAccount>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly auditLogService: AdminAuditLogService,
    private readonly providerMetricsService: AdminProviderMetricsService,
    private readonly providerUtilizationService: ProviderUtilizationService,
    private readonly providerAccountsService: ProviderAccountsService,
  ) {}

  async listProviders(
    query: ListProvidersQueryDto,
  ): Promise<AdminProvidersListResponse> {
    const where: FindOptionsWhere<ProviderAccount> = {};
    if (query.tierId) {
      where.tier = { id: query.tierId } as ProviderAccount['tier'];
    }
    if (query.providerStatus) {
      where.status = query.providerStatus;
    }
    if (query.ownerType) {
      where.ownerType = query.ownerType;
    }
    if (query.fromDate && query.toDate) {
      where.createdAt = Between(
        new Date(query.fromDate),
        new Date(query.toDate),
      );
    }

    const accounts = await this.providerAccountRepository.find({
      where,
      relations: ['tier'],
      order: { createdAt: 'DESC' },
    });
    const normalizedAccounts = await Promise.all(
      accounts.map((account) =>
        this.providerAccountsService.getProviderAccount(account.id),
      ),
    );
    const rows = await this.buildListRows(normalizedAccounts);
    const filteredRows = rows.filter((row) => this.matchesFilters(row, query));
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    return {
      data: filteredRows.slice(offset, offset + limit),
      meta: {
        page,
        limit,
        total: filteredRows.length,
        totalPages: Math.max(Math.ceil(filteredRows.length / limit), 1),
      },
    };
  }

  /**
   * Returns the detailed admin provider payload for one provider account.
   *
   * @param providerAccountId - Target provider account UUID.
   * @returns Detailed provider response.
   */
  async getProviderDetails(
    providerAccountId: string,
  ): Promise<AdminProviderDetailsResponse> {
    const account = await this.providerAccountRepository.findOne({
      where: { id: providerAccountId },
      relations: ['tier'],
    });
    if (!account) {
      throw new NotFoundException('Provider account not found');
    }

    const normalizedAccount =
      await this.providerAccountsService.getProviderAccount(account.id);

    const [listRow] = await this.buildListRows([normalizedAccount]);
    const modelMap = await this.providerMetricsService.getModelMap([
      normalizedAccount,
    ]);
    const models = modelMap.get(account.id) ?? [];
    const logMetricsMap =
      await this.providerMetricsService.getModelLogMetricsMap(
        models.map((model) => model.id),
      );
    const recentTransactions =
      await this.listRecentTransactions(normalizedAccount);

    return {
      id: account.id,
      providerName: listRow.providerName,
      owner: listRow.owner,
      currentTier: listRow.currentTier,
      providerStatus: listRow.providerStatus,
      subscription: listRow.subscription,
      walletBalanceEgp: listRow.walletBalanceEgp,
      totalEarningsEgp: listRow.totalEarningsEgp,
      platformCommissionEgp: listRow.platformCommissionEgp,
      subscriptionRevenueEgp:
        (
          await this.providerMetricsService.getSubscriptionMap([
            normalizedAccount,
          ])
        ).get(normalizedAccount.id)?.totalPaidEgp ?? 0,
      totalInferenceRequests: models.reduce(
        (sum, model) => sum + (logMetricsMap.get(model.id)?.totalRequests ?? 0),
        0,
      ),
      lastActiveAt: this.resolveLastActiveAt(models, logMetricsMap),
      createdAt: account.createdAt.toISOString(),
      utilization: (await this.providerUtilizationService.getUtilization(
        normalizedAccount,
      )) as unknown as Record<
        string,
        { used: number; limit: number | null; remaining: number | null }
      >,
      models: models.map((model) => ({
        id: model.id,
        name: model.name,
        type: model.type,
        isPublic: model.isPublic,
        totalRequests: logMetricsMap.get(model.id)?.totalRequests ?? 0,
        revenueGeneratedEgp: Number(model.totalEarnings ?? 0),
        lastUsedAt: logMetricsMap.get(model.id)?.lastUsedAt ?? null,
        createdAt: model.createdAt.toISOString(),
      })),
      recentTransactions,
      auditLog: await this.auditLogService.listEntityAuditEvents(
        'PROVIDER_ACCOUNT',
        account.id,
      ),
      notes: normalizedAccount.notes,
      customNotes: normalizedAccount.customNotes,
    };
  }

  /**
   * Builds list rows by enriching provider accounts in batches.
   */
  private async buildListRows(
    accounts: ProviderAccount[],
  ): Promise<AdminProviderListItem[]> {
    const [ownerMap, modelMap, walletMap, subscriptionMap] = await Promise.all([
      this.providerMetricsService.getOwnerSummaryMap(accounts),
      this.providerMetricsService.getModelMap(accounts),
      this.providerMetricsService.getWalletBalanceMap(accounts),
      this.providerMetricsService.getSubscriptionMap(accounts),
    ]);

    return accounts.map((account) => {
      const models = modelMap.get(account.id) ?? [];
      const earnings = models.reduce(
        (sum, model) => sum + Number(model.totalEarnings ?? 0),
        0,
      );
      const commission = models.reduce(
        (sum, model) => sum + this.estimateCommission(model),
        0,
      );

      return {
        id: account.id,
        providerName: ownerMap.get(account.id)?.ownerName ?? account.ownerId,
        owner: ownerMap.get(account.id)!,
        currentTier: account.tier?.displayName ?? 'Unknown',
        providerStatus: account.status,
        subscription: subscriptionMap.get(account.id)!,
        walletBalanceEgp: walletMap.get(account.id) ?? 0,
        totalEarningsEgp: earnings,
        platformCommissionEgp: commission,
        totalModels: models.length,
        publicModels: models.filter((model) => model.isPublic).length,
        llmModels: models.filter((model) => model.type === ModelType.LLM_GGUF)
          .length,
        createdAt: account.createdAt.toISOString(),
      };
    });
  }

  /**
   * Filters a provider row using the requested list query.
   */
  private matchesFilters(
    row: AdminProviderListItem,
    query: ListProvidersQueryDto,
  ): boolean {
    const needle = query.search?.trim().toLowerCase();
    if (
      needle &&
      !`${row.providerName} ${row.owner.ownerEmail ?? ''} ${row.currentTier}`
        .toLowerCase()
        .includes(needle)
    ) {
      return false;
    }
    if (query.hasActiveSubscription && row.subscription.status !== 'ACTIVE') {
      return false;
    }
    if (
      query.revenueMin !== undefined &&
      row.totalEarningsEgp < query.revenueMin
    ) {
      return false;
    }
    if (
      query.revenueMax !== undefined &&
      row.totalEarningsEgp > query.revenueMax
    ) {
      return false;
    }
    if (
      query.modelCountMin !== undefined &&
      row.totalModels < query.modelCountMin
    ) {
      return false;
    }
    if (
      query.modelCountMax !== undefined &&
      row.totalModels > query.modelCountMax
    ) {
      return false;
    }
    return true;
  }

  /**
   * Estimates the platform commission generated by a model.
   */
  private estimateCommission(model: Model): number {
    const earnings = Number(model.totalEarnings ?? 0);
    const share = Number(model.providerSharePercent ?? 0);
    if (earnings <= 0 || share <= 0 || share >= 100) {
      return 0;
    }
    return Number(((earnings * (100 - share)) / share).toFixed(2));
  }

  private async listRecentTransactions(account: ProviderAccount) {
    const subscriptionReference = `Provider tier subscription payment: ${account.id}`;
    const transactions = await this.transactionRepository.find({
      where: [{ reference: subscriptionReference }],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: Number(transaction.amount ?? 0),
      currency: 'EGP',
      status: transaction.status,
      source: transaction.reference,
      createdAt: transaction.createdAt.toISOString(),
    }));
  }

  private resolveLastActiveAt(
    models: Model[],
    logMetricsMap: Map<
      string,
      { totalRequests: number; lastUsedAt: string | null }
    >,
  ): string | null {
    const lastUsedAt = models
      .map((model) => logMetricsMap.get(model.id)?.lastUsedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);

    return lastUsedAt ?? null;
  }
}
