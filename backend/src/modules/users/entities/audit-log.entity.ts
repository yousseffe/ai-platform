import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * Entity representing an audit log entry for system operations (such as authentication events or workspace switches).
 */
@Entity('audit_logs')
export class AuditLog {
  /**
   * Unique UUID identifier.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The ID of the user executing the action.
   */
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /**
   * The action category identifier.
   */
  @Column()
  action: string;

  /**
   * Additional JSON properties containing context metadata details.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  /**
   * Client IP address at time of request.
   */
  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress: string | null;

  /**
   * Client user agent header string.
   */
  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent: string | null;

  /**
   * Audit log timestamp record.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
