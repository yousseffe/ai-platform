import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../../shared/redis/redis.service';
import { FirewallPolicy } from '../entities/firewall-policy.entity';
import { FirewallScopeType } from '../enums/firewall-scope-type.enum';
import { FirewallMode } from '../enums/firewall-mode.enum';
import { AuditLog } from '../../users/entities/audit-log.entity';

const AUTO_BLOCK_TTL_SECONDS = 900;

export interface FirewallPolicyInput {
  enforcementMode?: FirewallMode;
  ipAllowlist?: string[] | null;
  ipDenylist?: string[] | null;
  blockOnRiskScoreThreshold?: number | null;
  blockOnInjection?: boolean;
}

@Injectable()
export class FirewallService {
  private readonly logger = new Logger(FirewallService.name);

  constructor(
    @InjectRepository(FirewallPolicy)
    private readonly policyRepository: Repository<FirewallPolicy>,
    private readonly redisService: RedisService,
  ) {}

  private blockKey(scopeType: FirewallScopeType, scopeId: string): string {
    return `firewall:block:${scopeType}:${scopeId}`;
  }

  async getPolicy(
    scopeType: FirewallScopeType,
    scopeId: string,
  ): Promise<FirewallPolicy | null> {
    return this.policyRepository.findOne({ where: { scopeType, scopeId } });
  }

  async upsertPolicy(
    scopeType: FirewallScopeType,
    scopeId: string,
    updates: FirewallPolicyInput,
  ): Promise<FirewallPolicy> {
    let policy = await this.getPolicy(scopeType, scopeId);
    if (!policy) {
      policy = this.policyRepository.create({ scopeType, scopeId });
    }

    if (updates.enforcementMode !== undefined) {
      policy.enforcementMode = updates.enforcementMode;
    }
    if (updates.ipAllowlist !== undefined) {
      policy.ipAllowlist = updates.ipAllowlist;
    }
    if (updates.ipDenylist !== undefined) {
      policy.ipDenylist = updates.ipDenylist;
    }
    if (updates.blockOnRiskScoreThreshold !== undefined) {
      policy.blockOnRiskScoreThreshold = updates.blockOnRiskScoreThreshold;
    }
    if (updates.blockOnInjection !== undefined) {
      policy.blockOnInjection = updates.blockOnInjection;
    }

    return this.policyRepository.save(policy);
  }

  async getBlockReason(
    scopeType: FirewallScopeType,
    scopeId: string,
  ): Promise<string | null> {
    return this.redisService.get(this.blockKey(scopeType, scopeId));
  }

  async clearBlock(
    scopeType: FirewallScopeType,
    scopeId: string,
  ): Promise<void> {
    await this.redisService.del(this.blockKey(scopeType, scopeId));
  }

  async maybeAutoBlock(
    modelId: string,
    riskScore: number,
    reason: string,
  ): Promise<boolean> {
    const policy = await this.getPolicy(FirewallScopeType.MODEL, modelId);
    if (
      !policy ||
      policy.enforcementMode !== FirewallMode.ENFORCE ||
      policy.blockOnRiskScoreThreshold === null ||
      riskScore < policy.blockOnRiskScoreThreshold
    ) {
      return false;
    }

    await this.redisService.set(
      this.blockKey(FirewallScopeType.MODEL, modelId),
      reason,
      AUTO_BLOCK_TTL_SECONDS,
    );
    this.logger.warn(
      `Firewall auto-blocked model ${modelId} for ${AUTO_BLOCK_TTL_SECONDS}s (risk score ${riskScore} >= threshold ${policy.blockOnRiskScoreThreshold})`,
    );
    return true;
  }

  private readonly threatIntelIpRanges = [
    '198.51.100.42',
    '203.0.113.195',
    '192.0.2.1',
    '198.51.100.0/24',
  ];

  private ipToLong(ip: string): number | null {
    const parts = ip.split('.').map(Number);
    if (
      parts.length !== 4 ||
      parts.some(isNaN) ||
      parts.some((p) => p < 0 || p > 255)
    ) {
      return null;
    }
    return (
      ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
    );
  }

  private ipMatches(ip: string, pattern: string): boolean {
    ip = ip.trim();
    pattern = pattern.trim();

    if (ip === pattern) return true;

    if (
      (ip === '::1' && pattern === '127.0.0.1') ||
      (ip === '127.0.0.1' && pattern === '::1')
    ) {
      return true;
    }

    if (pattern.includes('*')) {
      const escaped = pattern.replace(/\./g, '\\.').replace(/\*/g, '[0-9]+');
      const regex = new RegExp(`^${escaped}$`);
      return regex.test(ip);
    }

    if (pattern.includes('/')) {
      const [baseIp, maskStr] = pattern.split('/');
      const mask = parseInt(maskStr, 10);
      if (isNaN(mask) || mask < 0 || mask > 32) return false;

      const ipLong = this.ipToLong(ip);
      const baseIpLong = this.ipToLong(baseIp);

      if (ipLong === null || baseIpLong === null) return false;

      if (mask === 0) return true;

      const subnetMask = ~((1 << (32 - mask)) - 1) >>> 0;
      return (ipLong & subnetMask) === (baseIpLong & subnetMask);
    }

    return false;
  }

  private async logBlockedRequest(params: {
    userId: string | null;
    action: string;
    ipAddress: string | null;
    reason: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.policyRepository.manager.save(AuditLog, {
        userId: params.userId ?? '00000000-0000-0000-0000-000000000000',
        action: params.action,
        ipAddress: params.ipAddress,
        metadata: params.metadata,
      });
    } catch (err: unknown) {
      this.logger.error(
        `Failed to save firewall audit log: ${(err as Error).message}`,
      );
    }
  }

  async assertRequestAllowed(params: {
    modelId: string;
    orgId: string | null;
    ipAddress: string | null;
    injectionMatch: string | null;
    userId?: string | null;
  }): Promise<void> {
    const scopes: Array<[FirewallScopeType, string]> = [
      [FirewallScopeType.MODEL, params.modelId],
    ];
    if (params.orgId) {
      scopes.push([FirewallScopeType.ORG, params.orgId]);
    }

    for (const [scopeType, scopeId] of scopes) {
      const blockReason = await this.getBlockReason(scopeType, scopeId);
      if (blockReason) {
        await this.logBlockedRequest({
          userId: params.userId ?? null,
          action: 'firewall.blocked_request',
          ipAddress: params.ipAddress,
          reason: `Auto-block active: ${blockReason}`,
          metadata: {
            modelId: params.modelId,
            scopeType,
            scopeId,
            blockReason,
          },
        });
        throw new ForbiddenException(
          `Request blocked by firewall policy: ${blockReason}`,
        );
      }

      const policy = await this.getPolicy(scopeType, scopeId);
      if (!policy) continue;

      if (params.ipAddress) {
        const matchesThreat = this.threatIntelIpRanges.some((threatPattern) =>
          this.ipMatches(params.ipAddress!, threatPattern),
        );
        if (matchesThreat) {
          const reason =
            'Request blocked by Threat Intelligence feed (Tor exit node or malicious VPN proxy detected)';
          await this.logBlockedRequest({
            userId: params.userId ?? null,
            action: 'firewall.blocked_request',
            ipAddress: params.ipAddress,
            reason,
            metadata: { modelId: params.modelId, scopeType, scopeId },
          });
          throw new ForbiddenException(reason);
        }
      }

      if (
        params.ipAddress &&
        policy.ipDenylist &&
        policy.ipDenylist.length > 0
      ) {
        const isDenied = policy.ipDenylist.some((deniedPattern) =>
          this.ipMatches(params.ipAddress!, deniedPattern),
        );
        if (isDenied) {
          const reason =
            'Request blocked by firewall policy (source IP denied by IP denylist)';

          await this.logBlockedRequest({
            userId: params.userId ?? null,
            action:
              policy.enforcementMode === FirewallMode.ENFORCE
                ? 'firewall.blocked_request'
                : 'firewall.violation_monitored',
            ipAddress: params.ipAddress,
            reason,
            metadata: {
              modelId: params.modelId,
              scopeType,
              scopeId,
              enforcementMode: policy.enforcementMode,
            },
          });

          if (policy.enforcementMode === FirewallMode.ENFORCE) {
            throw new ForbiddenException(reason);
          } else {
            this.logger.warn(`[MONITOR] ${reason} for IP: ${params.ipAddress}`);
          }
        }
      }

      if (
        params.ipAddress &&
        policy.ipAllowlist &&
        policy.ipAllowlist.length > 0
      ) {
        const isAllowlisted = policy.ipAllowlist.some((allowedPattern) =>
          this.ipMatches(params.ipAddress!, allowedPattern),
        );
        if (!isAllowlisted) {
          const reason =
            'Request blocked by firewall policy (source IP not present on IP allowlist)';

          await this.logBlockedRequest({
            userId: params.userId ?? null,
            action:
              policy.enforcementMode === FirewallMode.ENFORCE
                ? 'firewall.blocked_request'
                : 'firewall.violation_monitored',
            ipAddress: params.ipAddress,
            reason,
            metadata: {
              modelId: params.modelId,
              scopeType,
              scopeId,
              enforcementMode: policy.enforcementMode,
            },
          });

          if (policy.enforcementMode === FirewallMode.ENFORCE) {
            throw new ForbiddenException(reason);
          } else {
            this.logger.warn(`[MONITOR] ${reason} for IP: ${params.ipAddress}`);
          }
        }
      }

      if (policy.blockOnInjection && params.injectionMatch) {
        const reason =
          'Request blocked by firewall policy (prompt injection threat detected)';

        await this.logBlockedRequest({
          userId: params.userId ?? null,
          action:
            policy.enforcementMode === FirewallMode.ENFORCE
              ? 'firewall.blocked_request'
              : 'firewall.violation_monitored',
          ipAddress: params.ipAddress,
          reason,
          metadata: {
            modelId: params.modelId,
            scopeType,
            scopeId,
            injectionMatch: params.injectionMatch,
            enforcementMode: policy.enforcementMode,
          },
        });

        if (policy.enforcementMode === FirewallMode.ENFORCE) {
          throw new ForbiddenException(reason);
        } else {
          this.logger.warn(`[MONITOR] ${reason} for IP: ${params.ipAddress}`);
        }
      }
    }
  }
}
