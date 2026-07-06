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

@Entity('firewall_policies')
@Unique(['scopeType', 'scopeId'])
export class FirewallPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'scope_type', type: 'varchar', enum: FirewallScopeType })
  scopeType: FirewallScopeType;

  @Column({ name: 'scope_id', type: 'uuid' })
  scopeId: string;

  @Column({
    name: 'enforcement_mode',
    type: 'varchar',
    enum: FirewallMode,
    default: FirewallMode.MONITOR,
  })
  enforcementMode: FirewallMode;

  @Column({ name: 'ip_allowlist', type: 'jsonb', nullable: true })
  ipAllowlist: string[] | null;

  @Column({ name: 'ip_denylist', type: 'jsonb', nullable: true })
  ipDenylist: string[] | null;

  @Column({
    name: 'block_on_risk_score_threshold',
    type: 'integer',
    nullable: true,
  })
  blockOnRiskScoreThreshold: number | null;

  @Column({ name: 'block_on_injection', type: 'boolean', default: false })
  blockOnInjection: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
