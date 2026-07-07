import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { ApiKeyType } from '../../auth/enums/api-key-type.enum';
import { ApiKey } from '../../auth/entities/api-key.entity';
import { Model } from '../../models/entities/model.entity';
import { WalletsService } from '../../wallets/services/wallets.service';
import { ProviderAccountsService } from '../../provider-accounts/services/provider-accounts.service';
import { UsersRepository } from '../repositories/users.repository';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';

@Injectable()
export class UsersService {
  constructor(
    public readonly usersRepository: UsersRepository,
    @Inject(forwardRef(() => WalletsService))
    private readonly walletsService: WalletsService,
    @Inject(forwardRef(() => ProviderAccountsService))
    private readonly providerAccountsService: ProviderAccountsService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(Model)
    private readonly modelRepository: Repository<Model>,
  ) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  async findOneByFullName(fullName: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ fullName });
  }

  async create(user: Partial<User>): Promise<User> {
    const newUser = this.usersRepository.create(user);
    return this.usersRepository.save(newUser);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, data);
    const updated = await this.usersRepository.findOneBy({ id });
    if (!updated) {
      throw new Error(`User with ID ${id} not found after update`);
    }
    return updated;
  }

  async enableProvider(userId: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (!user.providerMode) {
      await this.update(userId, { providerMode: true });
    }

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

  async rotateApiKey(userId: string): Promise<ApiKey> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    throw new BadRequestException(
      'Prediction API keys are model-scoped. Generate a key for the target model from API settings or POST /users/me/api-keys with modelId.',
    );
  }

  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository
      .createQueryBuilder('apiKey')
      .innerJoinAndSelect('apiKey.model', 'model')
      .where('apiKey.user_id = :userId', { userId })
      .andWhere('apiKey.type = :type', { type: ApiKeyType.LIVE })
      .andWhere('apiKey.is_active = true')
      .orderBy('apiKey.created_at', 'DESC')
      .getMany();
  }

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
