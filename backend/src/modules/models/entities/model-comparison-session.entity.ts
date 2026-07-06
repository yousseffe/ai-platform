import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { ModelComparisonResult } from './model-comparison-result.entity';

@Entity('model_comparison_sessions')
export class ModelComparisonSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  @Column({
    name: 'workspace_type',
    type: 'varchar',
    enum: OwnerType,
    default: OwnerType.USER,
  })
  workspaceType: OwnerType;

  @Column({ type: 'varchar', length: 180, nullable: true })
  title: string | null;

  @Column({ name: 'input_prompt', type: 'text' })
  inputPrompt: string;

  @Column({ name: 'request_payload', type: 'jsonb' })
  requestPayload: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, unknown> | null;

  @Column({ name: 'summary_insights', type: 'jsonb', nullable: true })
  summaryInsights: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 24, default: 'COMPLETED' })
  status: string;

  @Column({ name: 'model_count', type: 'integer', default: 0 })
  modelCount: number;

  @Column({ name: 'rerun_of_session_id', type: 'uuid', nullable: true })
  rerunOfSessionId: string | null;

  @OneToMany(() => ModelComparisonResult, (result) => result.session, {
    cascade: true,
  })
  results: ModelComparisonResult[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
