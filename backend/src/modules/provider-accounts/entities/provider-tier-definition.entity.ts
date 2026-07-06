import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('provider_tier_definitions')
export class ProviderTierDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ name: 'display_name', type: 'varchar', length: 120 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'monthly_price_egp',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  monthlyPriceEgp: number;

  @Column({
    name: 'annual_price_egp',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  annualPriceEgp: number | null;

  @Column({ name: 'platform_commission_percent', type: 'integer', default: 20 })
  platformCommissionPercent: number;

  @Column({ name: 'provider_share_percent', type: 'integer', default: 80 })
  providerSharePercent: number;

  @Column({ name: 'max_models', type: 'integer', nullable: true })
  maxModels: number | null;

  @Column({ name: 'max_public_models', type: 'integer', nullable: true })
  maxPublicModels: number | null;

  @Column({ name: 'max_versions_per_model', type: 'integer', nullable: true })
  maxVersionsPerModel: number | null;

  @Column({ name: 'max_llm_models', type: 'integer', nullable: true })
  maxLLMModels: number | null;

  @Column({ name: 'max_vision_models', type: 'integer', nullable: true })
  maxVisionModels: number | null;

  @Column({ name: 'max_nlp_models', type: 'integer', nullable: true })
  maxNLPModels: number | null;

  @Column({ name: 'max_tabular_models', type: 'integer', nullable: true })
  maxTabularModels: number | null;

  @Column({ name: 'max_diffusion_models', type: 'integer', nullable: true })
  maxDiffusionModels: number | null;

  @Column({ name: 'max_audio_models', type: 'integer', nullable: true })
  maxAudioModels: number | null;

  @Column({ name: 'max_embedding_models', type: 'integer', nullable: true })
  maxEmbeddingModels: number | null;

  @Column({ name: 'allow_private_models', type: 'boolean', default: false })
  allowPrivateModels: boolean;

  @Column({ name: 'allow_custom_pricing', type: 'boolean', default: false })
  allowCustomPricing: boolean;

  @Column({ name: 'allow_priority_review', type: 'boolean', default: false })
  allowPriorityReview: boolean;

  @Column({ name: 'allow_org_publishing', type: 'boolean', default: false })
  allowOrgPublishing: boolean;

  @Column({ name: 'allow_dedicated_support', type: 'boolean', default: false })
  allowDedicatedSupport: boolean;

  @Column({ name: 'allow_featured_placement', type: 'boolean', default: false })
  allowFeaturedPlacement: boolean;

  @Column({ name: 'allow_advanced_analytics', type: 'boolean', default: false })
  allowAdvancedAnalytics: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
