import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RateLimitException } from '../exceptions/app.exception';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (identifier: string) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

/**
 * Service for implementing rate limiting functionality
 */
@Injectable()
export class RateLimitingService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  // Default rate limit configurations for different endpoints
  private readonly DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
    search: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 requests per minute
    },
    bookmark: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20, // 20 requests per minute
    },
    project_creation: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5, // 5 projects per hour
    },
    project_update: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 updates per minute
    },
    analytics: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 requests per minute
    },
  };

  /**
   * Check if request is within rate limits
   */
  async checkRateLimit(
    identifier: string,
    endpoint: string,
    customConfig?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    const config = {
      ...this.DEFAULT_CONFIGS[endpoint],
      ...customConfig,
    };

    if (!config.windowMs || !config.maxRequests) {
      throw new Error(
        `Invalid rate limit configuration for endpoint: ${endpoint}`,
      );
    }

    const key = this.generateKey(identifier, endpoint, config);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get current request count from cache
    const currentData = await this.cacheManager.get<{
      count: number;
      resetTime: number;
      requests: number[];
    }>(key);

    let count = 0;
    let resetTime = now + config.windowMs;
    let requests: number[] = [];

    if (currentData && Array.isArray(currentData.requests)) {
      // Filter out requests outside the current window
      requests = currentData.requests.filter(
        (timestamp) => timestamp > windowStart,
      );
      count = requests.length;
      resetTime = currentData.resetTime;

      // If we're in a new window, reset the count
      if (now >= currentData.resetTime) {
        count = 0;
        requests = [];
        resetTime = now + config.windowMs;
      }
    }

    const allowed = count < config.maxRequests;
    const remaining = Math.max(
      0,
      config.maxRequests - count - (allowed ? 1 : 0),
    );

    if (allowed) {
      // Add current request timestamp
      requests.push(now);

      // Store updated data in cache
      await this.cacheManager.set(
        key,
        {
          count: requests.length,
          resetTime,
          requests,
        },
        config.windowMs,
      );
    }

    return {
      allowed,
      remaining,
      resetTime,
      totalHits: count + (allowed ? 1 : 0),
    };
  }

  /**
   * Enforce rate limit and throw exception if exceeded
   */
  async enforceRateLimit(
    identifier: string,
    endpoint: string,
    customConfig?: Partial<RateLimitConfig>,
  ): Promise<void> {
    const result = await this.checkRateLimit(
      identifier,
      endpoint,
      customConfig,
    );

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      throw new RateLimitException(
        `Rate limit exceeded for ${endpoint}. Try again in ${retryAfter} seconds.`,
        retryAfter,
      );
    }
  }

  /**
   * Get rate limit status without incrementing counter
   */
  async getRateLimitStatus(
    identifier: string,
    endpoint: string,
    customConfig?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    const config = {
      ...this.DEFAULT_CONFIGS[endpoint],
      ...customConfig,
    };

    const key = this.generateKey(identifier, endpoint, config);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const currentData = await this.cacheManager.get<{
      count: number;
      resetTime: number;
      requests: number[];
    }>(key);

    if (!currentData) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
        totalHits: 0,
      };
    }

    // Filter out requests outside the current window
    const requests = currentData.requests.filter(
      (timestamp) => timestamp > windowStart,
    );
    const count = requests.length;

    // Check if we're in a new window
    const resetTime =
      now >= currentData.resetTime
        ? now + config.windowMs
        : currentData.resetTime;
    const actualCount = now >= currentData.resetTime ? 0 : count;

    return {
      allowed: actualCount < config.maxRequests,
      remaining: Math.max(0, config.maxRequests - actualCount),
      resetTime,
      totalHits: actualCount,
    };
  }

  /**
   * Reset rate limit for a specific identifier and endpoint
   */
  async resetRateLimit(identifier: string, endpoint: string): Promise<void> {
    const config = this.DEFAULT_CONFIGS[endpoint];
    if (!config) {
      throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    const key = this.generateKey(identifier, endpoint, config);
    await this.cacheManager.del(key);
  }

  /**
   * Get rate limit configuration for an endpoint
   */
  getRateLimitConfig(endpoint: string): RateLimitConfig | undefined {
    return this.DEFAULT_CONFIGS[endpoint];
  }

  /**
   * Update rate limit configuration for an endpoint
   */
  updateRateLimitConfig(endpoint: string, config: RateLimitConfig): void {
    this.DEFAULT_CONFIGS[endpoint] = config;
  }

  /**
   * Generate cache key for rate limiting
   */
  private generateKey(
    identifier: string,
    endpoint: string,
    config: RateLimitConfig,
  ): string {
    if (config.keyGenerator) {
      return config.keyGenerator(identifier);
    }

    // Sanitize identifier to prevent cache key injection
    const sanitizedIdentifier = identifier.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `rate_limit:${endpoint}:${sanitizedIdentifier}`;
  }

  /**
   * Create rate limit decorator for controllers
   */
  createRateLimitDecorator(
    endpoint: string,
    customConfig?: Partial<RateLimitConfig>,
  ) {
    return (
      target: any,
      propertyName: string,
      descriptor: PropertyDescriptor,
    ) => {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const request = args.find((arg) => arg && arg.ip && arg.user);
        if (request) {
          const identifier = request.user?.id || request.ip;
          await this.rateLimitingService.enforceRateLimit(
            identifier,
            endpoint,
            customConfig,
          );
        }

        return method.apply(this, args);
      };

      return descriptor;
    };
  }
}
