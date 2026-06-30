import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import type { Request as ExpressRequest } from 'express';
import { ApiKey } from '../entities/api-key.entity';
import { McpToken } from '../entities/mcp-token.entity';
import { OrgApiKey } from '../../organizations/entities/org-api-key.entity';
import { getRsaKeys } from '../utils/keys';
import { SystemConfig } from '../../wallets/entities/system-config.entity';
import { OwnerType } from '../../../shared/enums/owner-type.enum';

interface AuthenticatedApiRequest extends ExpressRequest {
  user?: {
    id: string;
    email: string;
    apiKey?: string;
    apiKeyType?: string;
    jti?: string;
    orgApiKeyId?: string;
    orgApiKeyLabel?: string;
    orgApiKeyPrefix?: string;
    orgId?: string;
    projectId?: string;
  };
  workspaceId?: string;
  workspaceType?: OwnerType;
}

interface JwtPayload {
  sub: string;
  email: string;
  jti?: string;
}

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
    @InjectRepository(OrgApiKey)
    private readonly orgApiKeyRepository: Repository<OrgApiKey>,
    @InjectRepository(McpToken)
    private readonly mcpTokenRepository: Repository<McpToken>,
  ) {}

  /**
   * Asserts whether the request is authorized.
   *
   * @param context - Execution context.
   * @returns Boolean indicating authorization.
   * @throws {UnauthorizedException} If credentials are missing or invalid.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedApiRequest>();
    const authHeaderValue = request.headers.authorization;
    const authHeader = Array.isArray(authHeaderValue)
      ? authHeaderValue[0]
      : authHeaderValue;

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization format');
    }

    // MCP access tokens (mcp_...) — issued by the platform's MCP token service.
    // Forwarded by the MCP server when it calls backend admin endpoints on behalf
    // of an authenticated admin caller.
    if (token.startsWith('mcp_')) {
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');
      const mcpToken = await this.mcpTokenRepository.findOne({
        where: { keyHash, isActive: true },
        relations: ['user'],
      });

      if (!mcpToken) {
        throw new UnauthorizedException('Invalid or revoked MCP token');
      }

      if (mcpToken.expiresAt && mcpToken.expiresAt.getTime() < Date.now()) {
        throw new UnauthorizedException('MCP token has expired');
      }

      this.mcpTokenRepository
        .update(mcpToken.id, { lastUsedAt: new Date() })
        .catch(() => undefined);

      request.user = {
        id: mcpToken.user.id,
        email: mcpToken.user.email,
      };
      return true;
    }

    if (token.startsWith('sk_live_')) {
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');
      const orgApiKey = await this.orgApiKeyRepository.findOne({
        where: { keyHash, isActive: true },
      });

      if (!orgApiKey) {
        throw new UnauthorizedException(
          'Invalid or revoked organization API Key',
        );
      }

      this.orgApiKeyRepository
        .update(orgApiKey.id, { lastUsedAt: new Date() })
        .catch(() => undefined);

      request.user = {
        id: `org-key:${orgApiKey.id}`,
        email: `org:${orgApiKey.orgId}`,
        apiKey: orgApiKey.keyPrefix,
        orgApiKeyId: orgApiKey.id,
        orgApiKeyLabel: orgApiKey.label,
        orgApiKeyPrefix: orgApiKey.keyPrefix,
        orgId: orgApiKey.orgId,
        projectId: orgApiKey.projectId,
      };
      request.workspaceId = orgApiKey.orgId;
      request.workspaceType = OwnerType.ORG;
      return true;
    }

    // Check if it's a personal/model-scoped API Key
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
        throw new UnauthorizedException(
          'Target model ID parameter missing from request',
        );
      }

      if (!apiKeyEntity.model || apiKeyEntity.model.id !== modelId) {
        throw new UnauthorizedException(
          'API Key does not authorize access to this model',
        );
      }

      // If it is a trial key, verify call limits
      if (token.startsWith('ml_sk_trial_')) {
        const limitConfig = await this.apiKeyRepository.manager
          .getRepository(SystemConfig)
          .findOne({
            where: { key: 'playground_trial_limit' },
          });
        const limit = limitConfig ? parseInt(limitConfig.value, 10) : 50;

        if (apiKeyEntity.callsCount >= limit) {
          throw new UnauthorizedException(
            'Playground trial call limit reached. Please generate a live API Key.',
          );
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
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
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
    } catch {
      throw new UnauthorizedException('Invalid JWT token or API Key');
    }
  }
}
