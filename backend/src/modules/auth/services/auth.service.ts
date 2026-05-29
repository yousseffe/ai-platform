import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { JwtPayload, TokenResponse } from '../interfaces/auth.interface';
import { RedisService } from '../../../shared/redis/redis.service';
import { WalletsService } from '../../wallets/services/wallets.service';
import { OrganizationsService } from '../../organizations/services/organizations.service';
import { UserStatus } from '../../../shared/enums/user-status.enum';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { WalletType } from '../../../shared/enums/wallet-type.enum';

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
  ) {}

  /**
   * Registers a new platform user account.
   * Generates a 0-credit CONSUMER Wallet and writes a 15-minute expiration verification OTP to cache.
   *
   * @param email - The user email.
   * @param username - Desired username display name.
   * @param password - The raw user password.
   * @returns A promise resolving to a registration message.
   * @throws {ConflictException} If the email address or username is already registered.
   */
  async register(
    email: string,
    username: string,
    password: string,
  ): Promise<{ message: string }> {
    const existingEmail = await this.usersService.findOneByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingUsername =
      await this.usersService.findOneByUsername(username);
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      email,
      username,
      passwordHash,
      isVerified: false,
      status: UserStatus.PENDING,
    });

    // Create 0-credit CONSUMER wallet for the User
    await this.walletsService.createWallet(user.id, OwnerType.USER, WalletType.CONSUMER, 0.0);

    // Generate secure 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redisService.set(`otp:${email}`, otp, 900); // Expires in 15 mins (900 seconds)

    // Log the OTP code to terminal console for local debugging loop
    console.log('\n----------------------------------------');
    console.log(`[Mailer-Mock] Email sent to: ${email}`);
    console.log(`[Mailer-Mock] Verification Code (OTP): ${otp}`);
    console.log('----------------------------------------\n');

    return { message: 'Verification OTP sent to your email.' };
  }

  /**
   * Asserts OTP matches the cache entry, then flags the user as ACTIVE and verified.
   *
   * @param email - User email address.
   * @param otp - 6-digit input token.
   * @returns Indicator of success.
   * @throws {UnauthorizedException} If token is invalid or expired.
   */
  async verifyOtp(
    email: string,
    otp: string,
  ): Promise<{ success: boolean; message: string }> {
    const cachedOtp = await this.redisService.get(`otp:${email}`);
    if (!cachedOtp || cachedOtp !== otp) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    await this.redisService.del(`otp:${email}`);

    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    await this.usersService.update(user.id, {
      isVerified: true,
      status: UserStatus.ACTIVE,
    });

    return {
      success: true,
      message: 'Account verified successfully.',
    };
  }

  /**
   * Verifies user email and password credentials for sign-in processing.
   * Restricts login to verified ACTIVE accounts.
   *
   * @param email - The input user email.
   * @param password - The input raw password.
   * @returns A promise resolving to the User object without passwordHash on success, or null.
   * @throws {UnauthorizedException} If user profile exists but email is not verified yet.
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) return null;

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      return null;
    }

    if (!user.isVerified || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in.',
      );
    }

    const userCopy = { ...user };
    delete (userCopy as Partial<User>).passwordHash;
    return userCopy;
  }

  /**
   * Generates a pair of signed access and refresh tokens for a user.
   *
   * @param user - The authenticated user record (without passwordHash).
   * @returns An object containing signed access and refresh tokens.
   */
  login(user: Omit<User, 'passwordHash'>): TokenResponse {
    const payload: JwtPayload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '60m' }),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  /**
   * Verifies a refresh token and generates a new access/refresh token pair.
   *
   * @param refreshToken - The active refresh token string.
   * @returns The new token pair.
   * @throws {UnauthorizedException} If the refresh token is invalid or expired.
   */
  refreshToken(refreshToken: string): TokenResponse {
    try {
      const payload = this.jwtService.verify(
        refreshToken,
      ) as unknown as JwtPayload;
      const newPayload: JwtPayload = { email: payload.email, sub: payload.sub };
      return {
        access_token: this.jwtService.sign(newPayload, { expiresIn: '60m' }),
        refresh_token: this.jwtService.sign(newPayload, { expiresIn: '7d' }),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
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
    const providerBalance = user.isProvider
      ? await this.walletsService.getBalance(userId, OwnerType.USER, WalletType.PROVIDER)
      : 0.0;

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isProvider: user.isProvider,
        status: user.status,
      },
      wallets: {
        consumer: consumerBalance,
        provider: providerBalance,
      },
      workspaces,
    };
  }
}
