import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { ModelVersion } from '../models/model-version.entity';

export enum DeploymentStatus {
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPED = 'stopped',
  FAILED = 'failed',
}

@Entity('deployments')
export class Deployment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ModelVersion, (version) => version.deployments, { onDelete: 'CASCADE' })
  modelVersion: ModelVersion;

  @Column({ nullable: true })
  containerId: string;

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  port: number;

  @Column({
    type: 'varchar',
    enum: DeploymentStatus,
    default: DeploymentStatus.STARTING,
  })
  status: DeploymentStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
