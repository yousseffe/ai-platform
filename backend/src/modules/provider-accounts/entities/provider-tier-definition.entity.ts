import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Admin-managed definition for a provider subscription tier and its limits.
 */
@Entity('provider_tier_definitions')
export class ProviderTierDefinition {
  /** Unique tier identifier. */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Stable admin-facing code such as FREE, PRO, or ENTERPRISE. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  code: string;

  /** Human-readable tier name. */
  @Column({ name: 'display_name', type: 'varchar', length: 120 })
  displayName: string;

  /** Optional public/admin tier description. */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Monthly provider subscription price in EGP. */
  @Column({
    name: 'monthly_price_egp',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  monthlyPriceEgp: number;

  /** Optional annual provider subscription price in EGP. */
  @Column({
    name: 'annual_price_egp',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  annualPriceEgp: number | null;

  /** Platform commission percentage for this tier. */
  @Column({ name: 'platform_commission_percent', type: 'integer', default: 20 })
  platformCommissionPercent: number;

  /** Provider payout percentage for this tier. */
  @Column({ name: 'provider_share_percent', type: 'integer', default: 80 })
  providerSharePercent: number;

  /** Total models allowed for the provider; null means unlimited. */
  @Column({ name: 'max_models', type: 'integer', nullable: true })
  maxModels: number | null;

  /** Public models allowed for the provider; null means unlimited. */
  @Column({ name: 'max_public_models', type: 'integer', nullable: true })
  maxPublicModels: number | null;

  /** Versions allowed per model; null means unlimited. */
  @Column({ name: 'max_versions_per_model', type: 'integer', nullable: true })
  maxVersionsPerModel: number | null;

  /** LLM models allowed; null means unlimited. */
  @Column({ name: 'max_llm_models', type: 'integer', nullable: true })
  maxLLMModels: number | null;

  /** Vision models allowed; null means unlimited. */
  @Column({ name: 'max_vision_models', type: 'integer', nullable: true })
  maxVisionModels: number | null;

  /** NLP models allowed; null means unlimited. */
  @Column({ name: 'max_nlp_models', type: 'integer', nullable: true })
  maxNLPModels: number | null;

  /** Tabular models allowed; null means unlimited. */
  @Column({ name: 'max_tabular_models', type: 'integer', nullable: true })
  maxTabularModels: number | null;

  /** Diffusion models allowed; null means unlimited. */
  @Column({ name: 'max_diffusion_models', type: 'integer', nullable: true })
  maxDiffusionModels: number | null;

  /** Audio models allowed; null means unlimited. */
  @Column({ name: 'max_audio_models', type: 'integer', nullable: true })
  maxAudioModels: number | null;

  /** Embedding models allowed; null means unlimited. */
  @Column({ name: 'max_embedding_models', type: 'integer', nullable: true })
  maxEmbeddingModels: number | null;

  /** Whether private model visibility is allowed. */
  @Column({ name: 'allow_private_models', type: 'boolean', default: false })
  allowPrivateModels: boolean;

  /** Whether provider-level custom pricing is allowed. */
  @Column({ name: 'allow_custom_pricing', type: 'boolean', default: false })
  allowCustomPricing: boolean;

  /** Whether reviews should get priority treatment. */
  @Column({ name: 'allow_priority_review', type: 'boolean', default: false })
  allowPriorityReview: boolean;

  /** Whether organization-owned publishing is allowed. */
  @Column({ name: 'allow_org_publishing', type: 'boolean', default: false })
  allowOrgPublishing: boolean;

  /** Whether dedicated support is included. */
  @Column({ name: 'allow_dedicated_support', type: 'boolean', default: false })
  allowDedicatedSupport: boolean;

  /** Whether featured marketplace placement is included. */
  @Column({ name: 'allow_featured_placement', type: 'boolean', default: false })
  allowFeaturedPlacement: boolean;

  /** Whether advanced analytics is included. */
  @Column({ name: 'allow_advanced_analytics', type: 'boolean', default: false })
  allowAdvancedAnalytics: boolean;

  /** Whether the tier can be selected or assigned. */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Admin-controlled display ordering. */
  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  /** Creation timestamp. */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** Last update timestamp. */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
