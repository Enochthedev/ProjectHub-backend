import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIApiUsage } from '../entities/ai-api-usage.entity';

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: Date;
  monthlyUsage: number;
  monthlyLimit: number;
}

export interface UsageTrackingData {
  endpoint: string;
  model: string;
  tokensUsed: number;
  responseTimeMs: number;
  success: boolean;
  errorMessage?: string;
  userId?: string;
}

@Injectable()
export class AIRateLimiterService {
  private readonly logger = new Logger(AIRateLimiterService.name);
  private readonly rateLimitPerMinute: number;
  private readonly rateLimitPerMonth: number;
  private readonly requestCounts = new Map<
    string,
    { count: number; resetTime: Date }
  >();

  constructor(
    @InjectRepository(AIApiUsage)
    private readonly aiApiUsageRepository: Repository<AIApiUsage>,
    private readonly configService: ConfigService,
  ) {
    this.rateLimitPerMinute =
      this.configService.get<number>('huggingFace.rateLimitPerMinute') || 10;
    this.rateLimitPerMonth =
      this.configService.get<number>('huggingFace.rateLimitPerMonth') || 30000;
  }

  /**
   * Check if a request is allowed based on rate limits
   */
  async checkRateLimit(userId?: string): Promise<RateLimitResult> {
    const key = userId || 'anonymous';
    const now = new Date();

    // Check per-minute rate limit
    const minuteLimit = await this.checkMinuteLimit(key, now);

    // Check monthly limit
    const monthlyUsage = await this.getMonthlyUsage(userId);
    const monthlyAllowed = monthlyUsage < this.rateLimitPerMonth;

    const allowed = minuteLimit.allowed && monthlyAllowed;

    return {
      allowed,
      remainingRequests: minuteLimit.remainingRequests,
      resetTime: minuteLimit.resetTime,
      monthlyUsage,
      monthlyLimit: this.rateLimitPerMonth,
    };
  }

  /**
   * Track API usage after a request is made
   */
  async trackUsage(data: UsageTrackingData): Promise<void> {
    try {
      const usage = this.aiApiUsageRepository.create({
        endpoint: data.endpoint,
        model: data.model,
        tokensUsed: data.tokensUsed,
        responseTimeMs: data.responseTimeMs,
        success: data.success,
        errorMessage: data.errorMessage,
        userId: data.userId,
      });

      await this.aiApiUsageRepository.save(usage);

      this.logger.debug(
        `Tracked API usage: ${data.endpoint} - ${data.tokensUsed} tokens`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to track API usage: ${error.message}`,
        error.stack,
      );
      // Don't throw error to avoid breaking the main request
    }
  }

  /**
   * Get usage statistics for a user or globally
   */
  async getUsageStats(userId?: string, startDate?: Date, endDate?: Date) {
    const queryBuilder = this.aiApiUsageRepository.createQueryBuilder('usage');

    if (userId) {
      queryBuilder.where('usage.userId = :userId', { userId });
    }

    if (startDate) {
      queryBuilder.andWhere('usage.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('usage.createdAt <= :endDate', { endDate });
    }

    const [usages, totalRequests] = await queryBuilder.getManyAndCount();

    const totalTokens = usages.reduce(
      (sum, usage) => sum + usage.tokensUsed,
      0,
    );
    const successfulRequests = usages.filter((usage) => usage.success).length;
    const averageResponseTime =
      usages.length > 0
        ? usages.reduce((sum, usage) => sum + usage.responseTimeMs, 0) /
          usages.length
        : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests: totalRequests - successfulRequests,
      totalTokens,
      averageResponseTime: Math.round(averageResponseTime),
      successRate:
        totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
    };
  }

  /**
   * Get monthly usage for rate limiting
   */
  private async getMonthlyUsage(userId?: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const queryBuilder = this.aiApiUsageRepository
      .createQueryBuilder('usage')
      .where('usage.createdAt >= :startOfMonth', { startOfMonth })
      .andWhere('usage.success = :success', { success: true });

    if (userId) {
      queryBuilder.andWhere('usage.userId = :userId', { userId });
    }

    return await queryBuilder.getCount();
  }

  /**
   * Check per-minute rate limit
   */
  private async checkMinuteLimit(
    key: string,
    now: Date,
  ): Promise<{ allowed: boolean; remainingRequests: number; resetTime: Date }> {
    const currentMinute = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
    );
    const resetTime = new Date(currentMinute.getTime() + 60000); // Next minute

    const existing = this.requestCounts.get(key);

    if (!existing || existing.resetTime <= now) {
      // Reset or initialize counter
      this.requestCounts.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remainingRequests: this.rateLimitPerMinute - 1,
        resetTime,
      };
    }

    if (existing.count >= this.rateLimitPerMinute) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: existing.resetTime,
      };
    }

    // Increment counter
    existing.count++;
    this.requestCounts.set(key, existing);

    return {
      allowed: true,
      remainingRequests: this.rateLimitPerMinute - existing.count,
      resetTime: existing.resetTime,
    };
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupExpiredEntries(): void {
    const now = new Date();
    for (const [key, data] of this.requestCounts.entries()) {
      if (data.resetTime <= now) {
        this.requestCounts.delete(key);
      }
    }
  }
}
