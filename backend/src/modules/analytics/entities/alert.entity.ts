import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  alertName: string;

  @Column()
  severity: string;

  @Column()
  status: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'jsonb', nullable: true })
  labels: Record<string, string>;

  @Column()
  startsAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endsAt: Date | null;

  @CreateDateColumn()
  receivedAt: Date;
}
