import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { FiredRule } from '../fraud-rules';

/**
 * A persisted fraud/abuse finding for a model. Read-only output of the fraud
 * engine — the platform reports it (and alerts the owner); it does not enforce.
 */
@Entity('risk_events')
export class RiskEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The model the finding concerns. */
  @Index()
  @Column({ name: 'model_id', type: 'uuid' })
  modelId: string;

  /** Owning user id, denormalized for scoped lookups. */
  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string | null;

  /** Normalized risk score (0..100). */
  @Column({ name: 'risk_score', type: 'integer' })
  riskScore: number;

  /** The dominant threat classification. */
  @Column({ name: 'threat_class', type: 'varchar' })
  threatClass: string;

  /** The rules that fired, with severity and detail. */
  @Column({ name: 'fired_rules', type: 'jsonb' })
  firedRules: FiredRule[];

  /** Supporting evidence snapshot (aggregated counters, no raw inputs). */
  @Column({ type: 'jsonb' })
  evidence: Record<string, unknown>;

  /** Recommended actions for the owner/agent. */
  @Column({ type: 'jsonb' })
  recommendations: string[];

  /** Analysis window in minutes. */
  @Column({ name: 'window_minutes', type: 'integer' })
  windowMinutes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
