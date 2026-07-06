import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { ModelVersion } from '../../models/entities/model-version.entity';
import { DeploymentStatus } from '../enums/deployment-status.enum';

@Entity('deployments')
export class Deployment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ModelVersion, (version) => version.deployments, {
    onDelete: 'CASCADE',
  })
  modelVersion: ModelVersion;

  @Column({ type: 'varchar', nullable: true })
  containerId: string | null;

  @Column({ type: 'varchar', nullable: true })
  url: string | null;

  @Column({ type: 'integer', nullable: true })
  port: number | null;

  @Column({
    type: 'varchar',
    enum: DeploymentStatus,
    default: DeploymentStatus.STARTING,
  })
  status: DeploymentStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'traffic_weight', type: 'integer', default: 100 })
  trafficWeight: number;

  @Column({ name: 'rls_org_id', type: 'uuid', nullable: true })
  rlsOrgId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
