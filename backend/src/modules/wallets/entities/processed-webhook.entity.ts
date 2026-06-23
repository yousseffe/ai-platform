import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Entity mapping processed Stripe webhook event IDs to prevent duplicate processing (idempotency registry).
 */
@Entity('processed_webhooks')
export class ProcessedWebhook {
  /**
   * The Stripe event ID, acting as the Primary Key.
   */
  @PrimaryColumn({ name: 'stripe_event_id' })
  stripeEventId: string;

  /**
   * UUID of the wallet credited by the webhook.
   */
  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  /**
   * Time the webhook event was processed.
   */
  @CreateDateColumn({ name: 'processed_at' })
  processedAt: Date;
}
