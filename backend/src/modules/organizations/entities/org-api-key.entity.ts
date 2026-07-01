import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Model } from '../../models/entities/model.entity';

/**
 * Entity representing a hashed API key bound to a specific project and organization.
 * Only the SHA-256 hash and a masked prefix are persisted.
 * The full raw key is returned exactly once at creation time and never stored in plaintext.
 *
 * Uses table name 'org_api_keys' to avoid collision with the auth module's 'api_keys' table.
 */
@Entity('org_api_keys')
export class OrgApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** UUID of the project this key belongs to. */
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  /** UUID of the organization. Denormalized for fast guard lookups. */
  @Column({ name: 'org_id', type: 'uuid' })
  orgId: string;

  /** Optional model scope. Legacy keys may be null; new keys should target one model. */
  @ManyToOne(() => Model, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'model_id' })
  model: Model | null;

  /** SHA-256 hash of the raw API key. Used for secure lookups. */
  @Column({ name: 'key_hash', type: 'varchar', unique: true })
  keyHash: string;

  /** Masked prefix shown in UI (e.g. "sk_live_a1b2...xyz9"). */
  @Column({ name: 'key_prefix', type: 'varchar' })
  keyPrefix: string;

  /** Human-readable label to identify the key's purpose. */
  @Column({ length: 80 })
  label: string;

  /** Whether this key is active and can be used for authentication. */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Timestamp of the most recent successful authentication with this key. */
  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
