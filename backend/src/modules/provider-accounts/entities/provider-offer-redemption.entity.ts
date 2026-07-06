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

@Entity('provider_offer_redemptions')
export class ProviderOfferRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProviderOffer, { eager: true })
  offer: ProviderOffer;

  @Index()
  @ManyToOne(() => ProviderAccount, { eager: true })
  providerAccount: ProviderAccount;

  @ManyToOne(() => ProviderTierDefinition, { eager: true })
  tier: ProviderTierDefinition;

  @Column({ name: 'billing_cycle', type: 'varchar', enum: BillingCycle })
  billingCycle: BillingCycle;

  @Column({
    name: 'original_amount_egp',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  originalAmountEgp: number;

  @Column({
    name: 'discount_amount_egp',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  discountAmountEgp: number;

  @Column({
    name: 'final_amount_egp',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  finalAmountEgp: number;

  @Column({ name: 'payment_reference', type: 'varchar', nullable: true })
  paymentReference: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
