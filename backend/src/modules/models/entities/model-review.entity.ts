import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Model } from './model.entity';

/**
 * Entity representing a consumer rating and comment for a marketplace model.
 */
@Entity('model_reviews')
@Unique(['user', 'model'])
export class ModelReview {
  /**
   * Unique UUID identifier.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Rating value given by the consumer (usually between 1 and 5).
   */
  @Column({ type: 'integer' })
  rating: number;

  /**
   * Optional long-form feedback comment text.
   */
  @Column({ type: 'text', nullable: true })
  comment: string | null;

  /**
   * The User who wrote the review.
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * The Model being reviewed.
   */
  @ManyToOne(() => Model, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'model_id' })
  model: Model;

  /**
   * Timestamp record indicating when this review was created.
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Timestamp record indicating when this review was last updated.
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
