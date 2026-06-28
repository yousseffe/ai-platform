import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Model } from './model.entity';
import { User } from '../../users/entities/user.entity';
import { OrgApiKey } from '../../organizations/entities/org-api-key.entity';

/**
 * Entity logging prediction/inference metrics per request.
 * Stores the caller, target model, response time, and transaction status.
 */
@Entity('model_logs')
export class ModelLog {
  /**
   * Unique UUID identifier.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The model instance executed.
   */
  @ManyToOne(() => Model, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'model_id' })
  model: Model;

  /**
   * The User consumer who requested prediction inference.
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  /**
   * The API Key token used to authenticate this prediction request.
   */
  @Column({ name: 'api_key', type: 'varchar', nullable: true })
  apiKey: string | null;

  /**
   * The organization API key entity used for project-scoped calls.
   */
  @ManyToOne(() => OrgApiKey, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'org_api_key_id' })
  orgApiKey: OrgApiKey | null;

  /**
   * Denormalized organization UUID for fast project analytics.
   */
  @Column({ name: 'org_id', type: 'uuid', nullable: true })
  orgId: string | null;

  /**
   * Denormalized project UUID for fast project analytics.
   */
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  /**
   * API key label captured at request time for readable audit trails.
   */
  @Column({ name: 'api_key_label', type: 'varchar', nullable: true })
  apiKeyLabel: string | null;

  /**
   * Masked API key prefix captured at request time.
   */
  @Column({ name: 'api_key_prefix', type: 'varchar', nullable: true })
  apiKeyPrefix: string | null;

  /**
   * Credits charged to the consuming wallet for this request.
   */
  @Column({
    name: 'credits_charged',
    type: 'decimal',
    precision: 12,
    scale: 4,
    default: 0,
  })
  creditsCharged: number;

  /**
   * The round-trip prediction process execution duration in milliseconds.
   */
  @Column({ name: 'response_time_ms', type: 'integer' })
  responseTimeMs: number;

  /**
   * Execution status flag (e.g. SUCCESS, FAILED).
   */
  @Column({ type: 'varchar', length: 20 })
  status: string;

  /**
   * HTTP status response code (e.g. 200, 401, 500).
   */
  @Column({ name: 'status_code', type: 'integer', default: 200 })
  statusCode: number;

  /**
   * Creation log timestamp.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
