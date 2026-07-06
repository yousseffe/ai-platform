import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

import { OrgRole } from '../../../shared/enums/org-role.enum';

@Entity('org_members')
export class OrgMember {
  @PrimaryColumn({ name: 'org_id', type: 'uuid' })
  orgId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', enum: OrgRole })
  role: OrgRole;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
