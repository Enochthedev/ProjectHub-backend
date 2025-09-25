import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Milestone } from './milestone.entity';
import { ReminderType } from '../common/enums';

@Entity('milestone_reminders')
@Index(['milestoneId', 'daysBefore', 'sent'])
export class MilestoneReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Milestone, (milestone) => milestone.reminders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'milestone_id' })
  milestone: Milestone;

  @Column({ name: 'milestone_id' })
  milestoneId: string;

  @Column({
    type: 'enum',
    enum: ReminderType,
  })
  reminderType: ReminderType;

  @Column({ type: 'integer' })
  daysBefore: number;

  @Column({ type: 'boolean', default: false })
  sent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'integer', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt: Date | null;

  @Column({ type: 'integer', default: 0 })
  attemptCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAttemptAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  // Helper methods
  isDue(milestone: Milestone): boolean {
    if (this.sent) {
      return false;
    }

    const today = new Date();
    const dueDate = new Date(milestone.dueDate);
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(dueDate.getDate() - this.daysBefore);

    return today >= reminderDate;
  }

  isOverdue(milestone: Milestone): boolean {
    const today = new Date();
    const dueDate = new Date(milestone.dueDate);
    return today > dueDate && this.daysBefore < 0; // Negative daysBefore indicates overdue reminders
  }

  canRetry(): boolean {
    if (this.sent || this.retryCount >= 3) {
      return false;
    }

    if (!this.nextRetryAt) {
      return true;
    }

    return new Date() >= this.nextRetryAt;
  }

  markAsSent(): void {
    this.sent = true;
    this.sentAt = new Date();
    this.errorMessage = null;
    this.nextRetryAt = null;
  }

  markAsFailed(error: string): void {
    this.errorMessage = error;
    this.retryCount += 1;

    // Exponential backoff: 1 hour, 4 hours, 16 hours
    const backoffHours = Math.pow(4, this.retryCount - 1);
    this.nextRetryAt = new Date(Date.now() + backoffHours * 60 * 60 * 1000);
  }

  static createStandardReminders(milestoneId: string): MilestoneReminder[] {
    const standardDays = [7, 3, 1]; // 7 days, 3 days, 1 day before
    const overdueDay = [-1]; // 1 day after due date

    const reminders: MilestoneReminder[] = [];

    // Advance reminders
    for (const days of standardDays) {
      const reminder = new MilestoneReminder();
      reminder.milestoneId = milestoneId;
      reminder.reminderType = ReminderType.EMAIL;
      reminder.daysBefore = days;
      reminders.push(reminder);
    }

    // Overdue reminder
    for (const days of overdueDay) {
      const reminder = new MilestoneReminder();
      reminder.milestoneId = milestoneId;
      reminder.reminderType = ReminderType.EMAIL;
      reminder.daysBefore = days;
      reminders.push(reminder);
    }

    return reminders;
  }
}
