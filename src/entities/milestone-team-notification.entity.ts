import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { SharedMilestone } from './shared-milestone.entity';

export enum NotificationType {
  MILESTONE_CREATED = 'milestone_created',
  MILESTONE_UPDATED = 'milestone_updated',
  MILESTONE_STATUS_CHANGED = 'milestone_status_changed',
  ASSIGNMENT_CREATED = 'assignment_created',
  ASSIGNMENT_UPDATED = 'assignment_updated',
  ASSIGNMENT_STATUS_CHANGED = 'assignment_status_changed',
  DISCUSSION_CREATED = 'discussion_created',
  DISCUSSION_REPLY = 'discussion_reply',
  CONFLICT_REPORTED = 'conflict_reported',
  CONFLICT_RESOLVED = 'conflict_resolved',
  DEADLINE_APPROACHING = 'deadline_approaching',
  MILESTONE_OVERDUE = 'milestone_overdue',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('milestone_team_notifications')
export class MilestoneTeamNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @Column({ name: 'recipient_id' })
  recipientId: string;

  @ManyToOne(() => SharedMilestone, { nullable: true })
  @JoinColumn({ name: 'milestone_id' })
  milestone: SharedMilestone | null;

  @Column({ name: 'milestone_id', nullable: true })
  milestoneId: string | null;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'triggered_by' })
  triggeredBy: User | null;

  @Column({ name: 'triggered_by', nullable: true })
  triggeredById: string | null;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isEmailSent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  emailSentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  // Helper methods
  markAsRead(): void {
    this.isRead = true;
    this.readAt = new Date();
  }

  markEmailAsSent(): void {
    this.isEmailSent = true;
    this.emailSentAt = new Date();
  }

  isUrgent(): boolean {
    return this.priority === NotificationPriority.URGENT;
  }

  shouldSendEmail(): boolean {
    return (
      !this.isEmailSent &&
      (this.priority === NotificationPriority.HIGH ||
        this.priority === NotificationPriority.URGENT ||
        this.type === NotificationType.CONFLICT_REPORTED ||
        this.type === NotificationType.MILESTONE_OVERDUE)
    );
  }
}
