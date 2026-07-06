import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { PipelineStatus } from '../enums/pipeline-status.enum';
import { PipelineType } from '../enums/pipeline-type.enum';
import { PipelineStep } from './pipeline-step.entity';
import { PipelineRun } from './pipeline-run.entity';

@Entity('pipelines')
export class Pipeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Organization, { nullable: true })
  organization: Organization | null;

  @Column({
    type: 'varchar',
    enum: PipelineStatus,
    default: PipelineStatus.DRAFT,
  })
  status: PipelineStatus;

  @Column({
    type: 'varchar',
    enum: PipelineType,
    default: PipelineType.SEQUENTIAL_CHAIN,
  })
  type: PipelineType;

  @Column({ default: 1 })
  version: number;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @OneToMany(() => PipelineStep, (step) => step.pipeline)
  steps: PipelineStep[];

  @OneToMany(() => PipelineRun, (run) => run.pipeline)
  runs: PipelineRun[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
