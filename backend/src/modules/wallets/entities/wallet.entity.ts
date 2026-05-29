import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

import { WalletType } from '../../../shared/enums/wallet-type.enum';
import { OwnerType } from '../../../shared/enums/owner-type.enum';

/**
 * Unified wallets mapping ledger records for consumer credits and provider revenues.
 */
@Entity('wallets')
@Unique(['walletType', 'ownerType', 'ownerId'])
export class Wallet {
  /**
   * Unique UUID identifier.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The purpose of the wallet (spending credits vs earning revenue).
   */
  @Column({ type: 'varchar', enum: WalletType })
  walletType: WalletType;

  /**
   * Indicates if the wallet belongs to an individual user or organization workspace.
   */
  @Column({ type: 'varchar', enum: OwnerType })
  ownerType: OwnerType;

  /**
   * UUID of the owner (user or organization).
   */
  @Column()
  ownerId: string;

  /**
   * Current wallet balance ledger credit/revenue count.
   */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  balance: number;

  /**
   * Creation timestamp.
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Modification timestamp.
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
