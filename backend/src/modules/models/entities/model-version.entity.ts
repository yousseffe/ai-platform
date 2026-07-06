import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Model } from './model.entity';
import { User } from '../../users/entities/user.entity';
import { Deployment } from '../../deployments/entities/deployment.entity';
import { VersionStatus } from '../enums/version-status.enum';
import { VersionReviewStatus } from '../enums/version-review-status.enum';
import { SchemaDetectionStatus } from '../enums/schema-detection-status.enum';
import { ModelVersionTestCase } from './model-version-test-case.entity';

@Entity('model_versions')
export class ModelVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Model, (model) => model.versions, { onDelete: 'CASCADE' })
  model: Model;

  @ManyToOne(() => User, { nullable: true })
  uploadedBy: User | null;

  @Column()
  versionNumber: number;

  @Column({
    type: 'varchar',
    enum: VersionStatus,
    default: VersionStatus.UPLOADED,
  })
  status: VersionStatus;

  @Column({
    name: 'review_status',
    type: 'varchar',
    enum: VersionReviewStatus,
    default: VersionReviewStatus.NOT_REQUIRED,
  })
  reviewStatus: VersionReviewStatus;

  @ManyToOne(() => User, { nullable: true })
  reviewedBy: User | null;

  @Column({ name: 'review_comment', type: 'text', nullable: true })
  reviewComment: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @Column({ nullable: false })
  modelFilePath: string;

  @Column({ type: 'varchar', nullable: true })
  scalerFilePath: string | null;

  @Column({ type: 'varchar', nullable: true })
  preprocessFilePath: string | null;

  @Column({ type: 'varchar', nullable: true })
  postprocessFilePath: string | null;

  @Column({ type: 'text', nullable: true })
  examplePayload: string | null;

  @Column({ type: 'text', nullable: true })
  expectedResult: string | null;

  @Column({
    name: 'schema_detection_status',
    type: 'varchar',
    enum: SchemaDetectionStatus,
    default: SchemaDetectionStatus.MANUAL,
  })
  schemaDetectionStatus: SchemaDetectionStatus;

  @Column({ name: 'class_labels', type: 'jsonb', nullable: true })
  classLabels: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'text', nullable: true })
  buildLogs: string | null;

  @Column({ type: 'int', default: 0 })
  buildProgress: number;

  @OneToMany(() => Deployment, (deployment) => deployment.modelVersion)
  deployments: Deployment[];

  @OneToMany(() => ModelVersionTestCase, (testCase) => testCase.version)
  testCases: ModelVersionTestCase[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
