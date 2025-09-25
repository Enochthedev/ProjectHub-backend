import { registerAs } from '@nestjs/config';

/**
 * Throttler Configuration
 *
 * Defines rate limiting configurations for different authentication endpoints.
 * These configurations implement security best practices with different limits
 * for different types of operations.
 */
export default registerAs('throttler', () => ({
  // Default rate limiting for general endpoints
  default: {
    ttl: 60000, // 1 minute
    limit: 60, // 60 requests per minute
  },

  // Login endpoint - more restrictive due to security concerns
  login: {
    ttl: 60000, // 1 minute
    limit: 5, // 5 login attempts per minute
  },

  // Registration endpoint - moderate restrictions
  register: {
    ttl: 300000, // 5 minutes
    limit: 3, // 3 registration attempts per 5 minutes
  },

  // Password reset request - very restrictive to prevent abuse
  forgotPassword: {
    ttl: 600000, // 10 minutes
    limit: 2, // 2 password reset requests per 10 minutes
  },

  // Email verification - moderate restrictions
  verifyEmail: {
    ttl: 300000, // 5 minutes
    limit: 5, // 5 verification attempts per 5 minutes
  },

  // Token refresh - more lenient for legitimate usage
  refresh: {
    ttl: 60000, // 1 minute
    limit: 10, // 10 refresh attempts per minute
  },

  // Resend verification email - restrictive to prevent spam
  resendVerification: {
    ttl: 300000, // 5 minutes
    limit: 3, // 3 resend attempts per 5 minutes
  },
}));
