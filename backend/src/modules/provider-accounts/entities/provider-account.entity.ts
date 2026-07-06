import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { OwnerType } from '../../../shared/enums/owner-type.enum';
import { BillingCycle } from '../enums/billing-cycle.enum';
import { ProviderAccountStatus } from '../enums/provider-account-status.enum';
import { ProviderTierDefinition } from './provider-tier-definition.entity';

@Entity('provider_accounts')
@Unique(['ownerType', 'ownerId'])
export class ProviderAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'owner_type', type: 'varchar', enum: OwnerType })
  ownerType: OwnerType;

  @Index()
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => ProviderTierDefinition, { eager: true })
  tier: ProviderTierDefinition;

  @Index()
  @Column({
    type: 'varchar',
    enum: ProviderAccountStatus,
    default: ProviderAccountStatus.PENDING,
  })
  status: ProviderAccountStatus;

  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedBy: string | null;

  @Column({ name: 'assigned_at', type: 'timestamp', nullable: true })
  assignedAt: Date | null;

  @Column({
    name: 'subscription_billing_cycle',
    type: 'varchar',
    enum: BillingCycle,
    nullable: true,
  })
  subscriptionBillingCycle: BillingCycle | null;

  @Column({
    name: 'subscription_started_at',
    type: 'timestamp',
    nullable: true,
  })
  subscriptionStartedAt: Date | null;

  @Column({
    name: 'subscription_expires_at',
    type: 'timestamp',
    nullable: true,
  })
  subscriptionExpiresAt: Date | null;

  @Column({
    name: 'last_subscription_payment_at',
    type: 'timestamp',
    nullable: true,
  })
  lastSubscriptionPaymentAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({
    name: 'custom_commission_percent',
    type: 'integer',
    nullable: true,
  })
  customCommissionPercent: number | null;

  @Column({
    name: 'custom_provider_share_percent',
    type: 'integer',
    nullable: true,
  })
  customProviderSharePercent: number | null;

  @Column({ name: 'custom_max_models', type: 'integer', nullable: true })
  customMaxModels: number | null;

  @Column({ name: 'custom_max_public_models', type: 'integer', nullable: true })
  customMaxPublicModels: number | null;

  @Column({
    name: 'custom_max_versions_per_model',
    type: 'integer',
    nullable: true,
  })
  customMaxVersionsPerModel: number | null;

  @Column({ name: 'custom_max_llm_models', type: 'integer', nullable: true })
  customMaxLLMModels: number | null;

  @Column({ name: 'custom_max_vision_models', type: 'integer', nullable: true })
  customMaxVisionModels: number | null;

  @Column({ name: 'custom_max_nlp_models', type: 'integer', nullable: true })
  customMaxNLPModels: number | null;

  @Column({
    name: 'custom_max_tabular_models',
    type: 'integer',
    nullable: true,
  })
  customMaxTabularModels: number | null;

  @Column({
    name: 'custom_max_diffusion_models',
    type: 'integer',
    nullable: true,
  })
  customMaxDiffusionModels: number | null;

  @Column({ name: 'custom_notes', type: 'text', nullable: true })
  customNotes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
