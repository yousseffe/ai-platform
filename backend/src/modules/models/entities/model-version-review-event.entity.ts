import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Model } from './model.entity';
import { ModelVersion } from './model-version.entity';
import { User } from '../../users/entities/user.entity';
import { VersionReviewAction } from '../enums/version-review-action.enum';

/**
 * Append-only history event for organization model governance.
 */
@Entity('model_version_review_events')
export class ModelVersionReviewEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Model, { onDelete: 'CASCADE' })
  model: Model;

  @ManyToOne(() => ModelVersion, { nullable: true, onDelete: 'CASCADE' })
  version: ModelVersion | null;

  @ManyToOne(() => User, { nullable: true })
  actor: User | null;

  @Column({ type: 'varchar', enum: VersionReviewAction })
  action: VersionReviewAction;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
