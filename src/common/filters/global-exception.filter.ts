import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';
import { AppException } from '../exceptions';

/**
 * Global exception filter that handles all exceptions in the application
 * Provides structured error responses and proper logging
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log error details (but don't expose sensitive information to client)
    this.logError(exception, request, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse.body);
  }

  /**
   * Build structured error response based on exception type
   */
  private buildErrorResponse(exception: unknown, request: Request) {
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    let details: any = undefined;

    if (exception instanceof AppException) {
      // Handle custom application exceptions
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      message = exceptionResponse.message;
      errorCode = exceptionResponse.errorCode;
      details = exceptionResponse.details;
    } else if (exception instanceof ThrottlerException) {
      // Handle rate limiting exceptions
      statusCode = HttpStatus.TOO_MANY_REQUESTS;
      message = exception.message;
      errorCode = 'RATE_LIMIT_EXCEEDED';
    } else if (exception instanceof HttpException) {
      // Handle other NestJS HTTP exceptions
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorCode = this.mapHttpStatusToErrorCode(statusCode);
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || responseObj.error || 'HTTP Exception';

        // Handle validation errors specifically
        if (Array.isArray(responseObj.message)) {
          message = 'Validation failed';
          details = { validationErrors: responseObj.message };
          errorCode = 'VALIDATION_ERROR';
        } else {
          errorCode = this.mapHttpStatusToErrorCode(statusCode);
        }
      } else {
        errorCode = this.mapHttpStatusToErrorCode(statusCode);
      }
    } else if (exception instanceof Error) {
      // Handle generic errors
      message = this.isProduction()
        ? 'Internal server error'
        : exception.message;
      errorCode = 'INTERNAL_ERROR';
    }

    return {
      statusCode,
      body: {
        success: false,
        errorCode,
        message,
        ...(details && { details }),
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      },
    };
  }

  /**
   * Log error details for monitoring and debugging
   */
  private logError(
    exception: unknown,
    request: Request,
    errorResponse: any,
  ): void {
    const { statusCode, body } = errorResponse;
    const { method, url, ip, headers } = request;

    const logContext = {
      method,
      url,
      ip,
      userAgent: headers['user-agent'],
      statusCode,
      errorCode: body.errorCode,
      timestamp: body.timestamp,
    };

    // Log different levels based on status code
    if (statusCode >= 500) {
      // Server errors - log as error with full stack trace
      this.logger.error(
        `${method} ${url} - ${body.message}`,
        exception instanceof Error ? exception.stack : String(exception),
        logContext,
      );
    } else if (statusCode >= 400) {
      // Client errors - log as warning
      this.logger.warn(`${method} ${url} - ${body.message}`, logContext);
    } else {
      // Other cases - log as debug
      this.logger.debug(`${method} ${url} - ${body.message}`, logContext);
    }
  }

  /**
   * Map HTTP status codes to error codes
   */
  private mapHttpStatusToErrorCode(statusCode: number): string {
    const statusCodeMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.METHOD_NOT_ALLOWED]: 'METHOD_NOT_ALLOWED',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMIT_EXCEEDED',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
      [HttpStatus.BAD_GATEWAY]: 'BAD_GATEWAY',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
    };

    return statusCodeMap[statusCode] || 'UNKNOWN_ERROR';
  }

  /**
   * Check if running in production environment
   */
  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }
}
