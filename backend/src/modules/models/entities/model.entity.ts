import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { ModelVersion } from './model-version.entity';
import { ModelType } from '../enums/model-type.enum';
import { TaskType } from '../enums/task-type.enum';
import { Framework } from '../enums/framework.enum';

@Entity('models')
export class Model {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    enum: ModelType,
    default: ModelType.TABULAR,
  })
  type: ModelType;

  @Column({
    type: 'varchar',
    enum: TaskType,
    default: TaskType.OTHER,
  })
  taskType: TaskType;

  @Column({
    type: 'varchar',
    enum: Framework,
    default: Framework.CUSTOM,
  })
  framework: Framework;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Organization, { nullable: true })
  organization: Organization | null;

  @OneToMany(() => ModelVersion, (version) => version.model)
  versions: ModelVersion[];

  @Column({ type: 'varchar', default: 'SMALL' })
  tier: string;

  @Column({
    name: 'cost_per_request',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0.0,
  })
  costPerRequest: number;

  @Column({ name: 'provider_share_percent', type: 'integer', default: 80 })
  providerSharePercent: number;

  @Column({
    name: 'total_earnings',
    type: 'decimal',
    precision: 12,
    scale: 4,
    default: 0.0,
  })
  totalEarnings: number;

  @Column({ name: 'has_custom_pricing', type: 'boolean', default: false })
  hasCustomPricing: boolean;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ name: 'marketplace_verified', type: 'boolean', default: false })
  marketplaceVerified: boolean;

  @Column({
    name: 'average_rating',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0.0,
  })
  averageRating: number;

  @Column({ name: 'review_count', type: 'integer', default: 0 })
  reviewCount: number;

  @Column({ name: 'cache_enabled', type: 'boolean', default: false })
  cacheEnabled: boolean;

  @Column({ name: 'cache_ttl_seconds', type: 'integer', default: 60 })
  cacheTtlSeconds: number;

  @Column({
    name: 'cache_hit_discount_percent',
    type: 'integer',
    default: 100,
  })
  cacheHitDiscountPercent: number;

  @Column({ name: 'allow_egress', type: 'boolean', default: false })
  allowEgress: boolean;

  @Column({ name: 'rls_org_id', type: 'uuid', nullable: true })
  rlsOrgId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
