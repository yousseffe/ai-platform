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

@Entity('provider_offers')
export class ProviderOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 140 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index({ unique: true, where: 'code IS NOT NULL' })
  @Column({ type: 'varchar', length: 80, nullable: true })
  code: string | null;

  @Column({ name: 'discount_type', type: 'varchar', enum: OfferDiscountType })
  discountType: OfferDiscountType;

  @Column({
    name: 'discount_value',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  discountValue: number;

  @Column({ name: 'applies_to', type: 'varchar', enum: OfferAppliesTo })
  appliesTo: OfferAppliesTo;

  @ManyToMany(() => ProviderTierDefinition)
  @JoinTable({
    name: 'provider_offer_tiers',
    joinColumn: { name: 'offer_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tier_id', referencedColumnName: 'id' },
  })
  tiers: ProviderTierDefinition[];

  @Column({ name: 'billing_cycle', type: 'varchar', enum: BillingCycle })
  billingCycle: BillingCycle;

  @Column({
    name: 'provider_eligibility',
    type: 'varchar',
    enum: ProviderEligibility,
    default: ProviderEligibility.ALL,
  })
  providerEligibility: ProviderEligibility;

  @Index()
  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @Index()
  @Column({ name: 'end_date', type: 'timestamp' })
  endDate: Date;

  @Column({ name: 'max_redemptions', type: 'integer', nullable: true })
  maxRedemptions: number | null;

  @Column({
    name: 'max_redemptions_per_provider',
    type: 'integer',
    nullable: true,
  })
  maxRedemptionsPerProvider: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
