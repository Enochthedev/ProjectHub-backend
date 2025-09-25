import { Injectable, Logger } from '@nestjs/common';
import {
  RateLimitingService,
  RateLimitConfig,
} from '../common/services/rate-limiting.service';
import { MilestoneRateLimitException } from '../common/exceptions/milestone.exception';

export interface MilestoneRateLimitConfig extends RateLimitConfig {
  endpoint: string;
  userRole?: string;
  projectId?: string;
}

export interface MilestoneRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
  endpoint: string;
}

@Injectable()
export class MilestoneRateLimitingService {
  private readonly logger = new Logger(MilestoneRateLimitingService.name);

  // Milestone-specific rate limit configurations
  private readonly milestoneRateLimits: Record<string, RateLimitConfig> = {
    milestone_creation: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10, // 10 milestones per hour
    },
    milestone_update: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20, // 20 updates per minute
    },
    milestone_status_update: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 status updates per minute
    },
    milestone_note_creation: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 15, // 15 notes per minute
    },
    milestone_deletion: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5, // 5 deletions per hour
    },
    template_application: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 template applications per hour
    },
    reminder_management: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 reminder operations per minute
    },
    progress_calculation: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 50, // 50 progress calculations per minute
    },
    milestone_search: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 searches per minute
    },
    bulk_operations: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 2, // 2 bulk operations per hour
    },
  };

  constructor(private readonly rateLimitingService: RateLimitingService) {
    // Register milestone-specific rate limits
    this.registerMilestoneRateLimits();
  }

  /**
   * Check rate limit for milestone operations
   */
  async checkMilestoneRateLimit(
    userId: string,
    operation: string,
    customConfig?: Partial<RateLimitConfig>,
  ): Promise<MilestoneRateLimitResult> {
    const config = this.getMilestoneRateLimitConfig(operation, customConfig);
    const identifier = this.generateMilestoneIdentifier(userId, operation);

    try {
      const result = await this.rateLimitingService.checkRateLimit(
        identifier,
        operation,
        config,
      );

      return {
        ...result,
        endpoint: operation,
      };
    } catch (error) {
      this.logger.error(`Rate limit check failed for operation ${operation}`, {
        userId,
        operation,
        error: error.message,
      });

      // Return conservative result on error
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + (config?.windowMs || 60000),
        totalHits: 0,
        endpoint: operation,
      };
    }
  }

  /**
   * Enforce rate limit for milestone operations
   */
  async enforceMilestoneRateLimit(
    userId: string,
    operation: string,
    customConfig?: Partial<RateLimitConfig>,
  ): Promise<void> {
    const result = await this.checkMilestoneRateLimit(
      userId,
      operation,
      customConfig,
    );

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

      this.logger.warn(`Rate limit exceeded for milestone operation`, {
        userId,
        operation,
        retryAfter,
        totalHits: result.totalHits,
      });

      throw new MilestoneRateLimitException(
        operation,
        `Rate limit exceeded for ${operation}. Try again in ${retryAfter} seconds.`,
        retryAfter,
      );
    }
  }

  /**
   * Check rate limit for project-specific operations
   */
  async checkProjectRateLimit(
    userId: string,
    projectId: string,
    operation: string,
    customConfig?: Partial<RateLimitConfig>,
  ): Promise<MilestoneRateLimitResult> {
    const config = this.getMilestoneRateLimitConfig(operation, customConfig);
    const identifier = this.generateProjectIdentifier(
      userId,
      projectId,
      operation,
    );

    try {
      const result = await this.rateLimitingService.checkRateLimit(
        identifier,
        `project_${operation}`,
        config,
      );

      return {
        ...result,
        endpoint: `project_${operation}`,
      };
    } catch (error) {
      this.logger.error(`Project rate limit check failed`, {
        userId,
        projectId,
        operation,
        error: error.message,
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + (config?.windowMs || 60000),
        totalHits: 0,
        endpoint: `project_${operation}`,
      };
    }
  }

  /**
   * Enforce project-specific rate limits
   */
  async enforceProjectRateLimit(
    userId: string,
    projectId: string,
    operation: string,
    customConfig?: Partial<RateLimitConfig>,
  ): Promise<void> {
    const result = await this.checkProjectRateLimit(
      userId,
      projectId,
      operation,
      customConfig,
    );

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

      this.logger.warn(`Project rate limit exceeded`, {
        userId,
        projectId,
        operation,
        retryAfter,
      });

      throw new MilestoneRateLimitException(
        `project_${operation}`,
        `Rate limit exceeded for project ${operation}. Try again in ${retryAfter} seconds.`,
        retryAfter,
      );
    }
  }

  /**
   * Get rate limit status for multiple operations
   */
  async getBulkRateLimitStatus(
    userId: string,
    operations: string[],
  ): Promise<Record<string, MilestoneRateLimitResult>> {
    const results: Record<string, MilestoneRateLimitResult> = {};

    for (const operation of operations) {
      try {
        results[operation] = await this.checkMilestoneRateLimit(
          userId,
          operation,
        );
      } catch (error) {
        this.logger.error(
          `Bulk rate limit check failed for operation ${operation}`,
          {
            userId,
            operation,
            error: error.message,
          },
        );

        results[operation] = {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 60000,
          totalHits: 0,
          endpoint: operation,
        };
      }
    }

    return results;
  }

  /**
   * Reset rate limit for specific user and operation
   */
  async resetMilestoneRateLimit(
    userId: string,
    operation: string,
  ): Promise<void> {
    const identifier = this.generateMilestoneIdentifier(userId, operation);

    try {
      await this.rateLimitingService.resetRateLimit(identifier, operation);

      this.logger.log(`Rate limit reset for milestone operation`, {
        userId,
        operation,
      });
    } catch (error) {
      this.logger.error(`Failed to reset rate limit`, {
        userId,
        operation,
        error: error.message,
      });
    }
  }

  /**
   * Get rate limit configuration for operation
   */
  getMilestoneRateLimitConfig(
    operation: string,
    customConfig?: Partial<RateLimitConfig>,
  ): RateLimitConfig {
    const baseConfig =
      this.milestoneRateLimits[operation] ||
      this.milestoneRateLimits.milestone_update;

    return {
      ...baseConfig,
      ...customConfig,
    };
  }

  /**
   * Update rate limit configuration for operation
   */
  updateMilestoneRateLimitConfig(
    operation: string,
    config: RateLimitConfig,
  ): void {
    this.milestoneRateLimits[operation] = config;

    this.logger.log(
      `Updated rate limit configuration for operation ${operation}`,
      {
        operation,
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
      },
    );
  }

  /**
   * Get comprehensive rate limit status for user
   */
  async getUserRateLimitStatus(userId: string): Promise<{
    user: string;
    operations: Record<string, MilestoneRateLimitResult>;
    overallStatus: 'healthy' | 'warning' | 'limited';
    nextResetTime: number;
  }> {
    const operations = Object.keys(this.milestoneRateLimits);
    const results = await this.getBulkRateLimitStatus(userId, operations);

    // Determine overall status
    const limitedOperations = Object.values(results).filter((r) => !r.allowed);
    const warningOperations = Object.values(results).filter(
      (r) => r.remaining < 3,
    );

    let overallStatus: 'healthy' | 'warning' | 'limited' = 'healthy';
    if (limitedOperations.length > 0) {
      overallStatus = 'limited';
    } else if (warningOperations.length > 0) {
      overallStatus = 'warning';
    }

    // Find next reset time
    const nextResetTime = Math.min(
      ...Object.values(results).map((r) => r.resetTime),
    );

    return {
      user: userId,
      operations: results,
      overallStatus,
      nextResetTime,
    };
  }

  /**
   * Register milestone-specific rate limits with the base service
   */
  private registerMilestoneRateLimits(): void {
    for (const [operation, config] of Object.entries(
      this.milestoneRateLimits,
    )) {
      this.rateLimitingService.updateRateLimitConfig(operation, config);
    }

    this.logger.log(
      `Registered ${Object.keys(this.milestoneRateLimits).length} milestone rate limit configurations`,
    );
  }

  /**
   * Generate identifier for milestone operations
   */
  private generateMilestoneIdentifier(
    userId: string,
    operation: string,
  ): string {
    return `milestone_${userId}_${operation}`;
  }

  /**
   * Generate identifier for project-specific operations
   */
  private generateProjectIdentifier(
    userId: string,
    projectId: string,
    operation: string,
  ): string {
    return `project_${userId}_${projectId}_${operation}`;
  }

  /**
   * Create rate limit decorator for milestone controllers
   */
  createMilestoneRateLimitDecorator(
    operation: string,
    customConfig?: Partial<RateLimitConfig>,
  ) {
    return (
      target: any,
      propertyName: string,
      descriptor: PropertyDescriptor,
    ) => {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const request = args.find((arg) => arg && arg.user);
        if (request && request.user) {
          await this.milestoneRateLimitingService.enforceMilestoneRateLimit(
            request.user.id,
            operation,
            customConfig,
          );
        }

        return method.apply(this, args);
      };

      return descriptor;
    };
  }
}
