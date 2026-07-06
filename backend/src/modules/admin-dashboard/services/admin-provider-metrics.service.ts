import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { Organization } from '../../organizations/entities/organization.entity';
import { Model } from '../../models/entities/model.entity';
import { ModelLog } from '../../models/entities/model-log.entity';
import {
  BillingCycle,
  ProviderAccount,
  ProviderAccountStatus,
  ProviderOfferRedemption,
} from '../../provider-accounts';
import { User } from '../../users/entities/user.entity';
import { Transaction } from '../../wallets/entities/transaction.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import {
  AdminProviderOwnerSummary,
  AdminProviderSubscriptionSnapshot,
} from '../types/admin-dashboard.types';
import { addBillingCycle } from '../utils/admin-period.util';

@Injectable()
export class AdminProviderMetricsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(Model)
    private readonly modelRepository: Repository<Model>,
    @InjectRepository(ModelLog)
    private readonly modelLogRepository: Repository<ModelLog>,
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(ProviderOfferRedemption)
    private readonly redemptionRepository: Repository<ProviderOfferRedemption>,
  ) {}

  async getOwnerSummaryMap(
    accounts: ProviderAccount[],
  ): Promise<Map<string, AdminProviderOwnerSummary>> {
    const userIds = accounts
      .filter((account) => account.ownerType === OwnerType.USER)
      .map((account) => account.ownerId);
    const orgIds = accounts
      .filter((account) => account.ownerType === OwnerType.ORG)
      .map((account) => account.ownerId);

    const users: User[] =
      userIds.length > 0
        ? await this.userRepository.findBy({ id: In(userIds) })
        : [];
    const organizations: Organization[] =
      orgIds.length > 0
        ? await this.organizationRepository.findBy({ id: In(orgIds) })
        : [];
    const ownerUsers = await this.userRepository.findBy({
      id: In(organizations.map((organization) => organization.createdBy)),
    });

    const userMap = new Map(users.map((user) => [user.id, user]));
    const organizationMap = new Map(
      organizations.map((organization) => [organization.id, organization]),
    );
    const ownerUserMap = new Map(ownerUsers.map((user) => [user.id, user]));

    return new Map(
      accounts.map((account) => {
        const user = userMap.get(account.ownerId);
        const organization = organizationMap.get(account.ownerId);
        const organizationOwner = organization
          ? ownerUserMap.get(organization.createdBy)
          : null;

        return [
          account.id,
          {
            ownerType: account.ownerType,
            ownerId: account.ownerId,
            ownerName: organization?.name ?? user?.fullName ?? account.ownerId,
            ownerEmail: organizationOwner?.email ?? user?.email ?? null,
          },
        ];
      }),
    );
  }

  async getModelMap(
    accounts: ProviderAccount[],
  ): Promise<Map<string, Model[]>> {
    const userIds = accounts
      .filter((account) => account.ownerType === OwnerType.USER)
      .map((account) => account.ownerId);
    const orgIds = accounts
      .filter((account) => account.ownerType === OwnerType.ORG)
      .map((account) => account.ownerId);

    const models = await this.modelRepository.find({
      where: [
        ...(userIds.length > 0 ? [{ user: { id: In(userIds) } }] : []),
        ...(orgIds.length > 0 ? [{ organization: { id: In(orgIds) } }] : []),
      ],
      relations: ['user', 'organization'],
      order: { createdAt: 'DESC' },
    });

    const ownerKeyToAccountId = new Map(
      accounts.map((account) => [
        `${account.ownerType}:${account.ownerId}`,
        account.id,
      ]),
    );
    const modelMap = new Map<string, Model[]>();
    for (const model of models) {
      const ownerKey = model.organization
        ? `ORG:${model.organization.id}`
        : `USER:${model.user.id}`;
      const accountId = ownerKeyToAccountId.get(ownerKey);
      if (!accountId) {
        continue;
      }
      const current = modelMap.get(accountId) ?? [];
      current.push(model);
      modelMap.set(accountId, current);
    }

    return modelMap;
  }

  async getModelLogMetricsMap(
    modelIds: string[],
  ): Promise<
    Map<string, { totalRequests: number; lastUsedAt: string | null }>
  > {
    if (modelIds.length === 0) {
      return new Map();
    }

    const rows = await this.modelLogRepository
      .createQueryBuilder('log')
      .select('model.id', 'modelId')
      .addSelect('COUNT(log.id)', 'totalRequests')
      .addSelect('MAX(log.created_at)', 'lastUsedAt')
      .innerJoin('log.model', 'model')
      .where('model.id IN (:...modelIds)', { modelIds })
      .groupBy('model.id')
      .getRawMany<{
        modelId: string;
        totalRequests: string;
        lastUsedAt: string | null;
      }>();

    return new Map(
      rows.map((row) => [
        row.modelId,
        {
          totalRequests: parseInt(row.totalRequests, 10) || 0,
          lastUsedAt: row.lastUsedAt,
        },
      ]),
    );
  }

  async getWalletBalanceMap(
    accounts: ProviderAccount[],
  ): Promise<Map<string, number>> {
    const ownerIds = accounts.map((account) => account.ownerId);
    const wallets = await this.walletRepository.find({
      where: { ownerId: In(ownerIds), walletType: WalletType.PROVIDER },
    });
    const walletMap = new Map(
      wallets.map((wallet) => [
        `${wallet.ownerType}:${wallet.ownerId}`,
        Number(wallet.balance ?? 0),
      ]),
    );

    return new Map(
      accounts.map((account) => [
        account.id,
        walletMap.get(`${account.ownerType}:${account.ownerId}`) ?? 0,
      ]),
    );
  }

  async getSubscriptionMap(
    accounts: ProviderAccount[],
  ): Promise<
    Map<string, AdminProviderSubscriptionSnapshot & { totalPaidEgp: number }>
  > {
    if (accounts.length === 0) {
      return new Map();
    }

    const references = accounts.map(
      (account) => `Provider tier subscription payment: ${account.id}`,
    );
    const [transactions, redemptions] = await Promise.all([
      this.transactionRepository.find({ where: { reference: In(references) } }),
      this.redemptionRepository.find({
        where: {
          providerAccount: { id: In(accounts.map((account) => account.id)) },
        },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const redemptionMap = new Map<string, ProviderOfferRedemption>();
    for (const redemption of redemptions) {
      if (!redemptionMap.has(redemption.providerAccount.id)) {
        redemptionMap.set(redemption.providerAccount.id, redemption);
      }
    }

    return new Map(
      accounts.map((account) => {
        const paymentRows = transactions
          .filter(
            (transaction) =>
              transaction.reference ===
              `Provider tier subscription payment: ${account.id}`,
          )
          .sort(
            (left, right) =>
              right.createdAt.getTime() - left.createdAt.getTime(),
          );
        const latestPayment = paymentRows[0] ?? null;
        const latestRedemption = redemptionMap.get(account.id) ?? null;
        const storedBillingCycle =
          account.subscriptionBillingCycle === BillingCycle.ANNUAL
            ? 'ANNUAL'
            : account.subscriptionBillingCycle === BillingCycle.MONTHLY
              ? 'MONTHLY'
              : null;
        const billingCycle =
          storedBillingCycle ??
          (latestRedemption?.billingCycle === BillingCycle.ANNUAL
            ? 'ANNUAL'
            : latestRedemption?.billingCycle === BillingCycle.MONTHLY
              ? 'MONTHLY'
              : null);
        const lastPaymentDate =
          account.lastSubscriptionPaymentAt ?? latestPayment?.createdAt ?? null;
        const nextRenewalDate =
          account.subscriptionExpiresAt ??
          (lastPaymentDate
            ? addBillingCycle(lastPaymentDate, billingCycle)
            : null);
        const isExpired =
          nextRenewalDate !== null && nextRenewalDate.getTime() <= Date.now();

        return [
          account.id,
          {
            status:
              account.status === ProviderAccountStatus.SUSPENDED
                ? 'SUSPENDED'
                : Number(account.tier?.monthlyPriceEgp ?? 0) === 0
                  ? 'FREE'
                  : latestPayment && !isExpired
                    ? 'ACTIVE'
                    : 'PENDING',
            billingCycle,
            lastPaymentDate: lastPaymentDate?.toISOString() ?? null,
            nextRenewalDate: nextRenewalDate?.toISOString() ?? null,
            lastPaymentAmountEgp: latestPayment
              ? Number(latestPayment.amount ?? 0)
              : null,
            totalPaidEgp: paymentRows.reduce(
              (sum, payment) => sum + Number(payment.amount ?? 0),
              0,
            ),
          },
        ];
      }),
    );
  }
}
