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

@Entity('wallets')
@Unique(['walletType', 'ownerType', 'ownerId'])
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_type', type: 'varchar', enum: WalletType })
  walletType: WalletType;

  @Column({ name: 'owner_type', type: 'varchar', enum: OwnerType })
  ownerType: OwnerType;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @Column({
    name: 'balance',
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0.0,
  })
  balance: number;

  @Column({ name: 'currency', default: 'CREDITS' })
  currency: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
