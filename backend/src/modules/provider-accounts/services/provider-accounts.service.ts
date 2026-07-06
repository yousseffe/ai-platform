import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { WalletsService } from '../../wallets';
import {
  ChangeProviderStatusDto,
  ChangeProviderTierDto,
  ProviderOverridesDto,
  UpsertProviderAccountDto,
} from '../dto/provider-account.dto';
import { ProviderAccount } from '../entities/provider-account.entity';
import { ProviderTierDefinition } from '../entities/provider-tier-definition.entity';
import { BillingCycle } from '../enums/billing-cycle.enum';
import { ProviderAccountStatus } from '../enums/provider-account-status.enum';
import { ProviderTierService } from './provider-tier.service';

@Injectable()
export class ProviderAccountsService {
  constructor(
    @InjectRepository(ProviderAccount)
    private readonly providerAccountRepository: Repository<ProviderAccount>,
    private readonly tierService: ProviderTierService,
    @Inject(forwardRef(() => WalletsService))
    private readonly walletsService: WalletsService,
  ) {}

  async listProviderAccounts(): Promise<ProviderAccount[]> {
    const accounts = await this.providerAccountRepository.find({
      order: { createdAt: 'DESC' },
    });
    return Promise.all(
      accounts.map((account) => this.applyExpiredSubscription(account)),
    );
  }

  async getProviderAccount(
    providerAccountId: string,
  ): Promise<ProviderAccount> {
    const account = await this.providerAccountRepository.findOne({
      where: { id: providerAccountId },
    });
    if (!account) {
      throw new NotFoundException('Provider account not found');
    }
    return this.applyExpiredSubscription(account);
  }

  async findByOwner(
    ownerType: OwnerType,
    ownerId: string,
  ): Promise<ProviderAccount | null> {
    const account = await this.providerAccountRepository.findOne({
      where: { ownerType, ownerId },
    });
    return account ? this.applyExpiredSubscription(account) : null;
  }

  async upsertProviderAccount(
    dto: UpsertProviderAccountDto,
    assignedBy: string | null,
  ): Promise<ProviderAccount> {
    const tier = await this.tierService.getTier(dto.tierId);
    if (!tier.isActive) {
      throw new BadRequestException('Cannot assign an inactive provider tier');
    }
    let account = await this.findByOwner(dto.ownerType, dto.ownerId);
    if (!account) {
      account = this.providerAccountRepository.create({
        ownerType: dto.ownerType,
        ownerId: dto.ownerId,
      });
    }
    account.tier = tier;
    account.status = dto.status ?? ProviderAccountStatus.ACTIVE;
    account.assignedBy = assignedBy;
    account.assignedAt = new Date();
    account.subscriptionBillingCycle = null;
    account.subscriptionStartedAt = null;
    account.subscriptionExpiresAt = null;
    account.lastSubscriptionPaymentAt = null;
    account.notes = dto.notes ?? account.notes ?? null;

    await this.ensureProviderWallet(dto.ownerType, dto.ownerId);
    return this.providerAccountRepository.save(account);
  }

  async ensureProviderAccount(
    ownerType: OwnerType,
    ownerId: string,
    assignedBy: string | null,
  ): Promise<ProviderAccount> {
    const existing = await this.findByOwner(ownerType, ownerId);
    if (existing) {
      await this.ensureProviderWallet(ownerType, ownerId);
      return existing;
    }
    const tier = await this.tierService.getDefaultTier();
    const account = this.providerAccountRepository.create({
      ownerType,
      ownerId,
      tier,
      status: ProviderAccountStatus.ACTIVE,
      assignedBy,
      assignedAt: new Date(),
      notes: 'Auto-provisioned provider account',
    });
    await this.ensureProviderWallet(ownerType, ownerId);
    return this.providerAccountRepository.save(account);
  }

  async changeTier(
    providerAccountId: string,
    dto: ChangeProviderTierDto,
    assignedBy: string | null,
  ): Promise<ProviderAccount> {
    const account = await this.getProviderAccount(providerAccountId);
    const tier = await this.tierService.getTier(dto.tierId);
    if (!tier.isActive) {
      throw new BadRequestException('Cannot assign an inactive provider tier');
    }
    account.tier = tier;
    account.assignedBy = assignedBy;
    account.assignedAt = new Date();
    account.subscriptionBillingCycle = null;
    account.subscriptionStartedAt = null;
    account.subscriptionExpiresAt = null;
    account.lastSubscriptionPaymentAt = null;
    account.notes = dto.notes ?? account.notes;
    return this.providerAccountRepository.save(account);
  }

  async activatePaidSubscription(
    providerAccountId: string,
    tier: ProviderTierDefinition,
    billingCycle: BillingCycle,
    paidAt = new Date(),
  ): Promise<ProviderAccount> {
    const account = await this.getProviderAccount(providerAccountId);
    const currentExpiry = account.subscriptionExpiresAt;
    const periodStart =
      currentExpiry && currentExpiry.getTime() > paidAt.getTime()
        ? currentExpiry
        : paidAt;

    account.tier = tier;
    account.status = ProviderAccountStatus.ACTIVE;
    account.assignedBy = null;
    account.assignedAt = paidAt;
    account.subscriptionBillingCycle = billingCycle;
    account.subscriptionStartedAt = periodStart;
    account.subscriptionExpiresAt = this.addBillingCycle(
      periodStart,
      billingCycle,
    );
    account.lastSubscriptionPaymentAt = paidAt;
    account.notes = `Subscription active until ${account.subscriptionExpiresAt.toISOString()}`;

    return this.providerAccountRepository.save(account);
  }

  async changeStatus(
    providerAccountId: string,
    dto: ChangeProviderStatusDto,
  ): Promise<ProviderAccount> {
    const account = await this.getProviderAccount(providerAccountId);
    account.status = dto.status;
    account.notes = dto.notes ?? account.notes;
    return this.providerAccountRepository.save(account);
  }

  async updateOverrides(
    providerAccountId: string,
    dto: ProviderOverridesDto,
  ): Promise<ProviderAccount> {
    const account = await this.getProviderAccount(providerAccountId);
    Object.assign(account, dto);
    return this.providerAccountRepository.save(account);
  }

  async resolveProviderSharePercent(
    ownerType: OwnerType,
    ownerId: string,
    fallbackSharePercent: number,
  ): Promise<number> {
    const account = await this.findByOwner(ownerType, ownerId);
    if (!account) {
      return fallbackSharePercent;
    }
    if (account.customProviderSharePercent !== null) {
      return account.customProviderSharePercent;
    }
    return account.tier?.providerSharePercent ?? fallbackSharePercent;
  }

  getAssignedTier(account: ProviderAccount): ProviderTierDefinition {
    if (!account.tier) {
      throw new BadRequestException('Provider account has no assigned tier');
    }
    return account.tier;
  }

  private async ensureProviderWallet(
    ownerType: OwnerType,
    ownerId: string,
  ): Promise<void> {
    await this.walletsService.createWallet(
      ownerId,
      ownerType,
      WalletType.PROVIDER,
      0,
    );
  }

  private async applyExpiredSubscription(
    account: ProviderAccount,
  ): Promise<ProviderAccount> {
    if (
      !account.subscriptionExpiresAt ||
      account.subscriptionExpiresAt.getTime() > Date.now()
    ) {
      return account;
    }

    const defaultTier = await this.tierService.getDefaultTier();
    if (account.tier?.id === defaultTier.id) {
      return account;
    }

    account.tier = defaultTier;
    account.assignedBy = null;
    account.assignedAt = new Date();
    account.notes = `Paid subscription expired at ${account.subscriptionExpiresAt.toISOString()}; downgraded to default tier`;

    return this.providerAccountRepository.save(account);
  }

  private addBillingCycle(start: Date, billingCycle: BillingCycle): Date {
    const expiresAt = new Date(start);
    if (billingCycle === BillingCycle.ANNUAL) {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      return expiresAt;
    }
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    return expiresAt;
  }
}
