import { HttpStatus } from '@nestjs/common';
import {
  MilestoneNotFoundException,
  InvalidMilestoneStatusException,
  MilestoneValidationException,
  MilestonePermissionException,
  MilestoneDependencyException,
  AcademicCalendarException,
  AcademicCalendarConflictException,
  TemplateApplicationException,
  TemplateNotFoundException,
  TemplateValidationException,
  TemplateDeadlineConflictException,
  ReminderDeliveryException,
  EmailReminderDeliveryException,
  SMSReminderDeliveryException,
  ReminderRetryExhaustedException,
  MilestoneBlockingReasonRequiredException,
  MilestoneCompletionValidationException,
  MilestoneDueDateValidationException,
  ICalExportException,
  CalendarSyncException,
  MilestoneOwnershipException,
  MilestoneRateLimitException,
  MilestoneContentSanitizationException,
} from '../milestone.exception';
import { MilestoneStatus } from '../../enums/milestone-status.enum';

describe('Milestone Exceptions', () => {
  describe('MilestoneNotFoundException', () => {
    it('should create exception with correct message and details', () => {
      const milestoneId = 'test-milestone-id';
      const exception = new MilestoneNotFoundException(milestoneId);

      expect(exception.message).toBe(
        `Milestone with ID ${milestoneId} not found`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.errorCode).toBe('MILESTONE_NOT_FOUND');
      expect(exception.details).toEqual({ milestoneId });
    });
  });

  describe('InvalidMilestoneStatusException', () => {
    it('should create exception with status transition details', () => {
      const currentStatus = MilestoneStatus.COMPLETED;
      const targetStatus = MilestoneStatus.IN_PROGRESS;
      const exception = new InvalidMilestoneStatusException(
        currentStatus,
        targetStatus,
      );

      expect(exception.message).toBe(
        `Cannot change milestone status from ${currentStatus} to ${targetStatus}`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('INVALID_STATUS_TRANSITION');
      expect(exception.details).toEqual({ currentStatus, targetStatus });
    });
  });

  describe('MilestoneValidationException', () => {
    it('should create exception with custom message and details', () => {
      const message = 'Invalid milestone data';
      const details = { field: 'title', reason: 'too short' };
      const exception = new MilestoneValidationException(message, details);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('MILESTONE_VALIDATION_ERROR');
      expect(exception.details).toEqual(details);
    });
  });

  describe('MilestonePermissionException', () => {
    it('should create exception with default message', () => {
      const exception = new MilestonePermissionException();

      expect(exception.message).toBe(
        'Insufficient permissions to access this milestone',
      );
      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.errorCode).toBe('MILESTONE_PERMISSION_ERROR');
    });

    it('should create exception with custom message', () => {
      const customMessage = 'Custom permission error';
      const exception = new MilestonePermissionException(customMessage);

      expect(exception.message).toBe(customMessage);
    });
  });

  describe('AcademicCalendarConflictException', () => {
    it('should create exception with conflict details', () => {
      const conflictDate = new Date('2024-12-25');
      const conflictReason = 'Christmas holiday';
      const exception = new AcademicCalendarConflictException(
        conflictDate,
        conflictReason,
      );

      expect(exception.message).toBe(
        `Milestone due date conflicts with academic calendar: ${conflictReason}`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('ACADEMIC_CALENDAR_CONFLICT');
      expect(exception.details).toEqual({ conflictDate, conflictReason });
    });
  });

  describe('TemplateApplicationException', () => {
    it('should create exception with application error details', () => {
      const message = 'Template application failed';
      const details = { templateId: 'template-123', reason: 'invalid dates' };
      const exception = new TemplateApplicationException(message, details);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('TEMPLATE_APPLICATION_ERROR');
      expect(exception.details).toEqual(details);
    });
  });

  describe('TemplateNotFoundException', () => {
    it('should create exception with template ID', () => {
      const templateId = 'template-not-found';
      const exception = new TemplateNotFoundException(templateId);

      expect(exception.message).toBe(
        `Milestone template with ID ${templateId} not found`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.errorCode).toBe('TEMPLATE_NOT_FOUND');
      expect(exception.details).toEqual({ templateId });
    });
  });

  describe('TemplateDeadlineConflictException', () => {
    it('should create exception with conflicting milestones', () => {
      const conflictingMilestones = ['milestone-1', 'milestone-2'];
      const details = { projectId: 'project-123' };
      const exception = new TemplateDeadlineConflictException(
        conflictingMilestones,
        details,
      );

      expect(exception.message).toBe(
        'Template application would create deadline conflicts with existing milestones',
      );
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.errorCode).toBe('TEMPLATE_DEADLINE_CONFLICT');
      expect(exception.details).toEqual({
        conflictingMilestones,
        projectId: 'project-123',
      });
    });
  });

  describe('EmailReminderDeliveryException', () => {
    it('should create exception with email delivery details', () => {
      const recipientEmail = 'test@example.com';
      const error = 'SMTP connection failed';
      const attemptCount = 3;
      const exception = new EmailReminderDeliveryException(
        recipientEmail,
        error,
        attemptCount,
      );

      expect(exception.message).toBe(
        `Failed to deliver email reminder to ${recipientEmail}: ${error}`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.errorCode).toBe('REMINDER_DELIVERY_ERROR');
      expect(exception.details).toEqual({
        recipientEmail,
        error,
        attemptCount,
        deliveryMethod: 'email',
      });
    });

    it('should use default attempt count of 1', () => {
      const recipientEmail = 'test@example.com';
      const error = 'Network error';
      const exception = new EmailReminderDeliveryException(
        recipientEmail,
        error,
      );

      expect(exception.details.attemptCount).toBe(1);
    });
  });

  describe('SMSReminderDeliveryException', () => {
    it('should create exception with SMS delivery details', () => {
      const recipientPhone = '+1234567890';
      const error = 'SMS gateway timeout';
      const attemptCount = 2;
      const exception = new SMSReminderDeliveryException(
        recipientPhone,
        error,
        attemptCount,
      );

      expect(exception.message).toBe(
        `Failed to deliver SMS reminder to ${recipientPhone}: ${error}`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.errorCode).toBe('REMINDER_DELIVERY_ERROR');
      expect(exception.details).toEqual({
        recipientPhone,
        error,
        attemptCount,
        deliveryMethod: 'sms',
      });
    });
  });

  describe('ReminderRetryExhaustedException', () => {
    it('should create exception with retry details', () => {
      const reminderId = 'reminder-123';
      const maxRetries = 3;
      const lastError = 'Final delivery attempt failed';
      const exception = new ReminderRetryExhaustedException(
        reminderId,
        maxRetries,
        lastError,
      );

      expect(exception.message).toBe(
        `Reminder delivery failed after ${maxRetries} attempts`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.errorCode).toBe('REMINDER_RETRY_EXHAUSTED');
      expect(exception.details).toEqual({ reminderId, maxRetries, lastError });
    });
  });

  describe('MilestoneBlockingReasonRequiredException', () => {
    it('should create exception with milestone ID', () => {
      const milestoneId = 'milestone-blocked';
      const exception = new MilestoneBlockingReasonRequiredException(
        milestoneId,
      );

      expect(exception.message).toBe(
        'Blocking reason is required when marking milestone as blocked',
      );
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('BLOCKING_REASON_REQUIRED');
      expect(exception.details).toEqual({ milestoneId });
    });
  });

  describe('MilestoneCompletionValidationException', () => {
    it('should create exception with completion validation details', () => {
      const message = 'Cannot complete milestone with pending dependencies';
      const milestoneId = 'milestone-123';
      const details = { pendingDependencies: ['dep-1', 'dep-2'] };
      const exception = new MilestoneCompletionValidationException(
        message,
        milestoneId,
        details,
      );

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('MILESTONE_COMPLETION_VALIDATION_ERROR');
      expect(exception.details).toEqual({
        milestoneId,
        pendingDependencies: ['dep-1', 'dep-2'],
      });
    });
  });

  describe('MilestoneDueDateValidationException', () => {
    it('should create exception with due date validation details', () => {
      const message = 'Due date cannot be in the past';
      const providedDate = new Date('2023-01-01');
      const details = { currentDate: new Date() };
      const exception = new MilestoneDueDateValidationException(
        message,
        providedDate,
        details,
      );

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('MILESTONE_DUE_DATE_VALIDATION_ERROR');
      expect(exception.details).toEqual({
        providedDate,
        currentDate: expect.any(Date),
      });
    });
  });

  describe('MilestoneOwnershipException', () => {
    it('should create exception with ownership details', () => {
      const milestoneId = 'milestone-123';
      const userId = 'user-456';
      const exception = new MilestoneOwnershipException(milestoneId, userId);

      expect(exception.message).toBe(
        `User ${userId} does not have ownership of milestone ${milestoneId}`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.errorCode).toBe('MILESTONE_OWNERSHIP_ERROR');
      expect(exception.details).toEqual({ milestoneId, userId });
    });
  });

  describe('MilestoneRateLimitException', () => {
    it('should create exception with rate limit details', () => {
      const operation = 'create_milestone';
      const retryAfter = 60;
      const exception = new MilestoneRateLimitException(operation, retryAfter);

      expect(exception.message).toBe(
        `Rate limit exceeded for milestone ${operation}. Try again in ${retryAfter} seconds`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(exception.errorCode).toBe('MILESTONE_RATE_LIMIT_EXCEEDED');
      expect(exception.details).toEqual({ operation, retryAfter });
    });
  });

  describe('MilestoneContentSanitizationException', () => {
    it('should create exception with sanitization details', () => {
      const field = 'description';
      const reason = 'contains malicious script tags';
      const exception = new MilestoneContentSanitizationException(
        field,
        reason,
      );

      expect(exception.message).toBe(
        `Invalid content in field '${field}': ${reason}`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('MILESTONE_CONTENT_SANITIZATION_ERROR');
      expect(exception.details).toEqual({ field, reason });
    });
  });

  describe('ICalExportException', () => {
    it('should create exception with export error details', () => {
      const message = 'Failed to generate iCal file';
      const details = { format: 'ics', error: 'Invalid date format' };
      const exception = new ICalExportException(message, details);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.errorCode).toBe('ICAL_EXPORT_ERROR');
      expect(exception.details).toEqual(details);
    });
  });

  describe('CalendarSyncException', () => {
    it('should create exception with sync error details', () => {
      const message = 'Calendar synchronization failed';
      const details = { provider: 'google', error: 'Authentication expired' };
      const exception = new CalendarSyncException(message, details);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('CALENDAR_SYNC_ERROR');
      expect(exception.details).toEqual(details);
    });
  });
});
