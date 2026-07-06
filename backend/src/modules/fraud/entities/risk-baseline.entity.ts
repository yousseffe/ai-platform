import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('risk_baselines')
export class RiskBaseline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'model_id', type: 'uuid', unique: true })
  modelId: string;

  @Column({
    name: 'ewma_request_rate_per_min',
    type: 'decimal',
    precision: 12,
    scale: 4,
    default: 0,
  })
  ewmaRequestRatePerMin: number;

  @Column({
    name: 'ewma_error_rate',
    type: 'decimal',
    precision: 6,
    scale: 4,
    default: 0,
  })
  ewmaErrorRate: number;

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
