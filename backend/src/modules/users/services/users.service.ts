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
import { UsersRepository } from '../repositories/users.repository';
import { WalletsService } from '../../wallets/services/wallets.service';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';

/**
 * Service providing methods for user profile querying, creation, update, and role changes.
 */
@Injectable()
export class UsersService {
  constructor(
    public readonly usersRepository: UsersRepository,
    private readonly walletsService: WalletsService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
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

    if (user.providerMode) {
      return user;
    }

    await this.update(userId, { providerMode: true });
    await this.walletsService.createWallet(
      userId,
      OwnerType.USER,
      WalletType.CONSUMER,
      0.0,
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
}
