import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { ModelVersion } from './model-version.entity';
import { User } from '../../users/entities/user.entity';

@Entity('model_version_test_cases')
export class ModelVersionTestCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ModelVersion, (version) => version.testCases, {
    onDelete: 'CASCADE',
  })
  version: ModelVersion;

  @ManyToOne(() => User, { nullable: true })
  createdBy: User | null;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'text' })
  payload: string;

  @Column({ name: 'expected_result', type: 'text', nullable: true })
  expectedResult: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
