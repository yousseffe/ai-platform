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
   * The purpose of the wallet (spending credits vs earning revenue), corresponding to the owner role.
   */
  @Column({ name: 'wallet_type', type: 'varchar', enum: WalletType })
  walletType: WalletType;

  /**
   * Indicates if the wallet belongs to an individual user or organization workspace.
   */
  @Column({ name: 'owner_type', type: 'varchar', enum: OwnerType })
  ownerType: OwnerType;

  /**
   * UUID of the owner (user or organization).
   */
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  /**
   * Current wallet balance ledger credit/revenue count.
   */
  @Column({
    name: 'balance',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0.0,
  })
  balance: number;

  /**
   * The ledger currency type.
   */
  @Column({ name: 'currency', default: 'CREDITS' })
  currency: string;

  /**
   * Creation timestamp.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Modification timestamp.
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
