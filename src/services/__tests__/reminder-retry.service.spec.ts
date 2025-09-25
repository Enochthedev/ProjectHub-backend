import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReminderRetryService } from '../reminder-retry.service';
import { MilestoneReminder } from '../../entities/milestone-reminder.entity';
import {
  EmailReminderDeliveryException,
  SMSReminderDeliveryException,
  ReminderRetryExhaustedException,
} from '../../common/exceptions/milestone.exception';

describe('ReminderRetryService', () => {
  let service: ReminderRetryService;
  let reminderRepository: jest.Mocked<Repository<MilestoneReminder>>;

  const mockReminderRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderRetryService,
        {
          provide: getRepositoryToken(MilestoneReminder),
          useValue: mockReminderRepository,
        },
      ],
    }).compile();

    service = module.get<ReminderRetryService>(ReminderRetryService);
    reminderRepository = module.get(getRepositoryToken(MilestoneReminder));

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const reminderId = 'reminder-123';

      const result = await service.executeWithRetry(
        mockOperation,
        reminderId,
        'email',
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(reminderRepository.update).toHaveBeenCalledWith(
        reminderId,
        expect.objectContaining({
          sent: true,
          errorMessage: null,
          attemptCount: 1,
          sentAt: expect.any(Date),
          lastAttemptAt: expect.any(Date),
        }),
      );
    });

    it('should retry on failure and succeed on second attempt', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce('success');
      const reminderId = 'reminder-123';

      // Mock sleep to avoid actual delays in tests
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      const result = await service.executeWithRetry(
        mockOperation,
        reminderId,
        'email',
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);

      // Should update with failure first
      expect(reminderRepository.update).toHaveBeenNthCalledWith(
        1,
        reminderId,
        expect.objectContaining({
          sent: false,
          errorMessage: 'First attempt failed',
          attemptCount: 1,
          lastAttemptAt: expect.any(Date),
        }),
      );

      // Then update with success
      expect(reminderRepository.update).toHaveBeenNthCalledWith(
        2,
        reminderId,
        expect.objectContaining({
          sent: true,
          errorMessage: null,
          attemptCount: 2,
          sentAt: expect.any(Date),
          lastAttemptAt: expect.any(Date),
        }),
      );
    });

    it('should throw ReminderRetryExhaustedException after max retries', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error('Always fails'));
      const reminderId = 'reminder-123';

      // Mock sleep to avoid actual delays in tests
      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      await expect(
        service.executeWithRetry(mockOperation, reminderId, 'email', {
          maxRetries: 2,
        }),
      ).rejects.toThrow(ReminderRetryExhaustedException);

      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(reminderRepository.update).toHaveBeenCalledTimes(2);
    });

    it('should calculate exponential backoff delays correctly', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const sleepSpy = jest
        .spyOn(service as any, 'sleep')
        .mockResolvedValue(undefined);

      await service.executeWithRetry(mockOperation, 'reminder-123', 'email', {
        baseDelayMs: 100,
        backoffMultiplier: 2,
      });

      // Should have called sleep twice (after first and second failures)
      expect(sleepSpy).toHaveBeenCalledTimes(2);

      // First delay should be around 100ms (base delay)
      const firstDelay = sleepSpy.mock.calls[0][0];
      expect(firstDelay).toBeGreaterThanOrEqual(100);
      expect(firstDelay).toBeLessThan(150); // With jitter

      // Second delay should be around 200ms (base * multiplier)
      const secondDelay = sleepSpy.mock.calls[1][0];
      expect(secondDelay).toBeGreaterThanOrEqual(200);
      expect(secondDelay).toBeLessThan(250); // With jitter
    });
  });

  describe('retryEmailDelivery', () => {
    it('should successfully retry email delivery', async () => {
      const mockEmailOperation = jest.fn().mockResolvedValue(undefined);
      const reminderId = 'reminder-123';
      const recipientEmail = 'test@example.com';

      await service.retryEmailDelivery(
        mockEmailOperation,
        reminderId,
        recipientEmail,
      );

      expect(mockEmailOperation).toHaveBeenCalledTimes(1);
      expect(reminderRepository.update).toHaveBeenCalledWith(
        reminderId,
        expect.objectContaining({ sent: true }),
      );
    });

    it('should throw EmailReminderDeliveryException on retry exhaustion', async () => {
      const mockEmailOperation = jest
        .fn()
        .mockRejectedValue(new Error('Email failed'));
      const reminderId = 'reminder-123';
      const recipientEmail = 'test@example.com';

      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      await expect(
        service.retryEmailDelivery(
          mockEmailOperation,
          reminderId,
          recipientEmail,
          { maxRetries: 1 },
        ),
      ).rejects.toThrow(EmailReminderDeliveryException);
    });
  });

  describe('retrySMSDelivery', () => {
    it('should successfully retry SMS delivery', async () => {
      const mockSMSOperation = jest.fn().mockResolvedValue(undefined);
      const reminderId = 'reminder-123';
      const recipientPhone = '+1234567890';

      await service.retrySMSDelivery(
        mockSMSOperation,
        reminderId,
        recipientPhone,
      );

      expect(mockSMSOperation).toHaveBeenCalledTimes(1);
      expect(reminderRepository.update).toHaveBeenCalledWith(
        reminderId,
        expect.objectContaining({ sent: true }),
      );
    });

    it('should throw SMSReminderDeliveryException on retry exhaustion', async () => {
      const mockSMSOperation = jest
        .fn()
        .mockRejectedValue(new Error('SMS failed'));
      const reminderId = 'reminder-123';
      const recipientPhone = '+1234567890';

      jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);

      await expect(
        service.retrySMSDelivery(mockSMSOperation, reminderId, recipientPhone, {
          maxRetries: 1,
        }),
      ).rejects.toThrow(SMSReminderDeliveryException);
    });
  });

  describe('getRetryStats', () => {
    it('should return retry statistics for existing reminder', async () => {
      const mockReminder = {
        id: 'reminder-123',
        attemptCount: 2,
        lastAttemptAt: new Date('2024-01-01'),
        errorMessage: 'Last error',
        sent: false,
      };

      reminderRepository.findOne.mockResolvedValue(
        mockReminder as MilestoneReminder,
      );

      const stats = await service.getRetryStats('reminder-123');

      expect(stats).toEqual({
        totalAttempts: 2,
        lastAttemptAt: new Date('2024-01-01'),
        lastError: 'Last error',
        isDelivered: false,
      });
    });

    it('should return default stats for non-existent reminder', async () => {
      reminderRepository.findOne.mockResolvedValue(null);

      const stats = await service.getRetryStats('non-existent');

      expect(stats).toEqual({
        totalAttempts: 0,
        lastAttemptAt: null,
        lastError: null,
        isDelivered: false,
      });
    });
  });

  describe('resetReminderForRetry', () => {
    it('should reset reminder fields for retry', async () => {
      const reminderId = 'reminder-123';

      await service.resetReminderForRetry(reminderId);

      expect(reminderRepository.update).toHaveBeenCalledWith(reminderId, {
        sent: false,
        sentAt: null,
        errorMessage: null,
        attemptCount: 0,
        lastAttemptAt: null,
      });
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff with jitter', () => {
      const config = {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        backoffMultiplier: 2,
      };

      // Test first attempt (attempt = 1)
      const delay1 = (service as any).calculateDelay(1, config);
      expect(delay1).toBeGreaterThanOrEqual(1000); // Base delay
      expect(delay1).toBeLessThan(1200); // Base + 10% jitter

      // Test second attempt (attempt = 2)
      const delay2 = (service as any).calculateDelay(2, config);
      expect(delay2).toBeGreaterThanOrEqual(2000); // Base * 2
      expect(delay2).toBeLessThan(2400); // (Base * 2) + 10% jitter

      // Test third attempt (attempt = 3)
      const delay3 = (service as any).calculateDelay(3, config);
      expect(delay3).toBeGreaterThanOrEqual(4000); // Base * 4
      expect(delay3).toBeLessThan(4800); // (Base * 4) + 10% jitter
    });

    it('should respect maximum delay limit', () => {
      const config = {
        maxRetries: 10,
        baseDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      };

      // Test high attempt number that would exceed max delay
      const delay = (service as any).calculateDelay(10, config);
      expect(delay).toBeLessThanOrEqual(5000);
    });
  });
});
