import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Pipeline } from './pipeline.entity';
import { ModelVersion } from '../../models/entities/model-version.entity';
import { PipelineStepSource } from '../enums/pipeline-step-source.enum';
import { PipelinePinPolicy } from '../enums/pipeline-pin-policy.enum';

@Entity('pipeline_steps')
export class PipelineStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Pipeline, (pipeline) => pipeline.steps, {
    onDelete: 'CASCADE',
  })
  pipeline: Pipeline;

  @Column()
  order: number;

  @Column({ type: 'varchar', nullable: true })
  label: string | null;

  @Column({ type: 'varchar', nullable: true })
  role: string | null;

  @Column({
    type: 'varchar',
    enum: PipelineStepSource,
    default: PipelineStepSource.EXISTING,
  })
  source: PipelineStepSource;

  @ManyToOne(() => ModelVersion, { nullable: true })
  modelVersion: ModelVersion | null;

  @Column({
    type: 'varchar',
    enum: PipelinePinPolicy,
    default: PipelinePinPolicy.PINNED,
  })
  pinPolicy: PipelinePinPolicy;

  @Column({ name: 'timeout_ms', type: 'integer', nullable: true })
  timeoutMs: number | null;

  @Column({ name: 'max_retries', type: 'integer', default: 0 })
  maxRetries: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
