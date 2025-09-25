import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';
import { MilestoneStatus } from '../enums/milestone-status.enum';

/**
 * Milestone not found exception
 */
export class MilestoneNotFoundException extends AppException {
  constructor(milestoneId: string) {
    super(
      `Milestone with ID ${milestoneId} not found`,
      HttpStatus.NOT_FOUND,
      'MILESTONE_NOT_FOUND',
      { milestoneId },
    );
  }
}

/**
 * Invalid milestone status transition exception
 */
export class InvalidMilestoneStatusException extends AppException {
  constructor(currentStatus: MilestoneStatus, targetStatus: MilestoneStatus) {
    super(
      `Cannot change milestone status from ${currentStatus} to ${targetStatus}`,
      HttpStatus.BAD_REQUEST,
      'INVALID_STATUS_TRANSITION',
      { currentStatus, targetStatus },
    );
  }
}

/**
 * Milestone validation exception
 */
export class MilestoneValidationException extends AppException {
  constructor(message: string, details?: any) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      'MILESTONE_VALIDATION_ERROR',
      details,
    );
  }
}

/**
 * Milestone permission exception
 */
export class MilestonePermissionException extends AppException {
  constructor(
    message: string = 'Insufficient permissions to access this milestone',
  ) {
    super(message, HttpStatus.FORBIDDEN, 'MILESTONE_PERMISSION_ERROR');
  }
}

/**
 * Milestone dependency exception
 */
export class MilestoneDependencyException extends AppException {
  constructor(message: string, details?: any) {
    super(message, HttpStatus.CONFLICT, 'MILESTONE_DEPENDENCY_ERROR', details);
  }
}

/**
 * Academic calendar conflict exception
 */
export class AcademicCalendarException extends AppException {
  constructor(message: string, details?: any) {
    super(message, HttpStatus.BAD_REQUEST, 'ACADEMIC_CALENDAR_ERROR', details);
  }
}

/**
 * Academic calendar conflict during milestone creation
 */
export class AcademicCalendarConflictException extends AppException {
  constructor(conflictDate: Date, conflictReason: string) {
    super(
      `Milestone due date conflicts with academic calendar: ${conflictReason}`,
      HttpStatus.BAD_REQUEST,
      'ACADEMIC_CALENDAR_CONFLICT',
      { conflictDate, conflictReason },
    );
  }
}

/**
 * Template application exception
 */
export class TemplateApplicationException extends AppException {
  constructor(message: string, details?: any) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      'TEMPLATE_APPLICATION_ERROR',
      details,
    );
  }
}

/**
 * Template not found exception
 */
export class TemplateNotFoundException extends AppException {
  constructor(templateId: string) {
    super(
      `Milestone template with ID ${templateId} not found`,
      HttpStatus.NOT_FOUND,
      'TEMPLATE_NOT_FOUND',
      { templateId },
    );
  }
}

/**
 * Template validation exception
 */
export class TemplateValidationException extends AppException {
  constructor(message: string, details?: any) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      'TEMPLATE_VALIDATION_ERROR',
      details,
    );
  }
}

/**
 * Template deadline conflict exception
 */
export class TemplateDeadlineConflictException extends AppException {
  constructor(conflictingMilestones: string[], details?: any) {
    super(
      `Template application would create deadline conflicts with existing milestones`,
      HttpStatus.CONFLICT,
      'TEMPLATE_DEADLINE_CONFLICT',
      { conflictingMilestones, ...details },
    );
  }
}

/**
 * Reminder delivery exception
 */
export class ReminderDeliveryException extends AppException {
  constructor(message: string, details?: any) {
    super(
      message,
      HttpStatus.SERVICE_UNAVAILABLE,
      'REMINDER_DELIVERY_ERROR',
      details,
    );
  }
}

/**
 * Email reminder delivery failure exception
 */
export class EmailReminderDeliveryException extends ReminderDeliveryException {
  constructor(recipientEmail: string, error: string, attemptCount: number = 1) {
    super(`Failed to deliver email reminder to ${recipientEmail}: ${error}`, {
      recipientEmail,
      error,
      attemptCount,
      deliveryMethod: 'email',
    });
  }
}

/**
 * SMS reminder delivery failure exception
 */
export class SMSReminderDeliveryException extends ReminderDeliveryException {
  constructor(recipientPhone: string, error: string, attemptCount: number = 1) {
    super(`Failed to deliver SMS reminder to ${recipientPhone}: ${error}`, {
      recipientPhone,
      error,
      attemptCount,
      deliveryMethod: 'sms',
    });
  }
}

/**
 * Reminder retry exhausted exception
 */
export class ReminderRetryExhaustedException extends AppException {
  constructor(reminderId: string, maxRetries: number, lastError: string) {
    super(
      `Reminder delivery failed after ${maxRetries} attempts`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'REMINDER_RETRY_EXHAUSTED',
      { reminderId, maxRetries, lastError },
    );
  }
}

/**
 * Milestone blocking reason required exception
 */
export class MilestoneBlockingReasonRequiredException extends AppException {
  constructor(milestoneId: string) {
    super(
      `Blocking reason is required when marking milestone as blocked`,
      HttpStatus.BAD_REQUEST,
      'BLOCKING_REASON_REQUIRED',
      { milestoneId },
    );
  }
}

/**
 * Milestone completion validation exception
 */
export class MilestoneCompletionValidationException extends AppException {
  constructor(message: string, milestoneId: string, details?: any) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      'MILESTONE_COMPLETION_VALIDATION_ERROR',
      { milestoneId, ...details },
    );
  }
}

/**
 * Milestone due date validation exception
 */
export class MilestoneDueDateValidationException extends AppException {
  constructor(message: string, providedDate: Date, details?: any) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      'MILESTONE_DUE_DATE_VALIDATION_ERROR',
      { providedDate, ...details },
    );
  }
}

/**
 * iCal export exception
 */
export class ICalExportException extends AppException {
  constructor(message: string, details?: any) {
    super(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'ICAL_EXPORT_ERROR',
      details,
    );
  }
}

/**
 * Calendar synchronization exception
 */
export class CalendarSyncException extends AppException {
  constructor(message: string, details?: any) {
    super(message, HttpStatus.BAD_REQUEST, 'CALENDAR_SYNC_ERROR', details);
  }
}

/**
 * Milestone ownership validation exception
 */
export class MilestoneOwnershipException extends AppException {
  constructor(milestoneId: string, userId: string) {
    super(
      `User ${userId} does not have ownership of milestone ${milestoneId}`,
      HttpStatus.FORBIDDEN,
      'MILESTONE_OWNERSHIP_ERROR',
      { milestoneId, userId },
    );
  }
}

/**
 * Milestone rate limit exception
 */
export class MilestoneRateLimitException extends AppException {
  constructor(operation: string, message: string, retryAfter: number) {
    super(
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      'MILESTONE_RATE_LIMIT_EXCEEDED',
      { operation, retryAfter },
    );
  }
}

/**
 * Milestone content sanitization exception
 */
export class MilestoneContentSanitizationException extends AppException {
  constructor(field: string, reason: string) {
    super(
      `Invalid content in field '${field}': ${reason}`,
      HttpStatus.BAD_REQUEST,
      'MILESTONE_CONTENT_SANITIZATION_ERROR',
      { field, reason },
    );
  }
}
