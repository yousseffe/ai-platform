import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

import { OrgStatus } from '../enums/org-status.enum';
import { OrgType } from '../enums/org-type.enum';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 80 })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({
    type: 'varchar',
    enum: OrgStatus,
    default: OrgStatus.ACTIVE,
  })
  status: OrgStatus;

  @Column({
    type: 'varchar',
    enum: OrgType,
    default: OrgType.CONSUMER,
  })
  type: OrgType;

  @Column({ type: 'varchar', length: 300, nullable: true })
  description: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'wallet_id', type: 'uuid', nullable: true })
  walletId: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
