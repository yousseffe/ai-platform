import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Model } from './model.entity';
import { ModelComparisonSession } from './model-comparison-session.entity';

@Entity('model_comparison_results')
export class ModelComparisonResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ModelComparisonSession, (session) => session.results, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session: ModelComparisonSession;

  @ManyToOne(() => Model, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'model_id' })
  model: Model | null;

  @Column({ name: 'model_name', type: 'varchar', length: 180 })
  modelName: string;

  @Column({
    name: 'provider_name',
    type: 'varchar',
    length: 180,
    nullable: true,
  })
  providerName: string | null;

  @Column({ name: 'model_type', type: 'varchar', length: 50, nullable: true })
  modelType: string | null;

  @Column({ name: 'task_type', type: 'varchar', length: 50, nullable: true })
  taskType: string | null;

  @Column({ name: 'framework', type: 'varchar', length: 50, nullable: true })
  framework: string | null;

  @Column({ name: 'modality', type: 'varchar', length: 50, nullable: true })
  modality: string | null;

  @Column({
    name: 'model_version',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  modelVersion: string | null;

  @Column({ name: 'response_output', type: 'text', nullable: true })
  responseOutput: string | null;

  @Column({ name: 'response_json', type: 'jsonb', nullable: true })
  responseJson: Record<string, unknown> | null;

  @Column({ name: 'latency_ms', type: 'integer', nullable: true })
  latencyMs: number | null;

  @Column({
    name: 'cost_credits',
    type: 'decimal',
    precision: 12,
    scale: 4,
    default: 0,
  })
  costCredits: number;

  @Column({ name: 'input_tokens', type: 'integer', nullable: true })
  inputTokens: number | null;

  @Column({ name: 'output_tokens', type: 'integer', nullable: true })
  outputTokens: number | null;

  @Column({ name: 'total_tokens', type: 'integer', nullable: true })
  totalTokens: number | null;

  @Column({ type: 'varchar', length: 24, default: 'FAILED' })
  status: string;

  @Column({ name: 'status_code', type: 'integer', nullable: true })
  statusCode: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({
    name: 'quality_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  qualityScore: number | null;

  @Column({
    name: 'value_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  valueScore: number | null;

  @Column({ name: 'result_rank', type: 'integer', nullable: true })
  resultRank: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
