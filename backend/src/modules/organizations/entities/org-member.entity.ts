import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

import { OrgRole } from '../../../shared/enums/org-role.enum';
import { OrgMemberStatus } from '../../../shared/enums/org-member-status.enum';

/**
 * Entity mapping users to organizations with membership roles and status tracking.
 */
@Entity('org_members')
export class OrgMember {
  /**
   * Unique UUID identifier.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * UUID of the parent organization.
   */
  @Column()
  orgId: string;

  /**
   * UUID of the member user.
   */
  @Column()
  userId: string;

  /**
   * Workspace access capability level.
   */
  @Column({ type: 'varchar', enum: OrgRole })
  role: OrgRole;

  /**
   * Acceptance status of the membership.
   */
  @Column({ type: 'varchar', enum: OrgMemberStatus, default: OrgMemberStatus.PENDING })
  status: OrgMemberStatus;

  /**
   * Membership creation timestamp.
   */
  @CreateDateColumn()
  createdAt: Date;
}
