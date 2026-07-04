import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BillingCycle } from '../enums/billing-cycle.enum';
import { OfferAppliesTo } from '../enums/offer-applies-to.enum';
import { OfferDiscountType } from '../enums/offer-discount-type.enum';
import { ProviderEligibility } from '../enums/provider-eligibility.enum';
import { ProviderTierDefinition } from './provider-tier-definition.entity';

/**
 * Admin-managed discount offer for provider tier subscription checkout.
 */
@Entity('provider_offers')
export class ProviderOffer {
  /** Unique offer identifier. */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Offer title shown in admin tools. */
  @Column({ type: 'varchar', length: 140 })
  title: string;

  /** Optional offer description. */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Optional redeemable code; null allows admin-selected application. */
  @Index({ unique: true, where: 'code IS NOT NULL' })
  @Column({ type: 'varchar', length: 80, nullable: true })
  code: string | null;

  /** Discount calculation mode. */
  @Column({ name: 'discount_type', type: 'varchar', enum: OfferDiscountType })
  discountType: OfferDiscountType;

  /** Percentage value or fixed EGP amount depending on discount type. */
  @Column({
    name: 'discount_value',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  discountValue: number;

  /** Tier scope for the offer. */
  @Column({ name: 'applies_to', type: 'varchar', enum: OfferAppliesTo })
  appliesTo: OfferAppliesTo;

  /** Specific tier definitions if appliesTo is SPECIFIC_TIERS. */
  @ManyToMany(() => ProviderTierDefinition)
  @JoinTable({
    name: 'provider_offer_tiers',
    joinColumn: { name: 'offer_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tier_id', referencedColumnName: 'id' },
  })
  tiers: ProviderTierDefinition[];

  /** Billing cycle targeted by this offer. */
  @Column({ name: 'billing_cycle', type: 'varchar', enum: BillingCycle })
  billingCycle: BillingCycle;

  /** Provider age/status eligibility group. */
  @Column({
    name: 'provider_eligibility',
    type: 'varchar',
    enum: ProviderEligibility,
    default: ProviderEligibility.ALL,
  })
  providerEligibility: ProviderEligibility;

  /** First timestamp at which the offer can be used. */
  @Index()
  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  /** Last timestamp at which the offer can be used. */
  @Index()
  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  /** Maximum total redemptions, null means unlimited. */
  @Column({ name: 'max_redemptions', type: 'integer', nullable: true })
  maxRedemptions: number | null;

  /** Maximum redemptions per provider, null means unlimited. */
  @Column({
    name: 'max_redemptions_per_provider',
    type: 'integer',
    nullable: true,
  })
  maxRedemptionsPerProvider: number | null;

  /** Whether the offer is currently enabled. */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Admin user UUID who created the offer. */
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  /** Creation timestamp. */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** Last update timestamp. */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
