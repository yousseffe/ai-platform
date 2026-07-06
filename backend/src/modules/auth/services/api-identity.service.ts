import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { ApiKey } from '../entities/api-key.entity';
import { OrgApiKey } from '../../organizations/entities/org-api-key.entity';
import { McpToken } from '../entities/mcp-token.entity';
import { getRsaKeys } from '../utils/keys';
import { ApiIdentity } from '../interfaces/api-identity.interface';

interface JwtIdentityPayload {
  sub: string;
  email: string;
}

@Injectable()
export class ApiIdentityService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(OrgApiKey)
    private readonly orgApiKeyRepository: Repository<OrgApiKey>,
    @InjectRepository(McpToken)
    private readonly mcpTokenRepository: Repository<McpToken>,
  ) {}

  async resolve(authHeader: string | undefined): Promise<ApiIdentity> {
    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization format');
    }

    if (token.startsWith('mcp_')) {
      return this.resolveMcpToken(token);
    }

    if (token.startsWith('sk_live_')) {
      return this.resolveOrgKey(token);
    }

    if (token.startsWith('ml_sk_live_') || token.startsWith('ml_sk_trial_')) {
      return this.resolvePersonalKey(token);
    }

    return this.resolveJwt(token);
  }

  private async resolveOrgKey(token: string): Promise<ApiIdentity> {
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

    return {
      scope: 'org',
      keyType: 'org',
      userId: null,
      email: `org:${orgApiKey.orgId}`,
      orgId: orgApiKey.orgId,
      projectId: orgApiKey.projectId,
      modelId: null,
    };
  }

  private async resolvePersonalKey(token: string): Promise<ApiIdentity> {
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

    return {
      scope: 'user',
      keyType: token.startsWith('ml_sk_trial_') ? 'trial' : 'personal',
      userId: apiKeyEntity.user.id,
      email: apiKeyEntity.user.email,
      orgId: null,
      projectId: null,
      modelId: apiKeyEntity.model ? apiKeyEntity.model.id : null,
    };
  }

  private async resolveJwt(token: string): Promise<ApiIdentity> {
    try {
      const keys = getRsaKeys();
      const payload = await this.jwtService.verifyAsync<JwtIdentityPayload>(
        token,
        {
          publicKey: keys.publicKey,
          algorithms: ['RS256'],
        },
      );

      return {
        scope: 'user',
        keyType: 'jwt',
        userId: payload.sub,
        email: payload.email,
        orgId: null,
        projectId: null,
        modelId: null,
      };
    } catch {
      throw new UnauthorizedException('Invalid JWT token or API Key');
    }
  }

  private async resolveMcpToken(token: string): Promise<ApiIdentity> {
    const keyHash = crypto.createHash('sha256').update(token).digest('hex');
    const mcpToken = await this.mcpTokenRepository.findOne({
      where: { keyHash, isActive: true },
      relations: ['user'],
    });

    if (!mcpToken) {
      throw new UnauthorizedException('Invalid or revoked MCP Access Token');
    }

    if (mcpToken.expiresAt && mcpToken.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('MCP Access Token has expired');
    }

    this.mcpTokenRepository
      .update(mcpToken.id, { lastUsedAt: new Date() })
      .catch(() => undefined);

    return {
      scope: 'user',
      keyType: 'mcp',
      userId: mcpToken.user.id,
      email: mcpToken.user.email,
      orgId: null,
      projectId: null,
      modelId: null,
      mcpScopes: mcpToken.scopes,
    };
  }
}
