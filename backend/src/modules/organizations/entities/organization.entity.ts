import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * Entity representing an organization workspace container.
 */
@Entity('organizations')
export class Organization {
  /**
   * Unique UUID identifier.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Display name of the organization.
   */
  @Column()
  name: string;

  /**
   * Unique URL-friendly identifier of the organization.
   */
  @Column({ unique: true })
  slug: string;

  /**
   * Creator/owner user UUID.
   */
  @Column()
  ownerUserId: string;

  /**
   * Tracks if the organization is registered to publish ML models.
   */
  @Column({ default: false })
  isProvider: boolean;

  /**
   * Time the organization was created.
   */
  @CreateDateColumn()
  createdAt: Date;
}
