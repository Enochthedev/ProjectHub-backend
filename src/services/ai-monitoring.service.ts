import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import { AIApiUsage } from '../entities/ai-api-usage.entity';
import {
  CircuitBreakerService,
  CircuitBreakerState,
} from './circuit-breaker.service';

export interface AIServiceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalTokensUsed: number;
  rateLimitHits: number;
  circuitBreakerTrips: number;
  lastRequestTime?: Date;
  successRate: number;
  requestsPerMinute: number;
}

export interface AIServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  circuitBreakerState: CircuitBreakerState;
  rateLimitStatus: 'ok' | 'approaching' | 'exceeded';
  responseTimeStatus: 'fast' | 'slow' | 'timeout';
  errorRateStatus: 'low' | 'medium' | 'high';
  lastHealthCheck: Date;
  issues: string[];
  recommendations: string[];
}

export interface AlertThresholds {
  errorRateThreshold: number; // percentage
  responseTimeThreshold: number; // milliseconds
  rateLimitWarningThreshold: number; // percentage of limit
  tokenUsageWarningThreshold: number; // percentage of monthly limit
}

export interface AIAlert {
  id: string;
  type:
    | 'error_rate'
    | 'response_time'
    | 'rate_limit'
    | 'circuit_breaker'
    | 'token_usage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: any;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

@Injectable()
export class AIMonitoringService {
  private readonly logger = new Logger(AIMonitoringService.name);

  private metrics: AIServiceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    totalTokensUsed: 0,
    rateLimitHits: 0,
    circuitBreakerTrips: 0,
    successRate: 100,
    requestsPerMinute: 0,
  };

  private responseTimes: number[] = [];
  private requestTimestamps: Date[] = [];
  private activeAlerts = new Map<string, AIAlert>();
  private alertCounter = 0;

  private readonly thresholds: AlertThresholds = {
    errorRateThreshold: 10, // 10%
    responseTimeThreshold: 5000, // 5 seconds
    rateLimitWarningThreshold: 80, // 80% of rate limit
    tokenUsageWarningThreshold: 90, // 90% of monthly limit
  };

  private readonly maxHistorySize = 1000;
  private readonly monthlyTokenLimit = 30000;

  constructor(
    @InjectRepository(AIApiUsage)
    private readonly aiApiUsageRepository: Repository<AIApiUsage>,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  /**
   * Record an AI API request
   */
  recordAPIRequest(
    endpoint: string,
    model: string,
    tokensUsed: number,
    responseTimeMs: number,
    success: boolean,
    errorMessage?: string,
    userId?: string,
  ): void {
    // Update metrics
    this.metrics.totalRequests++;
    this.metrics.totalTokensUsed += tokensUsed;
    this.metrics.lastRequestTime = new Date();

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update response times
    this.responseTimes.push(responseTimeMs);
    if (this.responseTimes.length > this.maxHistorySize) {
      this.responseTimes.shift();
    }

    // Update request timestamps for rate calculation
    this.requestTimestamps.push(new Date());
    if (this.requestTimestamps.length > this.maxHistorySize) {
      this.requestTimestamps.shift();
    }

    // Calculate derived metrics
    this.updateDerivedMetrics();

    // Check for alerts
    this.checkAlertConditions();

    // Log to database (async, don't wait)
    this.logToDatabase(
      endpoint,
      model,
      tokensUsed,
      responseTimeMs,
      success,
      errorMessage,
      userId,
    ).catch((error) =>
      this.logger.error(`Failed to log API usage: ${error.message}`),
    );
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit(): void {
    this.metrics.rateLimitHits++;
    this.checkRateLimitAlert();
  }

  /**
   * Record circuit breaker trip
   */
  recordCircuitBreakerTrip(serviceName: string): void {
    this.metrics.circuitBreakerTrips++;
    this.createAlert(
      'circuit_breaker',
      'high',
      `Circuit breaker opened for ${serviceName}`,
      {
        serviceName,
        timestamp: new Date(),
      },
    );
  }

  /**
   * Get current AI service metrics
   */
  getMetrics(): AIServiceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get AI service health status
   */
  getHealthStatus(): AIServiceHealth {
    const circuitBreakerStatus =
      this.circuitBreakerService.getStatus('hugging-face-api');
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check error rate
    const errorRateStatus = this.getErrorRateStatus();
    if (errorRateStatus !== 'low') {
      issues.push(`High error rate: ${this.metrics.successRate.toFixed(1)}%`);
      recommendations.push(
        'Check AI service connectivity and API key validity',
      );
    }

    // Check response time
    const responseTimeStatus = this.getResponseTimeStatus();
    if (responseTimeStatus !== 'fast') {
      issues.push(
        `Slow response times: ${this.metrics.averageResponseTime.toFixed(0)}ms`,
      );
      recommendations.push('Consider implementing request batching or caching');
    }

    // Check rate limit
    const rateLimitStatus = this.getRateLimitStatus();
    if (rateLimitStatus !== 'ok') {
      issues.push('Rate limit issues detected');
      recommendations.push('Implement request queuing or upgrade API plan');
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (
      circuitBreakerStatus.state === CircuitBreakerState.OPEN ||
      errorRateStatus === 'high'
    ) {
      status = 'unhealthy';
    } else if (issues.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      circuitBreakerState: circuitBreakerStatus.state,
      rateLimitStatus,
      responseTimeStatus,
      errorRateStatus,
      lastHealthCheck: new Date(),
      issues,
      recommendations,
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AIAlert[] {
    return Array.from(this.activeAlerts.values()).filter(
      (alert) => !alert.resolved,
    );
  }

  /**
   * Get all alerts (including resolved)
   */
  getAllAlerts(): AIAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.logger.log(`Alert resolved: ${alert.message}`);
      return true;
    }
    return false;
  }

  /**
   * Get diagnostic information for troubleshooting
   */
  getDiagnosticInfo(): any {
    const recentRequests = this.requestTimestamps.slice(-10);
    const recentResponseTimes = this.responseTimes.slice(-10);
    const circuitBreakerStatuses = this.circuitBreakerService.getAllStatuses();

    return {
      metrics: this.getMetrics(),
      health: this.getHealthStatus(),
      recentActivity: {
        requests: recentRequests,
        responseTimes: recentResponseTimes,
        averageRecentResponseTime:
          recentResponseTimes.length > 0
            ? recentResponseTimes.reduce((a, b) => a + b, 0) /
              recentResponseTimes.length
            : 0,
      },
      circuitBreakers: circuitBreakerStatuses,
      alerts: {
        active: this.getActiveAlerts().length,
        total: this.activeAlerts.size,
      },
      thresholds: this.thresholds,
      timestamp: new Date(),
    };
  }

  /**
   * Reset metrics (for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalTokensUsed: 0,
      rateLimitHits: 0,
      circuitBreakerTrips: 0,
      successRate: 100,
      requestsPerMinute: 0,
    };

    this.responseTimes = [];
    this.requestTimestamps = [];
    this.logger.log('AI monitoring metrics reset');
  }

  /**
   * Periodic health check (runs every 5 minutes)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async performHealthCheck(): Promise<void> {
    try {
      const health = this.getHealthStatus();

      if (health.status === 'unhealthy') {
        this.logger.error('AI service health check failed', {
          status: health.status,
          issues: health.issues,
        });
      } else if (health.status === 'degraded') {
        this.logger.warn('AI service health degraded', {
          status: health.status,
          issues: health.issues,
        });
      } else {
        this.logger.debug('AI service health check passed');
      }

      // Auto-resolve alerts if conditions have improved
      this.autoResolveAlerts();
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
    }
  }

  /**
   * Periodic metrics cleanup (runs daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldMetrics(): Promise<void> {
    try {
      // Clean up old API usage records (keep last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await this.aiApiUsageRepository
        .createQueryBuilder()
        .delete()
        .where('createdAt < :date', { date: thirtyDaysAgo })
        .execute();

      this.logger.log(`Cleaned up ${result.affected} old API usage records`);

      // Clean up resolved alerts older than 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const [id, alert] of this.activeAlerts) {
        if (
          alert.resolved &&
          alert.resolvedAt &&
          alert.resolvedAt < sevenDaysAgo
        ) {
          this.activeAlerts.delete(id);
        }
      }
    } catch (error) {
      this.logger.error(`Metrics cleanup failed: ${error.message}`);
    }
  }

  /**
   * Update derived metrics
   */
  private updateDerivedMetrics(): void {
    // Calculate success rate
    if (this.metrics.totalRequests > 0) {
      this.metrics.successRate =
        (this.metrics.successfulRequests / this.metrics.totalRequests) * 100;
    }

    // Calculate average response time
    if (this.responseTimes.length > 0) {
      this.metrics.averageResponseTime =
        this.responseTimes.reduce((sum, time) => sum + time, 0) /
        this.responseTimes.length;
    }

    // Calculate requests per minute (last 60 seconds)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentRequests = this.requestTimestamps.filter(
      (timestamp) => timestamp > oneMinuteAgo,
    );
    this.metrics.requestsPerMinute = recentRequests.length;
  }

  /**
   * Check for alert conditions
   */
  private checkAlertConditions(): void {
    this.checkErrorRateAlert();
    this.checkResponseTimeAlert();
    this.checkTokenUsageAlert();
  }

  /**
   * Check error rate alert
   */
  private checkErrorRateAlert(): void {
    if (
      this.metrics.totalRequests >= 10 &&
      this.metrics.successRate < 100 - this.thresholds.errorRateThreshold
    ) {
      this.createAlert(
        'error_rate',
        'high',
        `High error rate detected: ${(100 - this.metrics.successRate).toFixed(1)}%`,
        {
          errorRate: 100 - this.metrics.successRate,
          threshold: this.thresholds.errorRateThreshold,
          totalRequests: this.metrics.totalRequests,
          failedRequests: this.metrics.failedRequests,
        },
      );
    }
  }

  /**
   * Check response time alert
   */
  private checkResponseTimeAlert(): void {
    if (
      this.metrics.averageResponseTime > this.thresholds.responseTimeThreshold
    ) {
      this.createAlert(
        'response_time',
        'medium',
        `Slow response times detected: ${this.metrics.averageResponseTime.toFixed(0)}ms`,
        {
          averageResponseTime: this.metrics.averageResponseTime,
          threshold: this.thresholds.responseTimeThreshold,
        },
      );
    }
  }

  /**
   * Check rate limit alert
   */
  private checkRateLimitAlert(): void {
    const rateLimitPercentage =
      (this.metrics.rateLimitHits / Math.max(1, this.metrics.totalRequests)) *
      100;

    if (rateLimitPercentage > this.thresholds.rateLimitWarningThreshold) {
      this.createAlert(
        'rate_limit',
        'high',
        `Rate limit threshold exceeded: ${rateLimitPercentage.toFixed(1)}% of requests hit rate limit`,
        {
          rateLimitHits: this.metrics.rateLimitHits,
          totalRequests: this.metrics.totalRequests,
          percentage: rateLimitPercentage,
        },
      );
    }
  }

  /**
   * Check token usage alert
   */
  private checkTokenUsageAlert(): void {
    const usagePercentage =
      (this.metrics.totalTokensUsed / this.monthlyTokenLimit) * 100;

    if (usagePercentage > this.thresholds.tokenUsageWarningThreshold) {
      this.createAlert(
        'token_usage',
        'medium',
        `High token usage: ${usagePercentage.toFixed(1)}% of monthly limit`,
        {
          tokensUsed: this.metrics.totalTokensUsed,
          monthlyLimit: this.monthlyTokenLimit,
          percentage: usagePercentage,
        },
      );
    }
  }

  /**
   * Create an alert
   */
  private createAlert(
    type: AIAlert['type'],
    severity: AIAlert['severity'],
    message: string,
    details: any,
  ): void {
    const alertId = `${type}_${++this.alertCounter}_${Date.now()}`;

    // Check if similar alert already exists
    const existingAlert = Array.from(this.activeAlerts.values()).find(
      (alert) => alert.type === type && !alert.resolved,
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.details = { ...existingAlert.details, ...details };
      existingAlert.timestamp = new Date();
      return;
    }

    const alert: AIAlert = {
      id: alertId,
      type,
      severity,
      message,
      details,
      timestamp: new Date(),
      resolved: false,
    };

    this.activeAlerts.set(alertId, alert);

    this.logger.warn(
      `AI Alert [${severity.toUpperCase()}]: ${message}`,
      details,
    );
  }

  /**
   * Auto-resolve alerts when conditions improve
   */
  private autoResolveAlerts(): void {
    for (const alert of this.activeAlerts.values()) {
      if (alert.resolved) continue;

      let shouldResolve = false;

      switch (alert.type) {
        case 'error_rate':
          shouldResolve =
            this.metrics.successRate >=
            100 - this.thresholds.errorRateThreshold;
          break;
        case 'response_time':
          shouldResolve =
            this.metrics.averageResponseTime <=
            this.thresholds.responseTimeThreshold;
          break;
        case 'rate_limit':
          const rateLimitPercentage =
            (this.metrics.rateLimitHits /
              Math.max(1, this.metrics.totalRequests)) *
            100;
          shouldResolve =
            rateLimitPercentage <= this.thresholds.rateLimitWarningThreshold;
          break;
        case 'token_usage':
          const usagePercentage =
            (this.metrics.totalTokensUsed / this.monthlyTokenLimit) * 100;
          shouldResolve =
            usagePercentage <= this.thresholds.tokenUsageWarningThreshold;
          break;
        case 'circuit_breaker':
          const cbStatus =
            this.circuitBreakerService.getStatus('hugging-face-api');
          shouldResolve = cbStatus.state === CircuitBreakerState.CLOSED;
          break;
      }

      if (shouldResolve) {
        this.resolveAlert(alert.id);
      }
    }
  }

  /**
   * Get error rate status
   */
  private getErrorRateStatus(): 'low' | 'medium' | 'high' {
    const errorRate = 100 - this.metrics.successRate;
    if (errorRate > this.thresholds.errorRateThreshold) return 'high';
    if (errorRate > this.thresholds.errorRateThreshold / 2) return 'medium';
    return 'low';
  }

  /**
   * Get response time status
   */
  private getResponseTimeStatus(): 'fast' | 'slow' | 'timeout' {
    if (
      this.metrics.averageResponseTime > this.thresholds.responseTimeThreshold
    )
      return 'timeout';
    if (
      this.metrics.averageResponseTime >
      this.thresholds.responseTimeThreshold / 2
    )
      return 'slow';
    return 'fast';
  }

  /**
   * Get rate limit status
   */
  private getRateLimitStatus(): 'ok' | 'approaching' | 'exceeded' {
    const rateLimitPercentage =
      (this.metrics.rateLimitHits / Math.max(1, this.metrics.totalRequests)) *
      100;
    if (rateLimitPercentage > this.thresholds.rateLimitWarningThreshold)
      return 'exceeded';
    if (rateLimitPercentage > this.thresholds.rateLimitWarningThreshold / 2)
      return 'approaching';
    return 'ok';
  }

  /**
   * Log API usage to database
   */
  private async logToDatabase(
    endpoint: string,
    model: string,
    tokensUsed: number,
    responseTimeMs: number,
    success: boolean,
    errorMessage?: string,
    userId?: string,
  ): Promise<void> {
    try {
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
      this.logger.error(`Failed to save API usage: ${error.message}`);
    }
  }
}
