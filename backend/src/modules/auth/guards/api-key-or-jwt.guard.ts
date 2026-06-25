import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';
import { getRsaKeys } from '../utils/keys';
import { SystemConfig } from '../../wallets/entities/system-config.entity';

/**
 * Guard that permits request execution if a valid API Key OR a valid JWT token
 * is supplied via the Authorization header.
 */
@Injectable()
export class ApiKeyOrJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  /**
   * Asserts whether the request is authorized.
   *
   * @param context - Execution context.
   * @returns Boolean indicating authorization.
   * @throws {UnauthorizedException} If credentials are missing or invalid.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization format');
    }

    // Check if it's an API Key
    if (token.startsWith('ml_sk_live_') || token.startsWith('ml_sk_trial_')) {
      const apiKeyEntity = await this.apiKeyRepository.findOne({
        where: { key: token, isActive: true },
        relations: ['user', 'model'],
      });

      if (!apiKeyEntity) {
        throw new UnauthorizedException('Invalid or revoked API Key');
      }

      if (
        apiKeyEntity.expiresAt &&
        apiKeyEntity.expiresAt.getTime() < Date.now()
      ) {
        throw new UnauthorizedException('API Key has expired');
      }

      // Verify key belongs to the model requested in parameter ID
      const modelId = request.params.id;
      if (!modelId) {
        throw new UnauthorizedException('Target model ID parameter missing from request');
      }

      if (!apiKeyEntity.model || apiKeyEntity.model.id !== modelId) {
        throw new UnauthorizedException('API Key does not authorize access to this model');
      }

      // If it is a trial key, verify call limits
      if (token.startsWith('ml_sk_trial_')) {
        const limitConfig = await this.apiKeyRepository.manager.getRepository(SystemConfig).findOne({
          where: { key: 'playground_trial_limit' },
        });
        const limit = limitConfig ? parseInt(limitConfig.value, 10) : 50;

        if (apiKeyEntity.callsCount >= limit) {
          throw new UnauthorizedException('Playground trial call limit reached. Please generate a live API Key.');
        }

        apiKeyEntity.callsCount += 1;
        await this.apiKeyRepository.save(apiKeyEntity);
      }

      // Populate request user
      request.user = {
        id: apiKeyEntity.user.id,
        email: apiKeyEntity.user.email,
        apiKey: apiKeyEntity.key,
        apiKeyType: apiKeyEntity.type,
      };
      return true;
    }

    // Otherwise, verify as standard JWT
    try {
      const keys = getRsaKeys();
      const payload = await this.jwtService.verifyAsync(token, {
        secret: undefined,
        publicKey: keys.publicKey,
        algorithms: ['RS256'],
      });

      request.user = {
        id: payload.sub,
        email: payload.email,
        jti: payload.jti,
      };
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid JWT token or API Key');
    }
  }
}
