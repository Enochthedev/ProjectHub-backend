import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('realtime_events')
@Index(['userId', 'timestamp'])
@Index(['type', 'timestamp'])
@Index(['role', 'timestamp'])
export class RealtimeEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: [
      'project_stats',
      'milestone_progress',
      'ai_activity',
      'user_activity',
      'system_health',
    ],
  })
  type: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: ['student', 'supervisor', 'admin'],
    nullable: true,
  })
  role: string;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column({ name: 'timestamp' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
