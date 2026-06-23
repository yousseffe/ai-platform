import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Entity representing global system-wide key-value configurations.
 */
@Entity('system_configs')
export class SystemConfig {
  /**
   * The unique configuration key (e.g. 'org_creation_fee').
   */
  @PrimaryColumn()
  key: string;

  /**
   * The string value of the configuration.
   */
  @Column()
  value: string;

  /**
   * Creation timestamp.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Modification timestamp.
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
