import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('mcp_tokens')
export class McpToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 80 })
  name: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'key_hash', type: 'varchar', unique: true })
  keyHash: string;

  @Column({ name: 'key_prefix', type: 'varchar' })
  keyPrefix: string;

  @Column({ type: 'simple-array' })
  scopes: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    name: 'expires_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  expiresAt: Date | null;

  @Column({
    name: 'last_used_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
