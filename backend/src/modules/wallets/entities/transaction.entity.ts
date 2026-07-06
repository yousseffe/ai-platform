import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { TransactionType } from '../enums/transaction-type.enum';
import { TransactionStatus } from '../enums/transaction-status.enum';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId: string;

  @Column({ type: 'varchar', enum: TransactionType })
  type: TransactionType;

  @Column({ name: 'amount', type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({
    name: 'stripe_event_id',
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  stripeEventId: string | null;

  @Column({ name: 'reference', type: 'varchar', nullable: true })
  reference: string | null;

  @Column({
    type: 'varchar',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
