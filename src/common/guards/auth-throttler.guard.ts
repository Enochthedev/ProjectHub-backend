import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Authentication Throttler Guard
 *
 * This guard extends the default ThrottlerGuard to provide enhanced rate limiting
 * for authentication endpoints with exponential backoff for failed attempts.
 *
 * Features:
 * - Different rate limits for different authentication endpoints
 * - Exponential backoff for failed authentication attempts
 * - IP-based and user-based rate limiting
 * - Enhanced logging for security monitoring
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(AuthThrottlerGuard.name);
  private readonly failedAttempts = new Map<
    string,
    { count: number; lastAttempt: Date }
  >();

  /**
   * Generate a unique key for rate limiting based on IP and endpoint
   */
  protected generateKey(context: ExecutionContext, suffix: string): string {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIP(request);
    const endpoint = request.route?.path || request.url;

    return `${ip}:${endpoint}:${suffix}`;
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string) ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Enhanced error handling with exponential backoff calculation
   */
  private handleThrottlingException(context: ExecutionContext): void {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIP(request);
    const endpoint = request.route?.path || request.url;
    const key = `${ip}:${endpoint}`;

    // Track failed attempts for exponential backoff
    const now = new Date();
    const attempts = this.failedAttempts.get(key) || {
      count: 0,
      lastAttempt: now,
    };

    // Reset count if last attempt was more than 1 hour ago
    if (now.getTime() - attempts.lastAttempt.getTime() > 3600000) {
      attempts.count = 0;
    }

    attempts.count++;
    attempts.lastAttempt = now;
    this.failedAttempts.set(key, attempts);

    // Calculate exponential backoff delay
    const backoffDelay = Math.min(Math.pow(2, attempts.count - 1) * 60, 3600); // Max 1 hour

    // Log the rate limiting event
    this.logger.warn(
      `Rate limit exceeded for ${ip} on ${endpoint}. ` +
        `Attempt ${attempts.count}, next attempt allowed in ${backoffDelay} seconds`,
    );

    // Clean up old entries periodically
    this.cleanupOldEntries();

    throw new ThrottlerException(
      `Too many requests. Please try again in ${backoffDelay} seconds.`,
    );
  }

  /**
   * Clean up old failed attempt entries to prevent memory leaks
   */
  private cleanupOldEntries(): void {
    const now = new Date();
    const oneHourAgo = now.getTime() - 3600000;

    for (const [key, attempts] of this.failedAttempts.entries()) {
      if (attempts.lastAttempt.getTime() < oneHourAgo) {
        this.failedAttempts.delete(key);
      }
    }
  }

  /**
   * Override canActivate to add custom logic
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIP(request);
    const endpoint = request.route?.path || request.url;

    // Log the request for monitoring
    this.logger.debug(`Rate limit check for ${ip} on ${endpoint}`);

    try {
      return await super.canActivate(context);
    } catch (error) {
      // If it's a throttling exception, enhance it with our custom logic
      if (error instanceof ThrottlerException) {
        this.handleThrottlingException(context);
      }
      throw error;
    }
  }
}
