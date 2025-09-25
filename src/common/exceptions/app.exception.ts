import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base application exception class
 * Provides structured error responses with error codes and optional details
 */
export class AppException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus,
    public readonly errorCode: string,
    public readonly details?: any,
  ) {
    super({ message, errorCode, details }, statusCode);
  }
}

/**
 * Authentication specific exceptions
 */
export class AuthenticationException extends AppException {
  constructor(message: string, details?: any) {
    super(message, HttpStatus.UNAUTHORIZED, 'AUTH_ERROR', details);
  }
}

/**
 * Authorization specific exceptions
 */
export class AuthorizationException extends AppException {
  constructor(message: string, details?: any) {
    super(message, HttpStatus.FORBIDDEN, 'AUTHORIZATION_ERROR', details);
  }
}

/**
 * Validation specific exceptions
 */
export class ValidationException extends AppException {
  constructor(message: string, details?: any) {
    super(message, HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', details);
  }
}

/**
 * Resource not found exceptions
 */
export class ResourceNotFoundException extends AppException {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, HttpStatus.NOT_FOUND, 'RESOURCE_NOT_FOUND', {
      resource,
      identifier,
    });
  }
}

/**
 * Business logic exceptions
 */
export class BusinessLogicException extends AppException {
  constructor(message: string, details?: any) {
    super(
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'BUSINESS_LOGIC_ERROR',
      details,
    );
  }
}

/**
 * Rate limiting exceptions
 */
export class RateLimitException extends AppException {
  constructor(message: string, retryAfter?: number) {
    super(message, HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED', {
      retryAfter,
    });
  }
}

/**
 * AI Service specific exceptions
 */
export class AIServiceException extends AppException {
  constructor(message: string, details?: any) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE, 'AI_SERVICE_ERROR', details);
  }
}

/**
 * Rate limit exceeded for AI services
 */
export class RateLimitExceededException extends AppException {
  constructor(resetTime?: Date) {
    super(
      'AI service rate limit exceeded',
      HttpStatus.TOO_MANY_REQUESTS,
      'RATE_LIMIT_EXCEEDED',
      { resetTime },
    );
  }
}

/**
 * Insufficient profile data for AI recommendations
 */
export class InsufficientProfileDataException extends AppException {
  constructor(missingFields: string[]) {
    super(
      'Insufficient profile data for recommendations',
      HttpStatus.BAD_REQUEST,
      'INSUFFICIENT_PROFILE_DATA',
      { missingFields },
    );
  }
}

/**
 * AI model timeout exception
 */
export class AIModelTimeoutException extends AppException {
  constructor(model: string, timeoutMs: number) {
    super(
      `AI model '${model}' request timed out after ${timeoutMs}ms`,
      HttpStatus.REQUEST_TIMEOUT,
      'AI_MODEL_TIMEOUT',
      { model, timeoutMs },
    );
  }
}

/**
 * Circuit breaker open exception
 */
export class CircuitBreakerOpenException extends AppException {
  constructor(service: string, resetTime?: Date) {
    super(
      `Circuit breaker is open for service '${service}'`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'CIRCUIT_BREAKER_OPEN',
      { service, resetTime },
    );
  }
}

/**
 * Insufficient permissions exception
 */
export class InsufficientPermissionsException extends AppException {
  constructor(message: string, details?: any) {
    super(message, HttpStatus.FORBIDDEN, 'INSUFFICIENT_PERMISSIONS', details);
  }
}
