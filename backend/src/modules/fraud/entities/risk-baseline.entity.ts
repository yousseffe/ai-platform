import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Rolling EWMA baseline of normal traffic for a model, used by the fraud engine
 * to detect deviations. One row per model.
 */
@Entity('risk_baselines')
export class RiskBaseline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The model this baseline tracks. */
  @Column({ name: 'model_id', type: 'uuid', unique: true })
  modelId: string;

  /** EWMA of requests per minute. */
  @Column({
    name: 'ewma_request_rate_per_min',
    type: 'decimal',
    precision: 12,
    scale: 4,
    default: 0,
  })
  ewmaRequestRatePerMin: number;

  /** EWMA of the error rate (0..1). */
  @Column({
    name: 'ewma_error_rate',
    type: 'decimal',
    precision: 6,
    scale: 4,
    default: 0,
  })
  ewmaErrorRate: number;

  /** EWMA of average latency in milliseconds. */
  @Column({
    name: 'ewma_latency_ms',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  ewmaLatencyMs: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
