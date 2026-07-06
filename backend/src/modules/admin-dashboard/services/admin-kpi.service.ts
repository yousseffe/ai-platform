import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { OrgStatus } from '../../organizations';
import { Organization } from '../../organizations/entities/organization.entity';
import { VersionReviewStatus } from '../../models';
import { Model } from '../../models/entities/model.entity';
import { ModelVersion } from '../../models/entities/model-version.entity';
import {
  ProviderAccount,
  ProviderAccountStatus,
} from '../../provider-accounts';
import { User } from '../../users/entities/user.entity';
import { TransactionStatus } from '../../wallets';
import { Transaction } from '../../wallets/entities/transaction.entity';
import {
  AdminDashboardOverview,
  AdminTopProvider,
} from '../types/admin-dashboard.types';
import {
  createMetricCard,
  createMonthlyPeriod,
} from '../utils/admin-period.util';

@Injectable()
export class AdminKpiService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(ProviderAccount)
    private readonly providerAccountRepository: Repository<ProviderAccount>,
    @InjectRepository(Model)
    private readonly modelRepository: Repository<Model>,
    @InjectRepository(ModelVersion)
    private readonly modelVersionRepository: Repository<ModelVersion>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async getOverview(): Promise<AdminDashboardOverview> {
    const now = new Date();
    const period = createMonthlyPeriod(now);
    const cards = await Promise.all([
      this.buildUserCards(period.currentStart),
      this.buildOrganizationCards(period.currentStart),
      this.buildProviderCards(period.currentStart),
      this.buildModelCards(period.currentStart),
      this.buildRevenueCards(period),
    ]).then((groups) => groups.flat());

    return {
      generatedAt: now.toISOString(),
      cards,
      topProviders: await this.getTopProviders(),
    };
  }

  private async buildUserCards(currentStart: Date) {
    const totalUsers = await this.userRepository.count();
    const newUsersThisMonth = await this.userRepository.count({
      where: { createdAt: MoreThanOrEqual(currentStart) },
    });
    const previousTotalUsers = totalUsers - newUsersThisMonth;
    const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const previousActiveSince = new Date(
      activeSince.getTime() - 30 * 24 * 60 * 60 * 1000,
    );
    const activeUsers = await this.userRepository.count({
      where: { lastLoginAt: MoreThanOrEqual(activeSince) },
    });
    const previousActiveUsers = await this.userRepository.count({
      where: {
        lastLoginAt: Between(previousActiveSince, currentStart),
      },
    });

    return [
      createMetricCard({
        key: 'total-users',
        label: 'Total Users',
        value: totalUsers,
        previousValue: Math.max(previousTotalUsers, 0),
        href: '/admin/users',
        format: 'number',
      }),
      createMetricCard({
        key: 'active-users',
        label: 'Active Users',
        value: activeUsers,
        previousValue: previousActiveUsers,
        href: '/admin/users',
        format: 'number',
      }),
      createMetricCard({
        key: 'new-users-month',
        label: 'New Users This Month',
        value: newUsersThisMonth,
        previousValue: 0,
        href: '/admin/users',
        format: 'number',
      }),
    ];
  }

  private async buildOrganizationCards(currentStart: Date) {
    const totalOrgs = await this.organizationRepository.count();
    const newOrganizationsThisMonth = await this.organizationRepository.count({
      where: { createdAt: MoreThanOrEqual(currentStart) },
    });
    const previousTotalOrgs = totalOrgs - newOrganizationsThisMonth;
    const activeOrganizations = await this.organizationRepository.count({
      where: { status: OrgStatus.ACTIVE },
    });

    return [
      createMetricCard({
        key: 'total-organizations',
        label: 'Total Organizations',
        value: totalOrgs,
        previousValue: Math.max(previousTotalOrgs, 0),
        href: '/admin/organizations',
        format: 'number',
      }),
      createMetricCard({
        key: 'active-organizations',
        label: 'Active Organizations',
        value: activeOrganizations,
        previousValue: Math.max(
          activeOrganizations - newOrganizationsThisMonth,
          0,
        ),
        href: '/admin/organizations',
        format: 'number',
      }),
    ];
  }

  private async buildProviderCards(currentStart: Date) {
    const accounts = await this.providerAccountRepository.find({
      relations: ['tier'],
    });
    const totalProviders = accounts.length;
    const subscribedProviders = accounts.filter(
      (account) =>
        account.status === ProviderAccountStatus.ACTIVE &&
        Number(account.tier?.monthlyPriceEgp ?? 0) > 0,
    ).length;
    const freeProviders = accounts.filter(
      (account) => Number(account.tier?.monthlyPriceEgp ?? 0) === 0,
    ).length;
    const suspendedProviders = accounts.filter(
      (account) => account.status === ProviderAccountStatus.SUSPENDED,
    ).length;
    const previousProviders = accounts.filter(
      (account) => account.createdAt < currentStart,
    ).length;

    return [
      createMetricCard({
        key: 'total-providers',
        label: 'Total Providers',
        value: totalProviders,
        previousValue: previousProviders,
        href: '/admin/providers',
        format: 'number',
      }),
      createMetricCard({
        key: 'subscribed-providers',
        label: 'Subscribed Providers',
        value: subscribedProviders,
        previousValue: Math.max(subscribedProviders - 1, 0),
        href: '/admin/providers',
        format: 'number',
      }),
      createMetricCard({
        key: 'free-providers',
        label: 'Free Providers',
        value: freeProviders,
        previousValue: Math.max(freeProviders - 1, 0),
        href: '/admin/providers',
        format: 'number',
      }),
      createMetricCard({
        key: 'suspended-providers',
        label: 'Suspended Providers',
        value: suspendedProviders,
        previousValue: Math.max(suspendedProviders - 1, 0),
        href: '/admin/providers',
        format: 'number',
      }),
    ];
  }

  private async buildModelCards(currentStart: Date) {
    const totalModels = await this.modelRepository.count();
    const newModelsThisMonth = await this.modelRepository.count({
      where: { createdAt: MoreThanOrEqual(currentStart) },
    });
    const previousTotalModels = totalModels - newModelsThisMonth;
    const publishedModels = await this.modelRepository.count({
      where: { isPublic: true },
    });
    const pendingReviewModels = await this.modelVersionRepository.count({
      where: { reviewStatus: VersionReviewStatus.PENDING },
    });

    return [
      createMetricCard({
        key: 'total-models',
        label: 'Total Models',
        value: totalModels,
        previousValue: Math.max(previousTotalModels, 0),
        href: '/admin/models',
        format: 'number',
      }),
      createMetricCard({
        key: 'published-models',
        label: 'Published Models',
        value: publishedModels,
        previousValue: Math.max(publishedModels - 1, 0),
        href: '/admin/models',
        format: 'number',
      }),
      createMetricCard({
        key: 'pending-review-models',
        label: 'Pending Review Models',
        value: pendingReviewModels,
        previousValue: Math.max(pendingReviewModels - 1, 0),
        href: '/admin/models',
        format: 'number',
      }),
    ];
  }

  private async buildRevenueCards(
    period: ReturnType<typeof createMonthlyPeriod>,
  ) {
    const transactions = await this.transactionRepository.find({
      where: { status: TransactionStatus.COMPLETED },
      order: { createdAt: 'DESC' },
    });
    const currentTransactions = transactions.filter(
      (transaction) => transaction.createdAt >= period.currentStart,
    );
    const previousTransactions = transactions.filter(
      (transaction) =>
        transaction.createdAt >= period.previousStart &&
        transaction.createdAt <= period.previousEnd,
    );

    const subscriptionMatcher = 'Provider tier subscription payment:';
    const providerSubscriptionRevenue = this.sumByReference(
      transactions,
      subscriptionMatcher,
    );
    const monthlyRecurringRevenue = this.sumByReference(
      currentTransactions,
      subscriptionMatcher,
    );
    const previousMrr = this.sumByReference(
      previousTransactions,
      subscriptionMatcher,
    );
    const platformCommission = this.sumByReference(
      transactions,
      'Platform commission for model:',
    );
    const inferenceProviderRevenue = this.sumByReference(
      transactions,
      'Inference revenue share for model:',
    );
    const inferenceRevenue = inferenceProviderRevenue + platformCommission;
    const failedPayments = await this.transactionRepository.count({
      where: { status: TransactionStatus.FAILED },
    });
    const refundedPayments = await this.transactionRepository.count({
      where: { reference: 'REFUND' as never },
    });

    return [
      createMetricCard({
        key: 'total-revenue',
        label: 'Total Revenue',
        value: providerSubscriptionRevenue + platformCommission,
        previousValue: previousMrr,
        href: '/admin/payments',
        format: 'currency',
      }),
      createMetricCard({
        key: 'monthly-recurring-revenue',
        label: 'Monthly Recurring Revenue',
        value: monthlyRecurringRevenue,
        previousValue: previousMrr,
        href: '/admin/subscriptions',
        format: 'currency',
      }),
      createMetricCard({
        key: 'provider-subscription-revenue',
        label: 'Provider Subscription Revenue',
        value: providerSubscriptionRevenue,
        previousValue: Math.max(
          providerSubscriptionRevenue - monthlyRecurringRevenue,
          0,
        ),
        href: '/admin/subscriptions',
        format: 'currency',
      }),
      createMetricCard({
        key: 'inference-revenue',
        label: 'Inference Revenue',
        value: inferenceRevenue,
        previousValue: Math.max(inferenceRevenue - platformCommission, 0),
        href: '/admin/analytics',
        format: 'currency',
      }),
      createMetricCard({
        key: 'platform-commission',
        label: 'Platform Commission',
        value: platformCommission,
        previousValue: Math.max(
          platformCommission -
            this.sumByReference(
              previousTransactions,
              'Platform commission for model:',
            ),
          0,
        ),
        href: '/admin/analytics',
        format: 'currency',
      }),
      createMetricCard({
        key: 'failed-payments',
        label: 'Failed Payments',
        value: failedPayments,
        previousValue: 0,
        href: '/admin/payments',
        format: 'number',
      }),
      createMetricCard({
        key: 'refunded-payments',
        label: 'Refunded Payments',
        value: refundedPayments,
        previousValue: 0,
        href: '/admin/payments',
        format: 'number',
      }),
      createMetricCard({
        key: 'total-transactions',
        label: 'Total Transactions',
        value: transactions.length,
        previousValue: Math.max(
          transactions.length - currentTransactions.length,
          0,
        ),
        href: '/admin/transactions',
        format: 'number',
      }),
    ];
  }

  private async getTopProviders(): Promise<AdminTopProvider[]> {
    const accounts = await this.providerAccountRepository.find({
      relations: ['tier'],
    });
    const models = await this.modelRepository.find({
      relations: ['user', 'organization'],
    });

    return accounts
      .map((account) => {
        const providerModels = models.filter((model) =>
          account.ownerType === OwnerType.ORG
            ? model.organization?.id === account.ownerId
            : model.user?.id === account.ownerId,
        );
        const totalEarnings = providerModels.reduce(
          (sum, model) => sum + Number(model.totalEarnings ?? 0),
          0,
        );

        return {
          id: account.id,
          name:
            providerModels[0]?.organization?.name ??
            providerModels[0]?.user?.fullName ??
            account.ownerId,
          totalEarnings,
          publicModels: providerModels.filter((model) => model.isPublic).length,
          tierName: account.tier?.displayName ?? 'Unknown',
        };
      })
      .sort((left, right) => right.totalEarnings - left.totalEarnings)
      .slice(0, 5);
  }

  private sumByReference(transactions: Transaction[], prefix: string): number {
    return transactions
      .filter(
        (transaction) => transaction.reference?.startsWith(prefix) === true,
      )
      .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
  }
}
