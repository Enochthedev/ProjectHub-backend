import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MilestoneReminder } from '../entities/milestone-reminder.entity';
import {
  ReminderDeliveryException,
  EmailReminderDeliveryException,
  SMSReminderDeliveryException,
  ReminderRetryExhaustedException,
} from '../common/exceptions/milestone.exception';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface DeliveryResult {
  success: boolean;
  error?: string;
  attemptCount: number;
}

@Injectable()
export class ReminderRetryService {
  private readonly logger = new Logger(ReminderRetryService.name);

  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000, // 1 second
    maxDelayMs: 30000, // 30 seconds
    backoffMultiplier: 2,
  };

  constructor(
    @InjectRepository(MilestoneReminder)
    private readonly reminderRepository: Repository<MilestoneReminder>,
  ) {}

  /**
   * Execute reminder delivery with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    reminderId: string,
    deliveryMethod: 'email' | 'sms' | 'in_app',
    config: Partial<RetryConfig> = {},
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        this.logger.debug(
          `Attempting reminder delivery (attempt ${attempt}/${retryConfig.maxRetries})`,
          {
            reminderId,
            deliveryMethod,
            attempt,
          },
        );

        const result = await operation();

        // Update reminder with successful delivery
        await this.updateReminderStatus(reminderId, true, null, attempt);

        this.logger.log(
          `Reminder delivered successfully on attempt ${attempt}`,
          {
            reminderId,
            deliveryMethod,
          },
        );

        return result;
      } catch (error) {
        lastError = error;

        this.logger.warn(`Reminder delivery failed on attempt ${attempt}`, {
          reminderId,
          deliveryMethod,
          attempt,
          error: error.message,
        });

        // Update reminder with failure info
        await this.updateReminderStatus(
          reminderId,
          false,
          error.message,
          attempt,
        );

        // If this was the last attempt, throw retry exhausted exception
        if (attempt === retryConfig.maxRetries) {
          throw new ReminderRetryExhaustedException(
            reminderId,
            retryConfig.maxRetries,
            error.message,
          );
        }

        // Calculate delay for next attempt with exponential backoff
        const delay = this.calculateDelay(attempt, retryConfig);

        this.logger.debug(`Waiting ${delay}ms before next attempt`, {
          reminderId,
          attempt,
          nextAttempt: attempt + 1,
        });

        await this.sleep(delay);
      }
    }

    // This should never be reached, but just in case
    throw new ReminderRetryExhaustedException(
      reminderId,
      retryConfig.maxRetries,
      lastError?.message || 'Unknown error',
    );
  }

  /**
   * Retry email reminder delivery
   */
  async retryEmailDelivery(
    emailOperation: () => Promise<void>,
    reminderId: string,
    recipientEmail: string,
    config?: Partial<RetryConfig>,
  ): Promise<void> {
    try {
      await this.executeWithRetry(emailOperation, reminderId, 'email', config);
    } catch (error) {
      if (error instanceof ReminderRetryExhaustedException) {
        throw new EmailReminderDeliveryException(
          recipientEmail,
          error.details.lastError,
          error.details.maxRetries,
        );
      }
      throw error;
    }
  }

  /**
   * Retry SMS reminder delivery
   */
  async retrySMSDelivery(
    smsOperation: () => Promise<void>,
    reminderId: string,
    recipientPhone: string,
    config?: Partial<RetryConfig>,
  ): Promise<void> {
    try {
      await this.executeWithRetry(smsOperation, reminderId, 'sms', config);
    } catch (error) {
      if (error instanceof ReminderRetryExhaustedException) {
        throw new SMSReminderDeliveryException(
          recipientPhone,
          error.details.lastError,
          error.details.maxRetries,
        );
      }
      throw error;
    }
  }

  /**
   * Get retry statistics for a reminder
   */
  async getRetryStats(reminderId: string): Promise<{
    totalAttempts: number;
    lastAttemptAt: Date | null;
    lastError: string | null;
    isDelivered: boolean;
  }> {
    const reminder = await this.reminderRepository.findOne({
      where: { id: reminderId },
    });

    if (!reminder) {
      return {
        totalAttempts: 0,
        lastAttemptAt: null,
        lastError: null,
        isDelivered: false,
      };
    }

    return {
      totalAttempts: reminder.attemptCount || 0,
      lastAttemptAt: reminder.lastAttemptAt || null,
      lastError: reminder.errorMessage || null,
      isDelivered: reminder.sent,
    };
  }

  /**
   * Reset reminder for retry (useful for manual retry operations)
   */
  async resetReminderForRetry(reminderId: string): Promise<void> {
    await this.reminderRepository.update(reminderId, {
      sent: false,
      sentAt: null,
      errorMessage: null,
      attemptCount: 0,
      lastAttemptAt: null,
    });

    this.logger.log(`Reminder reset for retry`, { reminderId });
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay =
      config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * exponentialDelay;

    const totalDelay = exponentialDelay + jitter;

    return Math.min(totalDelay, config.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update reminder status in database
   */
  private async updateReminderStatus(
    reminderId: string,
    sent: boolean,
    errorMessage: string | null,
    attemptCount: number,
  ): Promise<void> {
    const updateData: Partial<MilestoneReminder> = {
      sent,
      errorMessage,
      attemptCount,
      lastAttemptAt: new Date(),
    };

    if (sent) {
      updateData.sentAt = new Date();
    }

    await this.reminderRepository.update(reminderId, updateData);
  }
}
