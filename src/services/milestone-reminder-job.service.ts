import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReminderSchedulingService } from './reminder-scheduling.service';
import { MilestoneEmailReminderService } from './milestone-email-reminder.service';
import { MilestoneReminder } from '../entities/milestone-reminder.entity';
import { Milestone } from '../entities/milestone.entity';
import { MilestoneStatus } from '../common/enums/milestone-status.enum';

export interface ReminderJobResult {
  processedReminders: number;
  successfulReminders: number;
  failedReminders: number;
  escalationsSent: number;
  errors: string[];
  executionTime: number;
}

export interface CleanupJobResult {
  cleanedReminders: number;
  cleanedMilestones: number;
  executionTime: number;
}

@Injectable()
export class MilestoneReminderJobService {
  private readonly logger = new Logger(MilestoneReminderJobService.name);
  private isProcessingReminders = false;
  private isProcessingEscalations = false;
  private isCleaningUp = false;

  constructor(
    private readonly reminderSchedulingService: ReminderSchedulingService,
    private readonly emailReminderService: MilestoneEmailReminderService,
    @InjectRepository(MilestoneReminder)
    private readonly reminderRepository: Repository<MilestoneReminder>,
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
  ) {}

  /**
   * Daily cron job to process due milestone reminders
   * Runs every day at 9:00 AM
   */
  @Cron('0 9 * * *', {
    name: 'process-milestone-reminders',
    timeZone: 'UTC',
  })
  async processReminders(): Promise<void> {
    if (this.isProcessingReminders) {
      this.logger.warn('Reminder processing already in progress, skipping...');
      return;
    }

    this.isProcessingReminders = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting daily milestone reminder processing');

      const result = await this.processDueReminders();

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Reminder processing completed in ${executionTime}ms: ` +
          `${result.successfulReminders}/${result.processedReminders} successful, ` +
          `${result.failedReminders} failed, ${result.escalationsSent} escalations sent`,
      );

      if (result.errors.length > 0) {
        this.logger.warn(
          `Reminder processing errors: ${result.errors.join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to process milestone reminders', error);
    } finally {
      this.isProcessingReminders = false;
    }
  }

  /**
   * Hourly cron job to retry failed reminders
   * Runs every hour at minute 30
   */
  @Cron('30 * * * *', {
    name: 'retry-failed-reminders',
    timeZone: 'UTC',
  })
  async retryFailedReminders(): Promise<void> {
    if (this.isProcessingReminders) {
      this.logger.log('Skipping retry job - main processing is running');
      return;
    }

    try {
      this.logger.log('Starting failed reminder retry job');

      const result = await this.emailReminderService.retryFailedReminders();

      this.logger.log(
        `Retry job completed: ${result.successful}/${result.retried} successful, ${result.failed} failed`,
      );
    } catch (error) {
      this.logger.error('Failed to retry failed reminders', error);
    }
  }

  /**
   * Daily cron job to process supervisor escalations for overdue milestones
   * Runs every day at 10:00 AM (after reminder processing)
   */
  @Cron('0 10 * * *', {
    name: 'process-supervisor-escalations',
    timeZone: 'UTC',
  })
  async processEscalations(): Promise<void> {
    if (this.isProcessingEscalations) {
      this.logger.warn(
        'Escalation processing already in progress, skipping...',
      );
      return;
    }

    this.isProcessingEscalations = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting supervisor escalation processing');

      const result = await this.processOverdueEscalations();

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Escalation processing completed in ${executionTime}ms: ${result.escalationsSent} escalations sent`,
      );

      if (result.errors.length > 0) {
        this.logger.warn(
          `Escalation processing errors: ${result.errors.join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to process supervisor escalations', error);
    } finally {
      this.isProcessingEscalations = false;
    }
  }

  /**
   * Weekly cron job to clean up old processed reminders
   * Runs every Sunday at 2:00 AM
   */
  @Cron('0 2 * * 0', {
    name: 'cleanup-old-reminders',
    timeZone: 'UTC',
  })
  async cleanupOldReminders(): Promise<void> {
    if (this.isCleaningUp) {
      this.logger.warn('Cleanup already in progress, skipping...');
      return;
    }

    this.isCleaningUp = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting weekly reminder cleanup');

      const result = await this.performCleanup();

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Cleanup completed in ${executionTime}ms: ` +
          `${result.cleanedReminders} reminders, ${result.cleanedMilestones} milestones cleaned`,
      );
    } catch (error) {
      this.logger.error('Failed to cleanup old reminders', error);
    } finally {
      this.isCleaningUp = false;
    }
  }

  /**
   * Manual trigger for processing reminders (for testing/admin use)
   */
  async manualProcessReminders(): Promise<ReminderJobResult> {
    if (this.isProcessingReminders) {
      throw new Error('Reminder processing already in progress');
    }

    this.logger.log('Manual reminder processing triggered');
    return this.processDueReminders();
  }

  /**
   * Manual trigger for processing escalations (for testing/admin use)
   */
  async manualProcessEscalations(): Promise<ReminderJobResult> {
    if (this.isProcessingEscalations) {
      throw new Error('Escalation processing already in progress');
    }

    this.logger.log('Manual escalation processing triggered');
    return this.processOverdueEscalations();
  }

  /**
   * Manual trigger for cleanup (for testing/admin use)
   */
  async manualCleanup(): Promise<CleanupJobResult> {
    if (this.isCleaningUp) {
      throw new Error('Cleanup already in progress');
    }

    this.logger.log('Manual cleanup triggered');
    return this.performCleanup();
  }

  /**
   * Get job status information
   */
  getJobStatus(): {
    isProcessingReminders: boolean;
    isProcessingEscalations: boolean;
    isCleaningUp: boolean;
  } {
    return {
      isProcessingReminders: this.isProcessingReminders,
      isProcessingEscalations: this.isProcessingEscalations,
      isCleaningUp: this.isCleaningUp,
    };
  }

  private async processDueReminders(): Promise<ReminderJobResult> {
    const startTime = Date.now();
    const result: ReminderJobResult = {
      processedReminders: 0,
      successfulReminders: 0,
      failedReminders: 0,
      escalationsSent: 0,
      errors: [],
      executionTime: 0,
    };

    try {
      // Get all due reminders
      const dueReminders =
        await this.reminderSchedulingService.getDueReminders();

      if (dueReminders.length === 0) {
        this.logger.log('No due reminders found');
        result.executionTime = Date.now() - startTime;
        return result;
      }

      this.logger.log(`Found ${dueReminders.length} due reminders to process`);

      // Process reminders in batches to avoid overwhelming the email service
      const batchSize = 10;
      const batches = this.chunkArray(dueReminders, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        this.logger.log(
          `Processing batch ${i + 1}/${batches.length} (${batch.length} reminders)`,
        );

        const batchResult =
          await this.emailReminderService.processBatchReminders(batch);

        result.processedReminders += batchResult.processed;
        result.successfulReminders += batchResult.successful;
        result.failedReminders += batchResult.failed;
        result.errors.push(...batchResult.errors);

        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await this.delay(1000); // 1 second delay
        }
      }
    } catch (error) {
      this.logger.error('Error during reminder processing', error);
      result.errors.push(`Processing error: ${error.message}`);
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  private async processOverdueEscalations(): Promise<ReminderJobResult> {
    const startTime = Date.now();
    const result: ReminderJobResult = {
      processedReminders: 0,
      successfulReminders: 0,
      failedReminders: 0,
      escalationsSent: 0,
      errors: [],
      executionTime: 0,
    };

    try {
      // Get overdue milestones that need escalation
      const overdueMilestones =
        await this.reminderSchedulingService.getOverdueMilestonesForEscalation();

      if (overdueMilestones.length === 0) {
        this.logger.log('No overdue milestones found for escalation');
        result.executionTime = Date.now() - startTime;
        return result;
      }

      this.logger.log(
        `Found ${overdueMilestones.length} overdue milestones for escalation`,
      );

      for (const milestone of overdueMilestones) {
        try {
          const escalationResult =
            await this.emailReminderService.sendSupervisorEscalation(milestone);

          if (escalationResult.success) {
            result.escalationsSent++;
          } else {
            result.errors.push(
              `Escalation failed for milestone ${milestone.id}: ${escalationResult.error}`,
            );
          }

          // Add small delay between escalations
          await this.delay(500);
        } catch (error) {
          result.errors.push(
            `Escalation error for milestone ${milestone.id}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error during escalation processing', error);
      result.errors.push(`Escalation processing error: ${error.message}`);
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  private async performCleanup(): Promise<CleanupJobResult> {
    const startTime = Date.now();
    const result: CleanupJobResult = {
      cleanedReminders: 0,
      cleanedMilestones: 0,
      executionTime: 0,
    };

    try {
      // Clean up old processed reminders (older than 30 days)
      result.cleanedReminders =
        await this.reminderSchedulingService.cleanupOldReminders(30);

      // Clean up cancelled milestones older than 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const cleanupResult = await this.milestoneRepository
        .createQueryBuilder()
        .delete()
        .where('status = :status', { status: MilestoneStatus.CANCELLED })
        .andWhere('updatedAt < :cutoffDate', { cutoffDate: ninetyDaysAgo })
        .execute();

      result.cleanedMilestones = cleanupResult.affected || 0;
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
