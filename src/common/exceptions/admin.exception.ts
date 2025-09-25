import { HttpException, HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

/**
 * Base Admin Exception
 *
 * All admin-specific exceptions extend from this base class to provide
 * consistent error handling and security logging for administrative operations.
 */
export class AdminException extends AppException {
  constructor(
    message: string,
    statusCode: HttpStatus,
    errorCode: string,
    public readonly adminId?: string,
    public readonly action?: string,
    public readonly resourceType?: string,
    public readonly resourceId?: string,
    details?: any,
  ) {
    super(message, statusCode, errorCode, {
      ...details,
      adminId,
      action,
      resourceType,
      resourceId,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Admin Authentication Exception
 *
 * Thrown when admin authentication fails with enhanced security context.
 */
export class AdminAuthenticationException extends AdminException {
  constructor(
    message: string,
    adminId?: string,
    ipAddress?: string,
    userAgent?: string,
    details?: any,
  ) {
    super(
      message,
      HttpStatus.UNAUTHORIZED,
      'ADMIN_AUTH_ERROR',
      adminId,
      'authenticate',
      'admin_session',
      undefined,
      {
        ...details,
        ipAddress,
        userAgent,
        securityLevel: 'high',
      },
    );
  }
}

/**
 * Admin Authorization Exception
 *
 * Thrown when admin lacks required permissions for an action.
 */
export class AdminAuthorizationException extends AdminException {
  constructor(
    message: string,
    adminId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    requiredPermissions?: string[],
    details?: any,
  ) {
    super(
      message,
      HttpStatus.FORBIDDEN,
      'ADMIN_AUTHORIZATION_ERROR',
      adminId,
      action,
      resourceType,
      resourceId,
      {
        ...details,
        requiredPermissions,
        securityLevel: 'high',
      },
    );
  }
}

/**
 * Admin Session Exception
 *
 * Thrown when admin session is invalid, expired, or compromised.
 */
export class AdminSessionException extends AdminException {
  constructor(
    message: string,
    adminId?: string,
    sessionId?: string,
    reason?: 'expired' | 'invalid' | 'compromised' | 'concurrent_limit',
    details?: any,
  ) {
    super(
      message,
      HttpStatus.UNAUTHORIZED,
      'ADMIN_SESSION_ERROR',
      adminId,
      'session_validation',
      'admin_session',
      sessionId,
      {
        ...details,
        reason,
        securityLevel: 'critical',
      },
    );
  }
}

/**
 * Admin Security Violation Exception
 *
 * Thrown when suspicious or malicious admin activity is detected.
 */
export class AdminSecurityViolationException extends AdminException {
  constructor(
    message: string,
    adminId: string,
    violationType:
      | 'suspicious_activity'
      | 'rate_limit'
      | 'ip_mismatch'
      | 'privilege_escalation'
      | 'data_exfiltration',
    action?: string,
    resourceType?: string,
    resourceId?: string,
    details?: any,
  ) {
    super(
      message,
      HttpStatus.FORBIDDEN,
      'ADMIN_SECURITY_VIOLATION',
      adminId,
      action,
      resourceType,
      resourceId,
      {
        ...details,
        violationType,
        securityLevel: 'critical',
        requiresInvestigation: true,
      },
    );
  }
}

/**
 * Admin Operation Exception
 *
 * Thrown when admin operations fail due to business logic or system constraints.
 */
export class AdminOperationException extends AdminException {
  constructor(
    message: string,
    adminId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    operationType?: 'create' | 'update' | 'delete' | 'bulk' | 'system_config',
    details?: any,
  ) {
    super(
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'ADMIN_OPERATION_ERROR',
      adminId,
      action,
      resourceType,
      resourceId,
      {
        ...details,
        operationType,
        securityLevel: 'medium',
      },
    );
  }
}

/**
 * Admin Rate Limit Exception
 *
 * Thrown when admin exceeds rate limits for sensitive operations.
 */
export class AdminRateLimitException extends AdminException {
  constructor(
    message: string,
    adminId: string,
    action: string,
    limit: number,
    windowMs: number,
    retryAfter?: number,
    details?: any,
  ) {
    super(
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      'ADMIN_RATE_LIMIT_EXCEEDED',
      adminId,
      action,
      'rate_limit',
      undefined,
      {
        ...details,
        limit,
        windowMs,
        retryAfter,
        securityLevel: 'high',
      },
    );
  }
}

/**
 * Admin Data Integrity Exception
 *
 * Thrown when admin operations would compromise data integrity.
 */
export class AdminDataIntegrityException extends AdminException {
  constructor(
    message: string,
    adminId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    integrityCheck?: string,
    details?: any,
  ) {
    super(
      message,
      HttpStatus.CONFLICT,
      'ADMIN_DATA_INTEGRITY_ERROR',
      adminId,
      action,
      resourceType,
      resourceId,
      {
        ...details,
        integrityCheck,
        securityLevel: 'high',
      },
    );
  }
}

/**
 * Admin System Configuration Exception
 *
 * Thrown when admin system configuration operations fail.
 */
export class AdminSystemConfigException extends AdminException {
  constructor(
    message: string,
    adminId: string,
    configKey: string,
    operation: 'read' | 'write' | 'delete',
    reason?: 'invalid_value' | 'dependency_conflict' | 'security_constraint',
    details?: any,
  ) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      'ADMIN_SYSTEM_CONFIG_ERROR',
      adminId,
      `config_${operation}`,
      'system_config',
      configKey,
      {
        ...details,
        operation,
        reason,
        securityLevel: 'critical',
      },
    );
  }
}

/**
 * Admin Audit Exception
 *
 * Thrown when audit logging fails for admin operations.
 */
export class AdminAuditException extends AdminException {
  constructor(
    message: string,
    adminId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    auditFailureReason?: string,
    details?: any,
  ) {
    super(
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'ADMIN_AUDIT_ERROR',
      adminId,
      action,
      resourceType,
      resourceId,
      {
        ...details,
        auditFailureReason,
        securityLevel: 'critical',
        requiresImmedateAttention: true,
      },
    );
  }
}

/**
 * Helper function to determine if an exception is admin-related
 */
export function isAdminException(error: any): error is AdminException {
  return error instanceof AdminException;
}

/**
 * Helper function to extract admin context from exception
 */
export function getAdminExceptionContext(error: AdminException): {
  adminId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  securityLevel?: string;
} {
  return {
    adminId: error.adminId,
    action: error.action,
    resourceType: error.resourceType,
    resourceId: error.resourceId,
    securityLevel: error.details?.securityLevel,
  };
}
