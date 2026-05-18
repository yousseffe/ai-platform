import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { ModelVersion } from './model-version.entity';

export enum ModelType {
  TABULAR = 'TABULAR',
  NLP = 'NLP',
  VISION = 'VISION',
  LLM_GGUF = 'LLM_GGUF',
}

export enum TaskType {
  CLASSIFICATION = 'CLASSIFICATION',
  REGRESSION = 'REGRESSION',
  GENERATION = 'GENERATION',
  OBJECT_DETECTION = 'OBJECT_DETECTION',
  SEGMENTATION = 'SEGMENTATION',
  EMBEDDING = 'EMBEDDING',
  CHAT = 'CHAT',
  OTHER = 'OTHER',
}

export enum Framework {
  SKLEARN = 'SKLEARN',
  PYTORCH = 'PYTORCH',
  TENSORFLOW = 'TENSORFLOW',
  ONNX = 'ONNX',
  LLAMA_CPP = 'LLAMA_CPP',
  VLLM = 'VLLM',
  CUSTOM = 'CUSTOM',
}

@Entity('models')
export class Model {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'varchar',
    enum: ModelType,
    default: ModelType.TABULAR,
  })
  type: ModelType;

  @Column({
    type: 'varchar',
    enum: TaskType,
    default: TaskType.OTHER,
  })
  taskType: TaskType;

  @Column({
    type: 'varchar',
    enum: Framework,
    default: Framework.CUSTOM,
  })
  framework: Framework;

  @ManyToOne(() => User)
  user: User;

  @OneToMany(() => ModelVersion, (version) => version.model)
  versions: ModelVersion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
