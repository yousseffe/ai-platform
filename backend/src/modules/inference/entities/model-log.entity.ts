import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Model } from '../../models/entities/model.entity';
import { User } from '../../users/entities/user.entity';
import { OrgApiKey } from '../../organizations/entities/org-api-key.entity';
import { InferenceStatus } from '../enums/inference-status.enum';

@Entity('model_logs')
export class ModelLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Model, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'model_id' })
  model: Model;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'api_key', type: 'varchar', nullable: true })
  apiKey: string | null;

  @ManyToOne(() => OrgApiKey, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'org_api_key_id' })
  orgApiKey: OrgApiKey | null;

  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  orgId: string | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ name: 'api_key_label', type: 'varchar', nullable: true })
  apiKeyLabel: string | null;

  @Column({ name: 'api_key_prefix', type: 'varchar', nullable: true })
  apiKeyPrefix: string | null;

  @Column({
    name: 'credits_charged',
    type: 'decimal',
    precision: 12,
    scale: 4,
    default: 0,
  })
  creditsCharged: number;

  @Column({ name: 'response_time_ms', type: 'integer' })
  responseTimeMs: number;

  @Column({ type: 'varchar', length: 20 })
  status: InferenceStatus;

  @Column({ name: 'status_code', type: 'integer', default: 200 })
  statusCode: number;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent: string | null;

  @Column({ name: 'x_forwarded_for', type: 'varchar', nullable: true })
  xForwardedFor: string | null;

  @Column({ name: 'request_size_bytes', type: 'integer', nullable: true })
  requestSizeBytes: number | null;

  @Column({ name: 'response_size_bytes', type: 'integer', nullable: true })
  responseSizeBytes: number | null;

  @Column({ name: 'payload_hash', type: 'varchar', nullable: true })
  payloadHash: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'injection_match', type: 'varchar', nullable: true })
  injectionMatch: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
