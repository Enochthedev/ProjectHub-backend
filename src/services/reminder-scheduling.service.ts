import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MilestoneReminder } from '../entities/milestone-reminder.entity';
import { Milestone } from '../entities/milestone.entity';
import { User } from '../entities/user.entity';
import { UserPreferences } from '../entities/user-preferences.entity';
import { ReminderType } from '../common/enums/reminder-type.enum';
import { MilestoneStatus } from '../common/enums/milestone-status.enum';

export interface ReminderPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
  advanceReminderDays: number[];
  overdueReminderEnabled: boolean;
  escalationEnabled: boolean;
}

export interface ReminderScheduleResult {
  remindersCreated: number;
  remindersUpdated: number;
  errors: string[];
}

@Injectable()
export class ReminderSchedulingService {
  private readonly logger = new Logger(ReminderSchedulingService.name);

  // Default reminder schedule configuration
  private readonly DEFAULT_ADVANCE_DAYS = [7, 3, 1];
  private readonly DEFAULT_OVERDUE_DAYS = [-1, -3, -7]; // Negative values indicate days after due date
  private readonly DEFAULT_PREFERENCES: ReminderPreferences = {
    emailEnabled: true,
    inAppEnabled: true,
    smsEnabled: false,
    advanceReminderDays: this.DEFAULT_ADVANCE_DAYS,
    overdueReminderEnabled: true,
    escalationEnabled: true,
  };

  constructor(
    @InjectRepository(MilestoneReminder)
    private readonly reminderRepository: Repository<MilestoneReminder>,
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPreferences)
    private readonly userPreferencesRepository: Repository<UserPreferences>,
  ) {}

  /**
   * Schedule reminders for a milestone based on user preferences
   */
  async scheduleRemindersForMilestone(
    milestoneId: string,
    userPreferences?: Partial<ReminderPreferences>,
  ): Promise<ReminderScheduleResult> {
    this.logger.log(`Scheduling reminders for milestone ${milestoneId}`);

    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId },
      relations: ['student'],
    });

    if (!milestone) {
      return {
        remindersCreated: 0,
        remindersUpdated: 0,
        errors: [`Milestone ${milestoneId} not found`],
      };
    }

    // Skip scheduling for completed or cancelled milestones
    if (
      milestone.status === MilestoneStatus.COMPLETED ||
      milestone.status === MilestoneStatus.CANCELLED
    ) {
      this.logger.log(
        `Skipping reminder scheduling for ${milestone.status} milestone ${milestoneId}`,
      );
      return {
        remindersCreated: 0,
        remindersUpdated: 0,
        errors: [],
      };
    }

    const preferences = { ...this.DEFAULT_PREFERENCES, ...userPreferences };
    const result: ReminderScheduleResult = {
      remindersCreated: 0,
      remindersUpdated: 0,
      errors: [],
    };

    try {
      // Remove existing reminders that haven't been sent
      await this.removeUnsentReminders(milestoneId);

      // Schedule advance reminders
      if (
        preferences.emailEnabled ||
        preferences.inAppEnabled ||
        preferences.smsEnabled
      ) {
        await this.scheduleAdvanceReminders(milestone, preferences, result);
      }

      // Schedule overdue reminders
      if (preferences.overdueReminderEnabled) {
        await this.scheduleOverdueReminders(milestone, preferences, result);
      }

      this.logger.log(
        `Scheduled ${result.remindersCreated} reminders for milestone ${milestoneId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule reminders for milestone ${milestoneId}`,
        error,
      );
      result.errors.push(`Failed to schedule reminders: ${error.message}`);
    }

    return result;
  }

  /**
   * Update reminder preferences for a user
   */
  async updateReminderPreferences(
    userId: string,
    preferences: Partial<ReminderPreferences>,
  ): Promise<void> {
    this.logger.log(`Updating reminder preferences for user ${userId}`);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    let userPreferences = await this.userPreferencesRepository.findOne({
      where: { userId },
    });

    if (!userPreferences) {
      // Create default preferences if they don't exist
      userPreferences = UserPreferences.createDefault(userId);
    }

    // Update preferences
    userPreferences.updateReminderPreferences(preferences);

    await this.userPreferencesRepository.save(userPreferences);

    this.logger.log(`Updated reminder preferences for user ${userId}`);
  }

  /**
   * Get reminder preferences for a user
   */
  async getReminderPreferences(userId: string): Promise<ReminderPreferences> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    let userPreferences = await this.userPreferencesRepository.findOne({
      where: { userId },
    });

    if (!userPreferences) {
      // Create and save default preferences if they don't exist
      userPreferences = UserPreferences.createDefault(userId);
      await this.userPreferencesRepository.save(userPreferences);
    }

    return userPreferences.getReminderPreferences();
  }

  /**
   * Get all due reminders that need to be processed
   */
  async getDueReminders(): Promise<MilestoneReminder[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.reminderRepository
      .createQueryBuilder('reminder')
      .leftJoinAndSelect('reminder.milestone', 'milestone')
      .leftJoinAndSelect('milestone.student', 'student')
      .where('reminder.sent = false')
      .andWhere('reminder.canRetry() = true')
      .andWhere(
        `(
                    (reminder.daysBefore >= 0 AND DATE(milestone.dueDate) - INTERVAL reminder.daysBefore DAY <= :today) OR
                    (reminder.daysBefore < 0 AND DATE(milestone.dueDate) + INTERVAL ABS(reminder.daysBefore) DAY <= :today)
                )`,
        { today: today.toISOString().split('T')[0] },
      )
      .andWhere('milestone.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [
          MilestoneStatus.COMPLETED,
          MilestoneStatus.CANCELLED,
        ],
      })
      .orderBy('milestone.dueDate', 'ASC')
      .addOrderBy('reminder.daysBefore', 'DESC')
      .getMany();
  }

  /**
   * Get overdue milestones that need escalation to supervisors
   */
  async getOverdueMilestonesForEscalation(): Promise<Milestone[]> {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    return this.milestoneRepository
      .createQueryBuilder('milestone')
      .leftJoinAndSelect('milestone.student', 'student')
      .leftJoinAndSelect('milestone.project', 'project')
      .where('milestone.dueDate < :threeDaysAgo', {
        threeDaysAgo: threeDaysAgo.toISOString().split('T')[0],
      })
      .andWhere('milestone.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [
          MilestoneStatus.COMPLETED,
          MilestoneStatus.CANCELLED,
        ],
      })
      .orderBy('milestone.dueDate', 'ASC')
      .getMany();
  }

  /**
   * Reschedule reminders for a milestone (e.g., when due date changes)
   */
  async rescheduleReminders(
    milestoneId: string,
  ): Promise<ReminderScheduleResult> {
    this.logger.log(`Rescheduling reminders for milestone ${milestoneId}`);

    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId },
      relations: ['student'],
    });

    if (!milestone) {
      return {
        remindersCreated: 0,
        remindersUpdated: 0,
        errors: [`Milestone ${milestoneId} not found`],
      };
    }

    // Get user preferences
    const preferences = await this.getReminderPreferences(milestone.studentId);

    // Remove all existing unsent reminders and reschedule
    await this.removeUnsentReminders(milestoneId);
    return this.scheduleRemindersForMilestone(milestoneId, preferences);
  }

  /**
   * Clean up old processed reminders
   */
  async cleanupOldReminders(daysOld: number = 30): Promise<number> {
    this.logger.log(`Cleaning up reminders older than ${daysOld} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.reminderRepository
      .createQueryBuilder()
      .delete()
      .where('sent = true')
      .andWhere('sentAt < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Cleaned up ${result.affected} old reminders`);
    return result.affected || 0;
  }

  private async scheduleAdvanceReminders(
    milestone: Milestone,
    preferences: ReminderPreferences,
    result: ReminderScheduleResult,
  ): Promise<void> {
    const reminderTypes: ReminderType[] = [];
    if (preferences.emailEnabled) reminderTypes.push(ReminderType.EMAIL);
    if (preferences.inAppEnabled) reminderTypes.push(ReminderType.IN_APP);
    if (preferences.smsEnabled) reminderTypes.push(ReminderType.SMS);

    for (const days of preferences.advanceReminderDays) {
      for (const type of reminderTypes) {
        try {
          const reminder = this.reminderRepository.create({
            milestoneId: milestone.id,
            reminderType: type,
            daysBefore: days,
            sent: false,
          });

          await this.reminderRepository.save(reminder);
          result.remindersCreated++;
        } catch (error) {
          result.errors.push(
            `Failed to create ${type} reminder for ${days} days before: ${error.message}`,
          );
        }
      }
    }
  }

  private async scheduleOverdueReminders(
    milestone: Milestone,
    preferences: ReminderPreferences,
    result: ReminderScheduleResult,
  ): Promise<void> {
    const reminderTypes: ReminderType[] = [];
    if (preferences.emailEnabled) reminderTypes.push(ReminderType.EMAIL);
    if (preferences.inAppEnabled) reminderTypes.push(ReminderType.IN_APP);

    for (const days of this.DEFAULT_OVERDUE_DAYS) {
      for (const type of reminderTypes) {
        try {
          const reminder = this.reminderRepository.create({
            milestoneId: milestone.id,
            reminderType: type,
            daysBefore: days, // Negative value for overdue
            sent: false,
          });

          await this.reminderRepository.save(reminder);
          result.remindersCreated++;
        } catch (error) {
          result.errors.push(
            `Failed to create overdue ${type} reminder for ${Math.abs(days)} days after: ${error.message}`,
          );
        }
      }
    }
  }

  private async removeUnsentReminders(milestoneId: string): Promise<void> {
    await this.reminderRepository
      .createQueryBuilder()
      .delete()
      .where('milestoneId = :milestoneId', { milestoneId })
      .andWhere('sent = false')
      .execute();
  }
}
