import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Entity representing a logical grouping of API integrations within a Consumer Organization.
 * Each project isolates one product or application and holds its own set of API keys.
 */
@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** UUID of the parent organization this project belongs to. */
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  /** Display name of the project (e.g. "Loan Approval App"). */
  @Column({ length: 80 })
  name: string;

  /** Optional description explaining the project's purpose. */
  @Column({ type: 'varchar', length: 300, nullable: true })
  description: string | null;

  /** Whether this project is active. Soft-deleted projects are set to false. */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
