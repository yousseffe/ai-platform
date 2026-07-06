import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Pipeline } from './pipeline.entity';
import { User } from '../../users/entities/user.entity';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { PipelineRunStatus } from '../enums/pipeline-run-status.enum';
import { PipelineStepRun } from './pipeline-step-run.entity';

@Entity('pipeline_runs')
export class PipelineRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Pipeline, (pipeline) => pipeline.runs, {
    onDelete: 'CASCADE',
  })
  pipeline: Pipeline;

  @Column({ name: 'pipeline_version' })
  pipelineVersion: number;

  @ManyToOne(() => User, { nullable: true })
  triggeredBy: User | null;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string;

  @Column({ name: 'workspace_type', type: 'varchar', enum: OwnerType })
  workspaceType: OwnerType;

  @Column({ type: 'jsonb' })
  input: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  output: Record<string, unknown> | null;

  @Column({
    type: 'varchar',
    enum: PipelineRunStatus,
    default: PipelineRunStatus.PENDING,
  })
  status: PipelineRunStatus;

  @Column({
    name: 'total_cost',
    type: 'decimal',
    precision: 12,
    scale: 4,
    default: 0,
  })
  totalCost: number;

  @Column({ name: 'total_latency_ms', type: 'integer', nullable: true })
  totalLatencyMs: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @OneToMany(() => PipelineStepRun, (stepRun) => stepRun.run)
  stepRuns: PipelineStepRun[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
