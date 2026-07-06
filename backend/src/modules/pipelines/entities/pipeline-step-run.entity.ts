import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { PipelineRun } from './pipeline-run.entity';
import { PipelineStep } from './pipeline-step.entity';
import { PipelineStepRunStatus } from '../enums/pipeline-step-run-status.enum';

@Entity('pipeline_step_runs')
export class PipelineStepRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PipelineRun, (run) => run.stepRuns, { onDelete: 'CASCADE' })
  run: PipelineRun;

  @ManyToOne(() => PipelineStep, { onDelete: 'CASCADE' })
  step: PipelineStep;

  @Column()
  order: number;

  @Column({ name: 'mapped_input', type: 'jsonb', nullable: true })
  mappedInput: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, unknown> | null;

  @Column({
    type: 'varchar',
    enum: PipelineStepRunStatus,
    default: PipelineStepRunStatus.PENDING,
  })
  status: PipelineStepRunStatus;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  cost: number;

  @Column({ name: 'response_time_ms', type: 'integer', nullable: true })
  responseTimeMs: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
