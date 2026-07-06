import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Model } from '../../models/entities/model.entity';

@Entity('org_api_keys')
export class OrgApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @ManyToOne(() => Model, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'model_id' })
  model: Model | null;

  @Column({ name: 'key_hash', type: 'varchar', unique: true })
  keyHash: string;

  @Column({ name: 'key_prefix', type: 'varchar' })
  keyPrefix: string;

  @Column({ length: 80 })
  label: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'max_requests_per_minute', type: 'integer', nullable: true })
  maxRequestsPerMinute: number | null;

  @Column({
    name: 'max_daily_spend_credits',
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  maxDailySpendCredits: number | null;

  @Column({ name: 'suspended_reason', type: 'varchar', nullable: true })
  suspendedReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
