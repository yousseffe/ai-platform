import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { FiredRule } from '../fraud-rules';

@Entity('risk_events')
export class RiskEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'model_id', type: 'uuid' })
  modelId: string;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string | null;

  @Column({ name: 'risk_score', type: 'integer' })
  riskScore: number;

  @Column({ name: 'threat_class', type: 'varchar' })
  threatClass: string;

  @Column({ name: 'fired_rules', type: 'jsonb' })
  firedRules: FiredRule[];

  @Column({ type: 'jsonb' })
  evidence: Record<string, unknown>;

  @Column({ type: 'jsonb' })
  recommendations: string[];

  @Column({ name: 'window_minutes', type: 'integer' })
  windowMinutes: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
