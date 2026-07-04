import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../../shared/redis/redis.service';
import { FirewallPolicy } from '../entities/firewall-policy.entity';
import { FirewallScopeType } from '../enums/firewall-scope-type.enum';
import { FirewallMode } from '../enums/firewall-mode.enum';

const AUTO_BLOCK_TTL_SECONDS = 900; // 15 minutes

/** Fields a caller may set on a {@link FirewallPolicy}. */
export interface FirewallPolicyInput {
  enforcementMode?: FirewallMode;
  ipAllowlist?: string[] | null;
  ipDenylist?: string[] | null;
  blockOnRiskScoreThreshold?: number | null;
  blockOnInjection?: boolean;
}

/**
 * Model/organization-scoped security policy gateway. Enforces IP allow/deny
 * lists and prompt-injection blocking on the prediction path, and exposes a
 * Redis-backed temporary auto-block that the fraud engine can trip when a
 * scope's risk score crosses a policy's configured threshold.
 */
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

  /** Reads the policy for a scope, or null if none has been configured. */
  async getPolicy(
    scopeType: FirewallScopeType,
    scopeId: string,
  ): Promise<FirewallPolicy | null> {
    return this.policyRepository.findOne({ where: { scopeType, scopeId } });
  }

  /**
   * Creates or updates the policy for a scope, leaving any field not present
   * in `updates` unchanged (or defaulted, on first creation).
   */
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

  /** Returns the active auto-block reason for a scope, or null if not blocked. */
  async getBlockReason(
    scopeType: FirewallScopeType,
    scopeId: string,
  ): Promise<string | null> {
    return this.redisService.get(this.blockKey(scopeType, scopeId));
  }

  /** Manually lifts an active auto-block for a scope. */
  async clearBlock(scopeType: FirewallScopeType, scopeId: string): Promise<void> {
    await this.redisService.del(this.blockKey(scopeType, scopeId));
  }

  /**
   * Called by the fraud engine after persisting a risk finding. Trips a
   * temporary auto-block if the scope has an ENFORCE-mode policy whose
   * threshold the finding's risk score meets or exceeds.
   *
   * @returns True if a block was applied.
   */
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

  /**
   * Checks a prediction request against the model's and (if applicable) the
   * organization's firewall policies: IP allow/deny lists, an active
   * auto-block, and — in ENFORCE mode — prompt-injection blocking.
   *
   * @throws {ForbiddenException} If any policy rejects the request.
   */
  async assertRequestAllowed(params: {
    modelId: string;
    orgId: string | null;
    ipAddress: string | null;
    injectionMatch: string | null;
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
        throw new ForbiddenException(
          `Request blocked by firewall policy: ${blockReason}`,
        );
      }

      const policy = await this.getPolicy(scopeType, scopeId);
      if (!policy) continue;

      if (params.ipAddress && policy.ipDenylist?.includes(params.ipAddress)) {
        throw new ForbiddenException(
          'Request blocked by firewall policy (source IP denied)',
        );
      }

      if (
        params.ipAddress &&
        policy.ipAllowlist &&
        policy.ipAllowlist.length > 0 &&
        !policy.ipAllowlist.includes(params.ipAddress)
      ) {
        throw new ForbiddenException(
          'Request blocked by firewall policy (source IP not allowlisted)',
        );
      }

      if (
        policy.enforcementMode === FirewallMode.ENFORCE &&
        policy.blockOnInjection &&
        params.injectionMatch
      ) {
        throw new ForbiddenException(
          'Request blocked by firewall policy (prompt injection detected)',
        );
      }
    }
  }
}
