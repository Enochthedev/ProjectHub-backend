import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  // Reminder preferences
  @Column({ type: 'boolean', default: true })
  emailRemindersEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  inAppRemindersEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  smsRemindersEnabled: boolean;

  @Column({ type: 'json', default: () => "'[7, 3, 1]'" })
  advanceReminderDays: number[];

  @Column({ type: 'boolean', default: true })
  overdueRemindersEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  escalationEnabled: boolean;

  // Notification preferences
  @Column({ type: 'boolean', default: true })
  milestoneStatusNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  supervisorNotifications: boolean;

  @Column({ type: 'boolean', default: true })
  projectUpdateNotifications: boolean;

  // Display preferences
  @Column({ type: 'varchar', default: 'light' })
  theme: string;

  @Column({ type: 'varchar', default: 'en' })
  language: string;

  @Column({ type: 'varchar', default: 'UTC' })
  timezone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  getReminderPreferences() {
    return {
      emailEnabled: this.emailRemindersEnabled,
      inAppEnabled: this.inAppRemindersEnabled,
      smsEnabled: this.smsRemindersEnabled,
      advanceReminderDays: this.advanceReminderDays,
      overdueReminderEnabled: this.overdueRemindersEnabled,
      escalationEnabled: this.escalationEnabled,
    };
  }

  updateReminderPreferences(preferences: {
    emailEnabled?: boolean;
    inAppEnabled?: boolean;
    smsEnabled?: boolean;
    advanceReminderDays?: number[];
    overdueReminderEnabled?: boolean;
    escalationEnabled?: boolean;
  }) {
    if (preferences.emailEnabled !== undefined) {
      this.emailRemindersEnabled = preferences.emailEnabled;
    }
    if (preferences.inAppEnabled !== undefined) {
      this.inAppRemindersEnabled = preferences.inAppEnabled;
    }
    if (preferences.smsEnabled !== undefined) {
      this.smsRemindersEnabled = preferences.smsEnabled;
    }
    if (preferences.advanceReminderDays !== undefined) {
      this.advanceReminderDays = preferences.advanceReminderDays;
    }
    if (preferences.overdueReminderEnabled !== undefined) {
      this.overdueRemindersEnabled = preferences.overdueReminderEnabled;
    }
    if (preferences.escalationEnabled !== undefined) {
      this.escalationEnabled = preferences.escalationEnabled;
    }
  }

  static createDefault(userId: string): UserPreferences {
    const preferences = new UserPreferences();
    preferences.userId = userId;
    preferences.emailRemindersEnabled = true;
    preferences.inAppRemindersEnabled = true;
    preferences.smsRemindersEnabled = false;
    preferences.advanceReminderDays = [7, 3, 1];
    preferences.overdueRemindersEnabled = true;
    preferences.escalationEnabled = true;
    preferences.milestoneStatusNotifications = true;
    preferences.supervisorNotifications = true;
    preferences.projectUpdateNotifications = true;
    preferences.theme = 'light';
    preferences.language = 'en';
    preferences.timezone = 'UTC';
    return preferences;
  }
}
