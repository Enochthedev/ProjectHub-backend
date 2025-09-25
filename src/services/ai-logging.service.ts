import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { AIApiUsage } from '../entities/ai-api-usage.entity';
import { Recommendation } from '../entities/recommendation.entity';
import { RecommendationFeedback } from '../entities/recommendation-feedback.entity';

export interface AIOperationLog {
  operation: string;
  userId?: string;
  requestId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: any;
}

export interface RecommendationGenerationLog {
  studentId: string;
  requestId: string;
  profileSnapshot: any;
  generationMethod: 'ai' | 'fallback' | 'cached';
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  recommendationCount: number;
  averageSimilarityScore?: number;
  errorMessage?: string;
  aiApiCalls: number;
  tokensUsed: number;
  cacheHit: boolean;
  fallbackReason?: string;
}

export interface AIPerformanceMetrics {
  period: 'hour' | 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  cacheHitRate: number;
  fallbackRate: number;
  topErrors: Array<{ error: string; count: number }>;
  performanceByHour: Array<{
    hour: number;
    requests: number;
    avgResponseTime: number;
  }>;
}

@Injectable()
export class AILoggingService {
  private readonly logger = new Logger(AILoggingService.name);
  private readonly operationLogs = new Map<string, AIOperationLog>();
  private readonly maxLogRetention = 1000; // Keep last 1000 operations in memory

  constructor(
    @InjectRepository(AIApiUsage)
    private readonly aiApiUsageRepository: Repository<AIApiUsage>,
    @InjectRepository(Recommendation)
    private readonly recommendationRepository: Repository<Recommendation>,
    @InjectRepository(RecommendationFeedback)
    private readonly feedbackRepository: Repository<RecommendationFeedback>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Start logging an AI operation
   */
  startOperation(operation: string, userId?: string, metadata?: any): string {
    const requestId = this.generateRequestId();
    const operationLog: AIOperationLog = {
      operation,
      userId,
      requestId,
      startTime: new Date(),
      success: false,
      metadata,
    };

    this.operationLogs.set(requestId, operationLog);
    this.cleanupOldLogs();

    this.logger.debug(`Started AI operation: ${operation}`, {
      requestId,
      userId,
      operation,
      metadata,
    });

    return requestId;
  }

  /**
   * Complete an AI operation
   */
  completeOperation(
    requestId: string,
    success: boolean,
    errorMessage?: string,
    additionalMetadata?: any,
  ): void {
    const operationLog = this.operationLogs.get(requestId);
    if (!operationLog) {
      this.logger.warn(`Operation log not found for requestId: ${requestId}`);
      return;
    }

    operationLog.endTime = new Date();
    operationLog.duration =
      operationLog.endTime.getTime() - operationLog.startTime.getTime();
    operationLog.success = success;
    operationLog.errorMessage = errorMessage;

    if (additionalMetadata) {
      operationLog.metadata = {
        ...operationLog.metadata,
        ...additionalMetadata,
      };
    }

    const logLevel = success ? 'debug' : 'error';
    const message = success
      ? `Completed AI operation: ${operationLog.operation} (${operationLog.duration}ms)`
      : `Failed AI operation: ${operationLog.operation} - ${errorMessage}`;

    this.logger[logLevel](message, {
      requestId,
      operation: operationLog.operation,
      userId: operationLog.userId,
      duration: operationLog.duration,
      success,
      errorMessage,
      metadata: operationLog.metadata,
    });
  }

  /**
   * Log recommendation generation process
   */
  async logRecommendationGeneration(
    log: RecommendationGenerationLog,
  ): Promise<void> {
    try {
      this.logger.log(
        `Recommendation generation completed for student ${log.studentId}`,
        {
          requestId: log.requestId,
          studentId: log.studentId,
          method: log.generationMethod,
          duration: log.duration,
          success: log.success,
          recommendationCount: log.recommendationCount,
          averageSimilarityScore: log.averageSimilarityScore,
          aiApiCalls: log.aiApiCalls,
          tokensUsed: log.tokensUsed,
          cacheHit: log.cacheHit,
          fallbackReason: log.fallbackReason,
        },
      );

      // Store detailed log in database for analytics
      if (this.shouldPersistLog()) {
        await this.persistRecommendationLog(log);
      }
    } catch (error) {
      this.logger.error(
        `Failed to log recommendation generation: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Log AI API usage with detailed metrics
   */
  async logAIApiUsage(
    endpoint: string,
    model: string,
    tokensUsed: number,
    responseTimeMs: number,
    success: boolean,
    errorMessage?: string,
    userId?: string,
    requestId?: string,
    additionalMetadata?: any,
  ): Promise<void> {
    try {
      // Log to application logger
      const logData = {
        endpoint,
        model,
        tokensUsed,
        responseTimeMs,
        success,
        errorMessage,
        userId,
        requestId,
        ...additionalMetadata,
      };

      if (success) {
        this.logger.debug(`AI API call successful: ${endpoint}`, logData);
      } else {
        this.logger.error(
          `AI API call failed: ${endpoint} - ${errorMessage}`,
          logData,
        );
      }

      // Store in database
      const apiUsage = this.aiApiUsageRepository.create({
        endpoint,
        model,
        tokensUsed,
        responseTimeMs,
        success,
        errorMessage,
        userId,
      });

      await this.aiApiUsageRepository.save(apiUsage);
    } catch (error) {
      this.logger.error(`Failed to log AI API usage: ${error.message}`, error);
    }
  }

  /**
   * Log recommendation feedback
   */
  async logRecommendationFeedback(
    recommendationId: string,
    projectId: string,
    feedbackType: string,
    rating?: number,
    comment?: string,
    userId?: string,
  ): Promise<void> {
    try {
      this.logger.log(`Recommendation feedback received`, {
        recommendationId,
        projectId,
        feedbackType,
        rating,
        hasComment: !!comment,
        userId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to log recommendation feedback: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Log system performance metrics
   */
  logPerformanceMetrics(
    operation: string,
    metrics: {
      responseTime: number;
      memoryUsage: number;
      cpuUsage?: number;
      cacheHitRate?: number;
      errorRate?: number;
    },
  ): void {
    this.logger.debug(`Performance metrics for ${operation}`, {
      operation,
      ...metrics,
      timestamp: new Date(),
    });
  }

  /**
   * Log security events related to AI operations
   */
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any,
    userId?: string,
  ): void {
    const logData = {
      event,
      severity,
      details,
      userId,
      timestamp: new Date(),
    };

    switch (severity) {
      case 'critical':
      case 'high':
        this.logger.error(
          `Security event [${severity.toUpperCase()}]: ${event}`,
          logData,
        );
        break;
      case 'medium':
        this.logger.warn(
          `Security event [${severity.toUpperCase()}]: ${event}`,
          logData,
        );
        break;
      default:
        this.logger.log(
          `Security event [${severity.toUpperCase()}]: ${event}`,
          logData,
        );
    }
  }

  /**
   * Get AI performance metrics for a specific period
   */
  async getPerformanceMetrics(
    period: 'hour' | 'day' | 'week' | 'month',
    startDate?: Date,
    endDate?: Date,
  ): Promise<AIPerformanceMetrics> {
    try {
      const { start, end } = this.calculatePeriodDates(
        period,
        startDate,
        endDate,
      );

      const queryBuilder = this.aiApiUsageRepository
        .createQueryBuilder('usage')
        .where('usage.createdAt >= :start', { start })
        .andWhere('usage.createdAt <= :end', { end });

      const usageData = await queryBuilder.getMany();

      const totalRequests = usageData.length;
      const successfulRequests = usageData.filter((u) => u.success).length;
      const failedRequests = totalRequests - successfulRequests;
      const averageResponseTime =
        totalRequests > 0
          ? usageData.reduce((sum, u) => sum + u.responseTimeMs, 0) /
            totalRequests
          : 0;
      const totalTokensUsed = usageData.reduce(
        (sum, u) => sum + u.tokensUsed,
        0,
      );

      // Calculate error frequency
      const errorCounts = new Map<string, number>();
      usageData
        .filter((u) => !u.success && u.errorMessage)
        .forEach((u) => {
          const error = u.errorMessage!;
          errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
        });

      const topErrors = Array.from(errorCounts.entries())
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate performance by hour
      const performanceByHour = this.calculateHourlyPerformance(
        usageData,
        start,
        end,
      );

      return {
        period,
        startDate: start,
        endDate: end,
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        totalTokensUsed,
        cacheHitRate: 0, // Would need to be calculated from cache service
        fallbackRate: 0, // Would need to be calculated from recommendation logs
        topErrors,
        performanceByHour,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get performance metrics: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get operation logs for debugging
   */
  getOperationLogs(limit: number = 100): AIOperationLog[] {
    const logs = Array.from(this.operationLogs.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);

    return logs;
  }

  /**
   * Search logs by criteria
   */
  async searchLogs(criteria: {
    operation?: string;
    userId?: string;
    success?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]> {
    try {
      let queryBuilder = this.aiApiUsageRepository
        .createQueryBuilder('usage')
        .orderBy('usage.createdAt', 'DESC');

      if (criteria.success !== undefined) {
        queryBuilder = queryBuilder.andWhere('usage.success = :success', {
          success: criteria.success,
        });
      }

      if (criteria.userId) {
        queryBuilder = queryBuilder.andWhere('usage.userId = :userId', {
          userId: criteria.userId,
        });
      }

      if (criteria.startDate) {
        queryBuilder = queryBuilder.andWhere('usage.createdAt >= :startDate', {
          startDate: criteria.startDate,
        });
      }

      if (criteria.endDate) {
        queryBuilder = queryBuilder.andWhere('usage.createdAt <= :endDate', {
          endDate: criteria.endDate,
        });
      }

      if (criteria.limit) {
        queryBuilder = queryBuilder.limit(criteria.limit);
      }

      return await queryBuilder.getMany();
    } catch (error) {
      this.logger.error(`Failed to search logs: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Export logs for external analysis
   */
  async exportLogs(
    format: 'json' | 'csv',
    criteria?: {
      startDate?: Date;
      endDate?: Date;
      includeMetadata?: boolean;
    },
  ): Promise<string> {
    try {
      const logs = await this.searchLogs({
        startDate: criteria?.startDate,
        endDate: criteria?.endDate,
        limit: 10000, // Max export limit
      });

      if (format === 'json') {
        return JSON.stringify(logs, null, 2);
      } else {
        return this.convertToCSV(logs);
      }
    } catch (error) {
      this.logger.error(`Failed to export logs: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old operation logs from memory
   */
  private cleanupOldLogs(): void {
    if (this.operationLogs.size > this.maxLogRetention) {
      const sortedEntries = Array.from(this.operationLogs.entries()).sort(
        ([, a], [, b]) => a.startTime.getTime() - b.startTime.getTime(),
      );

      const toDelete = sortedEntries.slice(
        0,
        sortedEntries.length - this.maxLogRetention,
      );
      toDelete.forEach(([key]) => this.operationLogs.delete(key));
    }
  }

  /**
   * Check if log should be persisted to database
   */
  private shouldPersistLog(): boolean {
    const logLevel = this.configService.get('LOG_LEVEL', 'info');
    return ['debug', 'verbose'].includes(logLevel.toLowerCase());
  }

  /**
   * Persist recommendation log to database
   */
  private async persistRecommendationLog(
    log: RecommendationGenerationLog,
  ): Promise<void> {
    // This would typically go to a separate logging table
    // For now, we'll use the existing AI API usage table
    const logEntry = this.aiApiUsageRepository.create({
      endpoint: 'recommendation-generation',
      model: log.generationMethod,
      tokensUsed: log.tokensUsed,
      responseTimeMs: log.duration,
      success: log.success,
      errorMessage: log.errorMessage,
      userId: log.studentId,
    });

    await this.aiApiUsageRepository.save(logEntry);
  }

  /**
   * Calculate period dates
   */
  private calculatePeriodDates(
    period: 'hour' | 'day' | 'week' | 'month',
    startDate?: Date,
    endDate?: Date,
  ): { start: Date; end: Date } {
    const end = endDate || new Date();
    let start: Date;

    switch (period) {
      case 'hour':
        start = new Date(end.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    }

    return { start: startDate || start, end };
  }

  /**
   * Calculate hourly performance metrics
   */
  private calculateHourlyPerformance(
    usageData: AIApiUsage[],
    startDate: Date,
    endDate: Date,
  ): Array<{ hour: number; requests: number; avgResponseTime: number }> {
    const hourlyData = new Map<
      number,
      { requests: number; totalResponseTime: number }
    >();

    // Initialize all hours in the period
    const hours = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000),
    );
    for (let i = 0; i < hours; i++) {
      hourlyData.set(i, { requests: 0, totalResponseTime: 0 });
    }

    // Aggregate data by hour
    usageData.forEach((usage) => {
      const hoursSinceStart = Math.floor(
        (usage.createdAt.getTime() - startDate.getTime()) / (60 * 60 * 1000),
      );

      if (hoursSinceStart >= 0 && hoursSinceStart < hours) {
        const data = hourlyData.get(hoursSinceStart) || {
          requests: 0,
          totalResponseTime: 0,
        };
        data.requests++;
        data.totalResponseTime += usage.responseTimeMs;
        hourlyData.set(hoursSinceStart, data);
      }
    });

    // Convert to result format
    return Array.from(hourlyData.entries()).map(([hour, data]) => ({
      hour,
      requests: data.requests,
      avgResponseTime:
        data.requests > 0 ? data.totalResponseTime / data.requests : 0,
    }));
  }

  /**
   * Convert logs to CSV format
   */
  private convertToCSV(logs: any[]): string {
    if (logs.length === 0) return '';

    const headers = Object.keys(logs[0]);
    const csvRows = [headers.join(',')];

    logs.forEach((log) => {
      const values = headers.map((header) => {
        const value = log[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }
}
