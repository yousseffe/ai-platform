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

/**
 * Entity representing an MCP Access Token (similar to GitHub Personal Access Tokens).
 * Only the SHA-256 hash and a masked prefix are persisted for security.
 * The full raw key is returned exactly once at creation time and never stored in plaintext.
 */
@Entity('mcp_tokens')
export class McpToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Human-readable label to identify the token's purpose (e.g., 'Claude Code', 'Cursor').
   */
  @Column({ length: 80 })
  name: string;

  /**
   * The User owner who generated and holds this MCP credential.
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * SHA-256 hash of the raw token. Used for secure lookups.
   */
  @Column({ name: 'key_hash', type: 'varchar', unique: true })
  keyHash: string;

  /**
   * Masked prefix shown in UI (e.g. "mcp_a1b2...xyz9").
   */
  @Column({ name: 'key_prefix', type: 'varchar' })
  keyPrefix: string;

  /**
   * Scopes/permissions granted to this token.
   */
  @Column({ type: 'simple-array' })
  scopes: string[];

  /**
   * Activation status. Toggled off if revoked.
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Optional expiration date. Null represents a non-expiring credential.
   */
  @Column({
    name: 'expires_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  expiresAt: Date | null;

  /**
   * Timestamp of the most recent successful authentication with this token.
   */
  @Column({
    name: 'last_used_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  lastUsedAt: Date | null;

  /**
   * Timestamp record indicating when this token was originally created.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Timestamp record indicating when this token was last modified.
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
