import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BillingCycle } from '../enums/billing-cycle.enum';
import { ProviderAccount } from './provider-account.entity';
import { ProviderOffer } from './provider-offer.entity';
import { ProviderTierDefinition } from './provider-tier-definition.entity';

/**
 * Immutable audit record for a provider offer redemption.
 */
@Entity('provider_offer_redemptions')
export class ProviderOfferRedemption {
  /** Unique redemption identifier. */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Offer that was redeemed. */
  @ManyToOne(() => ProviderOffer, { eager: true })
  offer: ProviderOffer;

  /** Provider account that redeemed the offer. */
  @Index()
  @ManyToOne(() => ProviderAccount, { eager: true })
  providerAccount: ProviderAccount;

  /** Tier purchased during redemption. */
  @ManyToOne(() => ProviderTierDefinition, { eager: true })
  tier: ProviderTierDefinition;

  /** Billing period purchased. */
  @Column({ name: 'billing_cycle', type: 'varchar', enum: BillingCycle })
  billingCycle: BillingCycle;

  /** Original amount before discount. */
  @Column({
    name: 'original_amount_egp',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  originalAmountEgp: number;

  /** Discount value applied in EGP. */
  @Column({
    name: 'discount_amount_egp',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  discountAmountEgp: number;

  /** Final amount charged after discount. */
  @Column({
    name: 'final_amount_egp',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  finalAmountEgp: number;

  /** Stripe session or payment reference if available. */
  @Column({ name: 'payment_reference', type: 'varchar', nullable: true })
  paymentReference: string | null;

  /** Creation timestamp. */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
