import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { FirewallScopeType } from '../enums/firewall-scope-type.enum';
import { FirewallMode } from '../enums/firewall-mode.enum';

/**
 * A security policy scoped to a single model or organization: IP allow/deny
 * lists, prompt-injection blocking, and an auto-block threshold wired to the
 * fraud engine's risk score. In MONITOR mode, violations are only logged; in
 * ENFORCE mode, matching requests are rejected before reaching the container.
 */
@Entity('firewall_policies')
@Unique(['scopeType', 'scopeId'])
export class FirewallPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Whether this policy applies to a single model or an entire organization. */
  @Column({ name: 'scope_type', type: 'varchar', enum: FirewallScopeType })
  scopeType: FirewallScopeType;

  /** UUID of the model or organization this policy applies to. */
  @Column({ name: 'scope_id', type: 'uuid' })
  scopeId: string;

  /** MONITOR (log only) or ENFORCE (actively reject matching requests). */
  @Column({
    name: 'enforcement_mode',
    type: 'varchar',
    enum: FirewallMode,
    default: FirewallMode.MONITOR,
  })
  enforcementMode: FirewallMode;

  /**
   * If non-empty, only requests from these IPs/CIDRs are allowed.
   * Null/empty means no allowlist restriction.
   */
  @Column({ name: 'ip_allowlist', type: 'jsonb', nullable: true })
  ipAllowlist: string[] | null;

  /** Requests from these IPs are always rejected, regardless of mode. */
  @Column({ name: 'ip_denylist', type: 'jsonb', nullable: true })
  ipDenylist: string[] | null;

  /**
   * Fraud engine risk score (0-100) at or above which the scope is
   * automatically, temporarily blocked. Null disables auto-blocking.
   */
  @Column({
    name: 'block_on_risk_score_threshold',
    type: 'integer',
    nullable: true,
  })
  blockOnRiskScoreThreshold: number | null;

  /**
   * When true (and mode is ENFORCE), requests whose payload matches a
   * prompt-injection pattern are rejected instead of just logged.
   */
  @Column({ name: 'block_on_injection', type: 'boolean', default: false })
  blockOnInjection: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
