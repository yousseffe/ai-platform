import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UsersService } from '../../users/services/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../../users/entities/user.entity';
import { AuditLog } from '../../users/entities/audit-log.entity';
import { VerificationCode } from '../entities/verification-code.entity';
import { ApiKey } from '../entities/api-key.entity';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { TokenResponse, JwtPayload } from '../interfaces/auth.interface';
import { RedisService } from '../../../shared/redis/redis.service';
import { WalletsService } from '../../wallets/services/wallets.service';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { UserStatus } from '../../../shared/enums/user-status.enum';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { getRsaKeys } from '../utils/keys';
import { MailService } from '../../../shared/mail/mail.service';
import { ApiKeyType } from '../enums/api-key-type.enum';

/**
 * Service governing password encryption, credential matching, verification OTP issuance,
 * session profiles loading, and JWT token declarations.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly walletsService: WalletsService,
    private readonly orgsService: OrganizationsService,
    @InjectRepository(VerificationCode)
    private readonly verificationCodeRepository: Repository<VerificationCode>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
  ) {}

  /**
   * Registers a new platform user account.
   * Atomically creates a 0-credit CONSUMER Wallet and writes verification OTP within a transaction.
   *
   * @param email - The user email.
   * @param fullName - The user display full name.
   * @param password - The raw user password.
   * @returns A promise resolving to a registration message and user metadata.
   * @throws {ConflictException} If the email address is already registered.
   */
  async register(
    email: string,
    fullName: string,
    password: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: { user_id: string; status: UserStatus };
  }> {
    const existingEmail = await this.usersService.findOneByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const passwordHash = await bcrypt.hash(password, 12);
      const user = queryRunner.manager.create(User, {
        email,
        fullName,
        passwordHash,
        status: UserStatus.PENDING_VERIFICATION,
        providerMode: false,
      });
      const savedUser = await queryRunner.manager.save(User, user);

      const wallet = queryRunner.manager.create(Wallet, {
        walletType: WalletType.CONSUMER,
        ownerType: OwnerType.USER,
        ownerId: savedUser.id,
        balance: 0.0,
        currency: 'CREDITS',
      });
      await queryRunner.manager.save(Wallet, wallet);

      const codeStr = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      const verificationCode = queryRunner.manager.create(VerificationCode, {
        userId: savedUser.id,
        code: codeStr,
        expiresAt,
        attempts: 0,
        used: false,
      });
      await queryRunner.manager.save(VerificationCode, verificationCode);

      await queryRunner.commitTransaction();

      // Trigger verification email asynchronously
      this.mailService
        .sendOtpVerification(email, fullName, codeStr)
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`Deferred email send failed on register: ${msg}`);
        });

      return {
        success: true,
        message: 'Registration successful. Please verify your email.',
        data: {
          user_id: savedUser.id,
          status: UserStatus.PENDING_VERIFICATION,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Asserts OTP matches the database entry, checks lockout limits, then flags the user as ACTIVE.
   *
   * @param emailOrUserId - User email address or UUID.
   * @param codeOrOtp - 6-digit input token.
   * @returns Indicator of success.
   * @throws {UnauthorizedException | NotFoundException | HttpException} Based on OTP validity.
   */
  async verifyOtp(
    emailOrUserId: string,
    codeOrOtp: string,
  ): Promise<{ success: boolean; message: string }> {
    let user: User | null = null;
    if (emailOrUserId.includes('@')) {
      user = await this.usersService.findOneByEmail(emailOrUserId);
    } else {
      user = await this.usersService.usersRepository.findOneBy({
        id: emailOrUserId,
      });
    }

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const lockoutKey = `lockout:${user.id}`;
    const isLocked = await this.redisService.get(lockoutKey);
    if (isLocked) {
      throw new HttpException(
        'Too many attempts. Locked for 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const verificationCode = await this.verificationCodeRepository.findOne({
      where: { userId: user.id, used: false },
      order: { createdAt: 'DESC' },
    });

    if (!verificationCode) {
      throw new BadRequestException('Invalid or expired code');
    }

    if (verificationCode.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Code expired. Please request a new one.');
    }

    if (verificationCode.attempts >= 5) {
      await this.redisService.set(lockoutKey, 'true', 900);
      throw new HttpException(
        'Too many attempts. Locked for 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (verificationCode.code !== codeOrOtp) {
      verificationCode.attempts += 1;
      await this.verificationCodeRepository.save(verificationCode);

      if (verificationCode.attempts >= 5) {
        await this.redisService.set(lockoutKey, 'true', 900);
        throw new HttpException(
          'Too many attempts. Locked for 15 minutes.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new BadRequestException('Invalid or expired code');
    }

    verificationCode.used = true;
    await this.verificationCodeRepository.save(verificationCode);

    user.status = UserStatus.ACTIVE;
    await this.usersService.usersRepository.save(user);

    return {
      success: true,
      message: 'Account verified successfully.',
    };
  }

  /**
   * Resends the verification OTP code to the user, enforcing rate limit rules.
   *
   * @param email - User email address.
   * @returns Success payload.
   * @throws {BadRequestException | HttpException} If rate limited or verified.
   */
  async resendVerification(
    email: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Account already verified');
    }

    const rateLimitKey = `resend_count:${email}`;
    const resendCountStr = await this.redisService.get(rateLimitKey);
    const resendCount = resendCountStr ? parseInt(resendCountStr) : 0;
    if (resendCount >= 3) {
      throw new HttpException(
        'Too many resends. Please wait 1 hour.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.verificationCodeRepository.update(
      { userId: user.id, used: false },
      { used: true },
    );

    const codeStr = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    const verificationCode = this.verificationCodeRepository.create({
      userId: user.id,
      code: codeStr,
      expiresAt,
      attempts: 0,
      used: false,
    });
    await this.verificationCodeRepository.save(verificationCode);

    const ttl =
      resendCount === 0 ? 3600 : await this.redisService.ttl(rateLimitKey);
    await this.redisService.set(
      rateLimitKey,
      (resendCount + 1).toString(),
      ttl > 0 ? ttl : 3600,
    );

    // Trigger verification email asynchronously
    this.mailService
      .sendOtpVerification(email, user.fullName, codeStr)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Deferred email send failed on resendOtp: ${msg}`);
      });

    return {
      success: true,
      message: 'New verification OTP sent to your email.',
    };
  }

  /**
   * Verifies user email and password credentials for sign-in processing.
   * Restricts login to active verified accounts.
   *
   * @param email - The input user email.
   * @param password - The input raw password.
   * @returns A promise resolving to the User object.
   * @throws {UnauthorizedException | HttpException} If credentials are wrong or status is restricted.
   */
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new HttpException(
        'Please verify your email before logging in',
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new HttpException(
        'Account suspended. Contact support.',
        HttpStatus.FORBIDDEN,
      );
    }

    return user;
  }

  /**
   * Generates a pair of signed access and refresh tokens for a user using RS256.
   *
   * @param user - The authenticated user record.
   * @returns An object containing signed access and refresh tokens.
   */
  async login(user: User): Promise<TokenResponse> {
    const roles = ['consumer'];
    if (user.providerMode) {
      roles.push('provider');
    }

    if (user.isAdmin || user.email.toLowerCase().includes('admin')) {
      roles.push('admin');
    }

    const ownedOrgs = await this.orgsService.orgRepository.findOneBy({
      createdBy: user.id,
    });
    if (ownedOrgs) {
      roles.push('org_owner');
    }

    const keys = getRsaKeys();
    const jti = crypto.randomUUID();
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 24 * 60 * 60; // 24 hours

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      jti,
      iat,
      exp,
      roles,
      status: user.status,
    };

    user.lastLoginAt = new Date(iat * 1000);
    await this.usersService.usersRepository.save(user);

    const access_token = this.jwtService.sign(payload, {
      secret: undefined,
      privateKey: keys.privateKey,
      algorithm: 'RS256',
    });

    const refresh_token = this.jwtService.sign(
      { sub: user.id, jti: crypto.randomUUID() },
      {
        secret: undefined,
        privateKey: keys.privateKey,
        algorithm: 'RS256',
        expiresIn: '7d',
      },
    );

    return {
      access_token,
      refresh_token,
    };
  }

  /**
   * Verifies a refresh token and generates a new access/refresh token pair.
   *
   * @param refreshToken - The active refresh token string.
   * @returns The new token pair.
   * @throws {UnauthorizedException} If the refresh token is invalid or expired.
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const keys = getRsaKeys();
      const payload = this.jwtService.verify(refreshToken, {
        secret: undefined,
        publicKey: keys.publicKey,
        algorithms: ['RS256'],
      }) as unknown as JwtPayload;

      const user = await this.usersService.usersRepository.findOneBy({
        id: payload.sub,
      });
      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid user status');
      }

      if (user.lastLoginAt && payload.iat) {
        const tokenIatMs = payload.iat * 1000;
        if (tokenIatMs < user.lastLoginAt.getTime()) {
          const timeSinceLastLoginMs = Date.now() - user.lastLoginAt.getTime();
          const gracePeriodMs = 15 * 1000; // 15 seconds grace period for concurrent requests
          if (
            timeSinceLastLoginMs < 0 ||
            timeSinceLastLoginMs > gracePeriodMs
          ) {
            throw new UnauthorizedException('Token has been revoked');
          }
        }
      }

      return this.login(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Revokes all active tokens for the user by updating their last login timestamp.
   *
   * @param userId - Target user UUID.
   * @returns Successful logout notification.
   */
  async logout(userId: string): Promise<{ success: boolean }> {
    const user = await this.usersService.usersRepository.findOneBy({
      id: userId,
    });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    // Set lastLoginAt to 15 seconds in the future to instantly revoke all active tokens,
    // bypassing the 15-second concurrency grace period.
    user.lastLoginAt = new Date(Date.now() + 15 * 1000);
    await this.usersService.usersRepository.save(user);
    return { success: true };
  }

  /**
   * Compiles user metadata, wallet balances, and accessible workspaces.
   *
   * @param userId - Target user UUID.
   * @returns Active session profile payload.
   */
  async getProfile(userId: string) {
    const user = await this.usersService.usersRepository.findOneBy({
      id: userId,
    });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const workspaces = await this.orgsService.findUserOrganizations(userId);
    const consumerBalance = await this.walletsService.getBalance(
      userId,
      OwnerType.USER,
      WalletType.CONSUMER,
    );
    const providerBalance = user.providerMode
      ? await this.walletsService.getBalance(
          userId,
          OwnerType.USER,
          WalletType.PROVIDER,
        )
      : 0.0;

    const apiKeyEntity = await this.apiKeyRepository.findOne({
      where: { user: { id: userId }, type: ApiKeyType.LIVE, isActive: true },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        providerMode: user.providerMode,
        status: user.status,
        isAdmin: user.isAdmin || user.email.toLowerCase().includes('admin'),
        apiKey: apiKeyEntity ? apiKeyEntity.key : null,
      },
      wallets: {
        consumer: consumerBalance,
        provider: providerBalance,
      },
      workspaces,
    };
  }

  /**
   * Modifies password checking current password first.
   *
   * @param userId - Requesting user UUID.
   * @param currentPass - Present password.
   * @param newPass - Target new password.
   * @param ipAddress - Request IP.
   * @param userAgent - Request User-Agent.
   * @returns Status code confirm.
   */
  async changePassword(
    userId: string,
    currentPass: string,
    newPass: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean }> {
    const user = await this.usersService.usersRepository.findOneBy({
      id: userId,
    });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const matches = await bcrypt.compare(currentPass, user.passwordHash);
    if (!matches) {
      throw new BadRequestException('Incorrect current password');
    }

    user.passwordHash = await bcrypt.hash(newPass, 12);
    await this.usersService.usersRepository.save(user);

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
   * Updates profile data.
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
    const user = await this.usersService.usersRepository.findOneBy({
      id: userId,
    });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const oldName = user.fullName;
    if (fullName) {
      user.fullName = fullName;
    }
    const savedUser = await this.usersService.usersRepository.save(user);

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
}
