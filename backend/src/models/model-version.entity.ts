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
import { Deployment } from '../deployments/deployment.entity';

export enum VersionStatus {
  UPLOADED = 'uploaded',
  BUILDING = 'building',
  READY = 'ready',
  FAILED = 'failed',
}

@Entity('model_versions')
export class ModelVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Model, (model) => model.versions, { onDelete: 'CASCADE' })
  model: Model;

  @Column()
  versionNumber: number;

  @Column({
    type: 'varchar',
    enum: VersionStatus,
    default: VersionStatus.UPLOADED,
  })
  status: VersionStatus;

  @Column({ nullable: false })
  modelFilePath: string;

  @Column({ nullable: true })
  scalerFilePath: string;

  @Column({ nullable: true })
  preprocessFilePath: string;

  @Column({ nullable: true })
  postprocessFilePath: string;

  @Column({ type: 'text', nullable: true })
  examplePayload: string;

  @Column({ type: 'text', nullable: true })
  expectedResult: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @OneToMany(() => Deployment, (deployment) => deployment.modelVersion)
  deployments: Deployment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
