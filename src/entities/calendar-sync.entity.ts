import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum CalendarProvider {
  GOOGLE = 'google',
  OUTLOOK = 'outlook',
  APPLE = 'apple',
  CALDAV = 'caldav',
}

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('calendar_syncs')
@Index(['userId', 'provider'])
export class CalendarSync {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: CalendarProvider,
  })
  provider: CalendarProvider;

  @Column({ type: 'varchar', length: 255 })
  calendarId: string;

  @Column({ type: 'text', nullable: true })
  accessToken: string | null;

  @Column({ type: 'text', nullable: true })
  refreshToken: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  serverUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string | null;

  @Column({ type: 'integer', default: 60 })
  syncInterval: number; // in minutes

  @Column({ type: 'boolean', default: false })
  autoSync: boolean;

  @Column({
    type: 'enum',
    enum: SyncStatus,
    default: SyncStatus.PENDING,
  })
  status: SyncStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date | null;

  @Column({ type: 'jsonb', default: '[]' })
  syncErrors: string[];

  @Column({ type: 'integer', default: 0 })
  totalSyncs: number;

  @Column({ type: 'integer', default: 0 })
  successfulSyncs: number;

  @Column({ type: 'integer', default: 0 })
  failedSyncs: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  getSuccessRate(): number {
    if (this.totalSyncs === 0) return 0;
    return (this.successfulSyncs / this.totalSyncs) * 100;
  }

  isHealthy(): boolean {
    // Consider sync healthy if success rate is above 80% and last sync was successful
    return this.getSuccessRate() >= 80 && this.status === SyncStatus.COMPLETED;
  }

  needsAttention(): boolean {
    // Needs attention if failed multiple times or hasn't synced in a while
    const hoursSinceLastSync = this.lastSyncAt
      ? (Date.now() - this.lastSyncAt.getTime()) / (1000 * 60 * 60)
      : Infinity;

    return (
      this.failedSyncs >= 3 ||
      this.status === SyncStatus.FAILED ||
      (this.autoSync && hoursSinceLastSync > 24)
    );
  }

  getNextSyncTime(): Date | null {
    if (!this.autoSync || !this.lastSyncAt) return null;

    const nextSync = new Date(this.lastSyncAt);
    nextSync.setMinutes(nextSync.getMinutes() + this.syncInterval);

    return nextSync;
  }
}
