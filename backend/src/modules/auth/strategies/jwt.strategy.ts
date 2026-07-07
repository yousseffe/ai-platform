import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { JwtPayload } from '../interfaces/auth.interface';
import { getRsaKeys } from '../utils/keys';
import { UsersService } from '../../users/services/users.service';
import { UserStatus } from '../../../shared/enums/user-status.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getRsaKeys().publicKey,
      algorithms: ['RS256'],
    });
  }

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
        const gracePeriodMs = 15 * 1000;
        if (timeSinceLastLoginMs < 0 || timeSinceLastLoginMs > gracePeriodMs) {
          throw new UnauthorizedException('Token has been revoked');
        }
      }
    }

    return { id: payload.sub, email: payload.email, jti: payload.jti };
  }
}
