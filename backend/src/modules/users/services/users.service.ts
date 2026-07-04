import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { ApiKey } from '../../auth/entities/api-key.entity';
import { Model } from '../../models/entities/model.entity';
import { ApiKeyType } from '../../auth/enums/api-key-type.enum';
import { UsersRepository } from '../repositories/users.repository';
import { WalletsService } from '../../wallets/services/wallets.service';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { ProviderAccountsService } from '../../provider-accounts/services/provider-accounts.service';

/**
 * Service providing methods for user profile querying, creation, update, and role changes.
 */
@Injectable()
export class UsersService {
  constructor(
    public readonly usersRepository: UsersRepository,
    private readonly walletsService: WalletsService,
    private readonly providerAccountsService: ProviderAccountsService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(Model)
    private readonly modelRepository: Repository<Model>,
  ) {}

  /**
   * Retrieves a user from the database matching the provided email address.
   *
   * @param email - The email address to look up.
   * @returns A promise resolving to the User object if found, or null otherwise.
   */
  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  /**
   * Retrieves a user from the database matching the provided full name.
   *
   * @param fullName - The full name to look up.
   * @returns A promise resolving to the User object if found, or null otherwise.
   */
  async findOneByFullName(fullName: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ fullName });
  }

  /**
   * Creates a new user record in the database.
   *
   * @param user - Partial user data object containing registration details.
   * @returns A promise resolving to the fully saved User entity.
   */
  async create(user: Partial<User>): Promise<User> {
    const newUser = this.usersRepository.create(user);
    return this.usersRepository.save(newUser);
  }

  /**
   * Updates an existing user record.
   *
   * @param id - UUID of the user.
   * @param data - Columns to update.
   * @returns Fully updated user record.
   */
  async update(id: string, data: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, data);
    const updated = await this.usersRepository.findOneBy({ id });
    if (!updated) {
      throw new Error(`User with ID ${id} not found after update`);
    }
    return updated;
  }

  /**
   * Enrolls an individual user workspace to act as a Provider.
   * Initializes a PROVIDER wallet for the user.
   *
   * @param userId - Owner user UUID.
   * @returns Updated User.
   */
  async enableProvider(userId: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (!user.providerMode) {
      await this.update(userId, { providerMode: true });
    }

    // Always ensure the wallet and provider account exist, even if
    // providerMode was already true: it's possible for a prior enrollment to
    // have set the flag but failed before provisioning these records (e.g. a
    // transient error), leaving the user flagged as a provider with no
    // provider account. Both calls below are idempotent no-ops when the
    // records already exist.
    await this.walletsService.createWallet(
      userId,
      OwnerType.USER,
      WalletType.PROVIDER,
      0.0,
    );
    await this.providerAccountsService.ensureProviderAccount(
      OwnerType.USER,
      userId,
      userId,
    );

    const updated = await this.usersRepository.findOneBy({ id: userId });
    if (!updated) {
      throw new Error('User not found after update');
    }
    return updated;
  }

  /**
   * Updates password verifying current password first.
   *
   * @param userId - Requesting user UUID.
   * @param currentPass - Present password.
   * @param newPass - Target new password.
   * @param ipAddress - Request IP.
   * @param userAgent - Request User-Agent.
   * @returns Status confirmation.
   */
  async changePassword(
    userId: string,
    currentPass: string,
    newPass: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean }> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const matches = await bcrypt.compare(currentPass, user.passwordHash);
    if (!matches) {
      throw new BadRequestException('Incorrect current password');
    }

    user.passwordHash = await bcrypt.hash(newPass, 12);
    await this.usersRepository.save(user);

    const log = this.auditLogRepository.create({
      userId,
      action: 'PASSWORD_CHANGE',
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      metadata: {},
    });
    await this.auditLogRepository.save(log);

    return { success: true };
  }

  /**
   * Modifies display name.
   *
   * @param userId - Target user UUID.
   * @param fullName - New display name.
   * @param ipAddress - Request IP.
   * @param userAgent - Request User-Agent.
   * @returns User context.
   */
  async updateProfile(
    userId: string,
    fullName?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const oldName = user.fullName;
    if (fullName) {
      user.fullName = fullName;
    }
    const savedUser = await this.usersRepository.save(user);

    const log = this.auditLogRepository.create({
      userId,
      action: 'PROFILE_UPDATE',
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      metadata: { old_name: oldName, new_name: savedUser.fullName },
    });
    await this.auditLogRepository.save(log);

    return savedUser;
  }

  /**
   * Rotates the API Key for the authenticated user.
   *
   * @param userId - Target user UUID.
   * @returns Newly created active ApiKey entity.
   */
  async rotateApiKey(userId: string): Promise<ApiKey> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    await this.apiKeyRepository.update(
      { user: { id: userId }, isActive: true },
      { isActive: false },
    );

    const apiKeyVal = 'ml_sk_live_' + crypto.randomBytes(24).toString('hex');
    const newApiKey = this.apiKeyRepository.create({
      key: apiKeyVal,
      user,
      name: 'Default Key',
      isActive: true,
    });

    return this.apiKeyRepository.save(newApiKey);
  }

  /**
   * Retrieves all active LIVE API keys for the specified user.
   *
   * @param userId - User UUID.
   * @returns Active API keys array.
   */
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      where: { user: { id: userId }, type: ApiKeyType.LIVE, isActive: true },
      relations: ['model'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Generates a new active LIVE API key for a user and model.
   *
   * @param userId - User UUID.
   * @param modelId - Model UUID.
   * @param name - Custom nickname for the key.
   * @returns Created API Key record.
   */
  async generateUserApiKey(
    userId: string,
    modelId: string,
    name: string,
  ): Promise<ApiKey> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const model = await this.modelRepository.findOneBy({ id: modelId });
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    const apiKeyVal = 'ml_sk_live_' + crypto.randomBytes(24).toString('hex');
    const newApiKey = this.apiKeyRepository.create({
      key: apiKeyVal,
      user,
      model,
      name: name || 'Default Key',
      type: ApiKeyType.LIVE,
      isActive: true,
    });

    return this.apiKeyRepository.save(newApiKey);
  }

  /**
   * Revokes (deactivates) a specific API key for the user.
   *
   * @param userId - User UUID.
   * @param keyId - API Key UUID.
   */
  async revokeUserApiKey(userId: string, keyId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: keyId, user: { id: userId } },
    });
    if (!apiKey) {
      throw new NotFoundException('API Key not found or access denied');
    }
    apiKey.isActive = false;
    await this.apiKeyRepository.save(apiKey);
  }

  /**
   * Updates a user's API key rate limit and daily spend budget quota fields.
   * Leaves any field not present in `updates` unchanged.
   *
   * @param userId - User UUID (must own the key).
   * @param keyId - API Key UUID.
   * @param updates - Partial quota fields.
   * @throws {NotFoundException} If the key does not exist or isn't owned by the user.
   */
  async updateApiKeyQuota(
    userId: string,
    keyId: string,
    updates: {
      maxRequestsPerMinute?: number | null;
      maxDailySpendCredits?: number | null;
    },
  ): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: keyId, user: { id: userId } },
    });
    if (!apiKey) {
      throw new NotFoundException('API Key not found or access denied');
    }

    if (updates.maxRequestsPerMinute !== undefined) {
      apiKey.maxRequestsPerMinute = updates.maxRequestsPerMinute;
    }
    if (updates.maxDailySpendCredits !== undefined) {
      apiKey.maxDailySpendCredits = updates.maxDailySpendCredits;
    }

    return this.apiKeyRepository.save(apiKey);
  }
}
