import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('processed_webhooks')
export class ProcessedWebhook {
  @PrimaryColumn({ name: 'stripe_event_id' })
  stripeEventId: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt: Date;
}
