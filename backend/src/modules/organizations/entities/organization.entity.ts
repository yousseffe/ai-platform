import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

import { OrgStatus } from '../enums/org-status.enum';
import { OrgType } from '../enums/org-type.enum';

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
   * Display name of the organization. Unique, 3-80 chars.
   */
  @Column({ unique: true, length: 80 })
  name: string;

  /**
   * Unique URL-friendly identifier of the organization.
   */
  @Column({ unique: true })
  slug: string;

  /**
   * Organization workspace status (ACTIVE or INACTIVE).
   */
  @Column({
    type: 'varchar',
    enum: OrgStatus,
    default: OrgStatus.ACTIVE,
  })
  status: OrgStatus;

  /**
   * Operational type of the organization (PROVIDER, CONSUMER, HYBRID).
   * Determines which wallets are initialized and which portal features are shown.
   */
  @Column({
    type: 'varchar',
    enum: OrgType,
    default: OrgType.CONSUMER,
  })
  type: OrgType;

  /**
   * Optional short description / bio of the organization.
   */
  @Column({ type: 'varchar', length: 300, nullable: true })
  description: string | null;

  /**
   * Optional URL to the organization's logo or avatar image.
   */
  @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
  avatarUrl: string | null;

  /**
   * UUID link to the organization's CONSUMER wallet.
   */
  @Column({ name: 'wallet_id', type: 'uuid', nullable: true })
  walletId: string | null;

  /**
   * Creator/owner user UUID.
   */
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  /**
   * Time the organization was created.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
