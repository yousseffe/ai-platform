import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

import { OrgRole } from '../../../shared/enums/org-role.enum';

/**
 * Entity mapping users to organizations with membership roles and joined date tracking.
 */
@Entity('org_members')
export class OrgMember {
  /**
   * UUID of the parent organization. Composite Primary Key.
   */
  @PrimaryColumn({ name: 'org_id', type: 'uuid' })
  orgId: string;

  /**
   * UUID of the member user. Composite Primary Key.
   */
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  /**
   * Workspace access capability level (OWNER, MAINTAINER, CONTRIBUTOR, VIEWER).
   */
  @Column({ type: 'varchar', enum: OrgRole })
  role: OrgRole;

  /**
   * Membership creation / joining timestamp.
   */
  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
