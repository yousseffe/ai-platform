import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtPayload } from '../interfaces/auth.interface';
import { getRsaKeys } from '../utils/keys';
import { UsersService } from '../../users/services/users.service';
import { UserStatus } from '../../../shared/enums/user-status.enum';

/**
 * Passport strategy implementing JWT verification using RS256 asymmetric signatures.
 * Performs database stateless validation of the token's issued-at time against the user's lastLoginAt.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getRsaKeys().publicKey,
      algorithms: ['RS256'],
    });
  }

  /**
   * Passport callback executed after signature validation completes.
   * Asserts token was generated after the user's last login boundary.
   *
   * @param payload - Deserialized JWT payload claims.
   * @returns User context object.
   * @throws {UnauthorizedException} If the token has been revoked by a newer login/logout.
   */
  async validate(
    payload: JwtPayload,
  ): Promise<{ id: string; email: string; jti: string }> {
    const user = await this.usersService.usersRepository.findOneBy({
      id: payload.sub,
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is inactive or not found');
    }

    if (user.lastLoginAt && payload.iat) {
      const tokenIatMs = payload.iat * 1000;
      if (tokenIatMs < user.lastLoginAt.getTime()) {
        const timeSinceLastLoginMs = Date.now() - user.lastLoginAt.getTime();
        const gracePeriodMs = 15 * 1000; // 15 seconds grace period for concurrent requests
        if (timeSinceLastLoginMs < 0 || timeSinceLastLoginMs > gracePeriodMs) {
          throw new UnauthorizedException('Token has been revoked');
        }
      }
    }

    return { id: payload.sub, email: payload.email, jti: payload.jti };
  }
}
