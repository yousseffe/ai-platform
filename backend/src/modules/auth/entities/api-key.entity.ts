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
import { Model } from '../../models/entities/model.entity';
import { ApiKeyType } from '../enums/api-key-type.enum';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column({ default: 'Default Key' })
  name: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Model, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'model_id' })
  model: Model | null;

  @Column({
    type: 'varchar',
    enum: ApiKeyType,
    default: ApiKeyType.LIVE,
  })
  type: ApiKeyType;

  @Column({ name: 'calls_count', type: 'integer', default: 0 })
  callsCount: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({
    name: 'expires_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  expiresAt: Date | null;

  @Column({ name: 'max_requests_per_minute', type: 'integer', nullable: true })
  maxRequestsPerMinute: number | null;

  @Column({
    name: 'max_daily_spend_credits',
    type: 'decimal',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  maxDailySpendCredits: number | null;

  @Column({ name: 'suspended_reason', type: 'varchar', nullable: true })
  suspendedReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
