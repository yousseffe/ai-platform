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

/**
 * Lifecycle and tier assignment record for a user or organization provider.
 */
@Entity('provider_accounts')
@Unique(['ownerType', 'ownerId'])
export class ProviderAccount {
  /** Unique provider account identifier. */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Owner scope for the provider account. */
  @Index()
  @Column({ name: 'owner_type', type: 'varchar', enum: OwnerType })
  ownerType: OwnerType;

  /** User or organization UUID owning this provider account. */
  @Index()
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  /** Current tier assigned to this provider. */
  @ManyToOne(() => ProviderTierDefinition, { eager: true })
  tier: ProviderTierDefinition;

  /** Provider lifecycle status. */
  @Index()
  @Column({
    type: 'varchar',
    enum: ProviderAccountStatus,
    default: ProviderAccountStatus.PENDING,
  })
  status: ProviderAccountStatus;

  /** Admin user UUID who last assigned or activated this account. */
  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedBy: string | null;

  /** Time the current assignment was made. */
  @Column({ name: 'assigned_at', type: 'timestamp', nullable: true })
  assignedAt: Date | null;

  /** Billing cycle for the active paid subscription. */
  @Column({
    name: 'subscription_billing_cycle',
    type: 'varchar',
    enum: BillingCycle,
    nullable: true,
  })
  subscriptionBillingCycle: BillingCycle | null;

  /** Timestamp when the current paid subscription period started. */
  @Column({ name: 'subscription_started_at', type: 'timestamp', nullable: true })
  subscriptionStartedAt: Date | null;

  /** Timestamp when the current paid subscription period expires. */
  @Column({ name: 'subscription_expires_at', type: 'timestamp', nullable: true })
  subscriptionExpiresAt: Date | null;

  /** Timestamp of the latest confirmed subscription payment. */
  @Column({
    name: 'last_subscription_payment_at',
    type: 'timestamp',
    nullable: true,
  })
  lastSubscriptionPaymentAt: Date | null;

  /** Admin notes for lifecycle context. */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Provider-specific commission override. */
  @Column({ name: 'custom_commission_percent', type: 'integer', nullable: true })
  customCommissionPercent: number | null;

  /** Provider-specific payout override. */
  @Column({ name: 'custom_provider_share_percent', type: 'integer', nullable: true })
  customProviderSharePercent: number | null;

  /** Provider-specific total model limit override. */
  @Column({ name: 'custom_max_models', type: 'integer', nullable: true })
  customMaxModels: number | null;

  /** Provider-specific public model limit override. */
  @Column({ name: 'custom_max_public_models', type: 'integer', nullable: true })
  customMaxPublicModels: number | null;

  /** Provider-specific version-per-model override. */
  @Column({ name: 'custom_max_versions_per_model', type: 'integer', nullable: true })
  customMaxVersionsPerModel: number | null;

  /** Provider-specific LLM model limit override. */
  @Column({ name: 'custom_max_llm_models', type: 'integer', nullable: true })
  customMaxLLMModels: number | null;

  /** Provider-specific vision model limit override. */
  @Column({ name: 'custom_max_vision_models', type: 'integer', nullable: true })
  customMaxVisionModels: number | null;

  /** Provider-specific NLP model limit override. */
  @Column({ name: 'custom_max_nlp_models', type: 'integer', nullable: true })
  customMaxNLPModels: number | null;

  /** Provider-specific tabular model limit override. */
  @Column({ name: 'custom_max_tabular_models', type: 'integer', nullable: true })
  customMaxTabularModels: number | null;

  /** Provider-specific diffusion model limit override. */
  @Column({ name: 'custom_max_diffusion_models', type: 'integer', nullable: true })
  customMaxDiffusionModels: number | null;

  /** Override notes separate from lifecycle notes. */
  @Column({ name: 'custom_notes', type: 'text', nullable: true })
  customNotes: string | null;

  /** Creation timestamp. */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** Last update timestamp. */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
