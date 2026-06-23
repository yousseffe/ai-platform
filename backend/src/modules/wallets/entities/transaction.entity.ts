import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { TransactionType } from '../enums/transaction-type.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';

/**
 * Entity mapping wallet transaction records for balance additions (deposits) or deductions (debited service payments).
 */
@Entity('transactions')
export class Transaction {
  /**
   * Unique UUID identifier.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The UUID of the wallet this transaction ledger updates.
   */
  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  /**
   * The type of transaction (CREDIT or DEBIT).
   */
  @Column({ type: 'varchar', enum: TransactionType })
  type: TransactionType;

  /**
   * The financial amount of the transaction.
   */
  @Column({ name: 'amount', type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  /**
   * Cryptographic Stripe Event ID stored to act as webhook execution idempotency key.
   */
  @Column({
    name: 'stripe_event_id',
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  stripeEventId: string | null;

  /**
   * Reference containing Stripe PaymentIntent ID or internal payment system references.
   */
  @Column({ name: 'reference', type: 'varchar', nullable: true })
  reference: string | null;

  /**
   * The transaction status (PENDING, COMPLETED, or FAILED).
   */
  @Column({
    type: 'varchar',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  /**
   * Transaction created timestamp.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
