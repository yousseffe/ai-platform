import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from '../../users/services/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { JwtPayload, TokenResponse } from '../interfaces/auth.interface';

/**
 * Service governing password encryption, credential matching, and JWT token issuances.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Registers a new platform user account and automatically signs them in.
   *
   * @param email - The user email.
   * @param password - The raw user password.
   * @returns A promise resolving to the token response pair.
   * @throws {ConflictException} If the email address is already registered.
   */
  async register(email: string, password: string): Promise<TokenResponse> {
    const existing = await this.usersService.findOneByEmail(email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({ email, passwordHash });
    return this.login(user);
  }

  /**
   * Verifies user email and password credentials for sign-in processing.
   *
   * @param email - The input user email.
   * @param password - The input raw password.
   * @returns A promise resolving to the User object without passwordHash on success, or null.
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const userCopy = { ...user };
      delete (userCopy as Partial<User>).passwordHash;
      return userCopy;
    }
    return null;
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
      access_token: this.jwtService.sign(payload, { expiresIn: '15m' }),
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
        access_token: this.jwtService.sign(newPayload, { expiresIn: '15m' }),
        refresh_token: this.jwtService.sign(newPayload, { expiresIn: '7d' }),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
