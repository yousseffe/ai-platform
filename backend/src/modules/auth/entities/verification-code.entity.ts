import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * Entity representing an OTP verification code sent for email validation or verification.
 */
@Entity('verification_codes')
export class VerificationCode {
  /**
   * Unique UUID identifier.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The owner user ID.
   */
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /**
   * The 6-digit OTP code string.
   */
  @Column()
  code: string;

  /**
   * Expiration date and time.
   */
  @Column({ name: 'expires_at' })
  expiresAt: Date;

  /**
   * Count of validation attempts made on this code.
   */
  @Column({ type: 'integer', default: 0 })
  attempts: number;

  /**
   * Indicator of whether the code was already consumed.
   */
  @Column({ type: 'boolean', default: false })
  used: boolean;

  /**
   * Database record creation timestamp.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
