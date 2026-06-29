import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { ApiKey } from '../entities/api-key.entity';
import { OrgApiKey } from '../../organizations/entities/org-api-key.entity';
import { getRsaKeys } from '../utils/keys';
import { ApiIdentity } from '../interfaces/api-identity.interface';

interface JwtIdentityPayload {
  sub: string;
  email: string;
}

/**
 * Resolves any platform credential (organization key, personal/trial model key,
 * or RS256 JWT) to a scoped identity, without requiring a model-id route param.
 *
 * Used by the `whoami` endpoint so the MCP server can validate a caller's key
 * once and scope every subsequent tool call. Returns no secret material.
 */
@Injectable()
export class ApiIdentityService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(OrgApiKey)
    private readonly orgApiKeyRepository: Repository<OrgApiKey>,
  ) {}

  /**
   * Parses an `Authorization` header and resolves the caller's identity.
   *
   * @param authHeader - Raw `Authorization` header value (`Bearer <token>`).
   * @returns The resolved, scoped identity for the credential.
   * @throws {UnauthorizedException} If the header is missing or the credential is invalid/expired/revoked.
   */
  async resolve(authHeader: string | undefined): Promise<ApiIdentity> {
    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Authorization format');
    }

    if (token.startsWith('sk_live_')) {
      return this.resolveOrgKey(token);
    }

    if (token.startsWith('ml_sk_live_') || token.startsWith('ml_sk_trial_')) {
      return this.resolvePersonalKey(token);
    }

    return this.resolveJwt(token);
  }

  /**
   * Resolves an organization API key (`sk_live_*`) via its SHA-256 hash.
   */
  private async resolveOrgKey(token: string): Promise<ApiIdentity> {
    const keyHash = crypto.createHash('sha256').update(token).digest('hex');
    const orgApiKey = await this.orgApiKeyRepository.findOne({
      where: { keyHash, isActive: true },
    });

    if (!orgApiKey) {
      throw new UnauthorizedException('Invalid or revoked organization API Key');
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

  /**
   * Resolves a personal/trial model-scoped key (`ml_sk_live_*` / `ml_sk_trial_*`).
   * Validates activation and expiry but, unlike the prediction guard, does not
   * require the bound model to match a route param.
   */
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

  /**
   * Resolves a standard RS256 platform JWT.
   */
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
}
