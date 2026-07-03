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
import { WalletsService } from '../../wallets/services/wallets.service';
import {
  ChangeProviderStatusDto,
  ChangeProviderTierDto,
  ProviderOverridesDto,
  UpsertProviderAccountDto,
} from '../dto/provider-account.dto';
import { ProviderAccount } from '../entities/provider-account.entity';
import { ProviderTierDefinition } from '../entities/provider-tier-definition.entity';
import { ProviderAccountStatus } from '../enums/provider-account-status.enum';
import { ProviderTierService } from './provider-tier.service';

/**
 * Manages provider account lifecycle, tier assignment, and custom overrides.
 */
@Injectable()
export class ProviderAccountsService {
  constructor(
    @InjectRepository(ProviderAccount)
    private readonly providerAccountRepository: Repository<ProviderAccount>,
    private readonly tierService: ProviderTierService,
    @Inject(forwardRef(() => WalletsService))
    private readonly walletsService: WalletsService,
  ) {}

  /**
   * Lists provider accounts with eager tier information.
   *
   * @returns Provider account collection.
   */
  async listProviderAccounts(): Promise<ProviderAccount[]> {
    return this.providerAccountRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves a provider account by UUID.
   *
   * @param providerAccountId - Provider account UUID.
   * @returns Provider account.
   * @throws {NotFoundException} If not found.
   */
  async getProviderAccount(
    providerAccountId: string,
  ): Promise<ProviderAccount> {
    const account = await this.providerAccountRepository.findOne({
      where: { id: providerAccountId },
    });
    if (!account) {
      throw new NotFoundException('Provider account not found');
    }
    return account;
  }

  /**
   * Finds a provider account by owner identity.
   *
   * @param ownerType - USER or ORG.
   * @param ownerId - Owner UUID.
   * @returns Provider account or null.
   */
  async findByOwner(
    ownerType: OwnerType,
    ownerId: string,
  ): Promise<ProviderAccount | null> {
    return this.providerAccountRepository.findOne({
      where: { ownerType, ownerId },
    });
  }

  /**
   * Creates or updates a provider account from admin payload.
   *
   * @param dto - Provider account assignment payload.
   * @param assignedBy - Admin user UUID.
   * @returns Saved provider account.
   */
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
    account.notes = dto.notes ?? account.notes ?? null;

    await this.ensureProviderWallet(dto.ownerType, dto.ownerId);
    return this.providerAccountRepository.save(account);
  }

  /**
   * Ensures provider infrastructure exists for an owner using the default tier.
   *
   * @param ownerType - USER or ORG.
   * @param ownerId - Owner UUID.
   * @param assignedBy - User/admin responsible for activation.
   * @returns Existing or newly created provider account.
   */
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

  /**
   * Changes provider tier for future billing and limits only.
   *
   * @param providerAccountId - Provider account UUID.
   * @param dto - Tier change payload.
   * @param assignedBy - Admin user UUID.
   * @returns Updated provider account.
   */
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
    account.notes = dto.notes ?? account.notes;
    return this.providerAccountRepository.save(account);
  }

  /**
   * Updates provider lifecycle status.
   *
   * @param providerAccountId - Provider account UUID.
   * @param dto - Status change payload.
   * @returns Updated provider account.
   */
  async changeStatus(
    providerAccountId: string,
    dto: ChangeProviderStatusDto,
  ): Promise<ProviderAccount> {
    const account = await this.getProviderAccount(providerAccountId);
    account.status = dto.status;
    account.notes = dto.notes ?? account.notes;
    return this.providerAccountRepository.save(account);
  }

  /**
   * Applies provider-specific custom overrides.
   *
   * @param providerAccountId - Provider account UUID.
   * @param dto - Override payload.
   * @returns Updated provider account.
   */
  async updateOverrides(
    providerAccountId: string,
    dto: ProviderOverridesDto,
  ): Promise<ProviderAccount> {
    const account = await this.getProviderAccount(providerAccountId);
    Object.assign(account, dto);
    return this.providerAccountRepository.save(account);
  }

  /**
   * Resolves the effective provider share percentage for billing precedence.
   *
   * @param ownerType - Provider owner type.
   * @param ownerId - Provider owner UUID.
   * @param fallbackSharePercent - Global fallback share percentage.
   * @returns Effective provider payout percentage.
   */
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

  /**
   * Returns the effective provider tier definition for an account.
   *
   * @param account - Provider account.
   * @returns Assigned tier.
   */
  getAssignedTier(account: ProviderAccount): ProviderTierDefinition {
    if (!account.tier) {
      throw new BadRequestException('Provider account has no assigned tier');
    }
    return account.tier;
  }

  /**
   * Creates the provider earnings wallet if missing.
   *
   * @param ownerType - USER or ORG.
   * @param ownerId - Owner UUID.
   */
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
}
