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
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * The API Key token used to authenticate this prediction request.
   */
  @Column({ name: 'api_key', type: 'varchar', nullable: true })
  apiKey: string | null;

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
