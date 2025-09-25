import { SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * Custom Throttle Decorators for Authentication Endpoints
 *
 * These decorators provide pre-configured rate limiting for different
 * authentication operations with security-appropriate limits.
 */

/**
 * Throttle decorator for login endpoints
 * Allows 5 attempts per minute
 */
export const ThrottleLogin = () =>
  Throttle({ default: { limit: 5, ttl: 60000 } });

/**
 * Throttle decorator for registration endpoints
 * Allows 3 attempts per 5 minutes
 */
export const ThrottleRegister = () =>
  Throttle({ default: { limit: 3, ttl: 300000 } });

/**
 * Throttle decorator for password reset endpoints
 * Allows 2 attempts per 10 minutes
 */
export const ThrottleForgotPassword = () =>
  Throttle({ default: { limit: 2, ttl: 600000 } });

/**
 * Throttle decorator for email verification endpoints
 * Allows 5 attempts per 5 minutes
 */
export const ThrottleVerifyEmail = () =>
  Throttle({ default: { limit: 5, ttl: 300000 } });

/**
 * Throttle decorator for token refresh endpoints
 * Allows 10 attempts per minute
 */
export const ThrottleRefresh = () =>
  Throttle({ default: { limit: 10, ttl: 60000 } });

/**
 * Throttle decorator for resend verification endpoints
 * Allows 3 attempts per 5 minutes
 */
export const ThrottleResendVerification = () =>
  Throttle({ default: { limit: 3, ttl: 300000 } });

/**
 * Generic throttle decorator with custom limits
 *
 * @param limit - Number of requests allowed
 * @param ttl - Time window in milliseconds
 */
export const ThrottleCustom = (limit: number, ttl: number) =>
  Throttle({ default: { limit, ttl } });
