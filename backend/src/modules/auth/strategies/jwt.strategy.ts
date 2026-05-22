import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { JwtPayload } from '../interfaces/auth.interface';

/**
 * Passport strategy implementing JWT verification for controller endpoints.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'supersecret',
    });
  }

  /**
   * Hook executed by Passport once the JWT token is decrypted successfully.
   * Extracts user context to bind to the Request object.
   *
   * @param payload - The decoded token object.
   * @returns An object containing user parameters (id and email).
   */
  validate(payload: JwtPayload): { id: string; email: string } {
    return { id: payload.sub, email: payload.email };
  }
}
