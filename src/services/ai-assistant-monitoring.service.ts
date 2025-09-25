import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AIAssistantErrorRecoveryService,
  ServiceHealthStatus,
} from './ai-assistant-error-recovery.service';

export interface HealthCheckResult {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  responseTime: number;
  timestamp: Date;
  details: {
    consecutiveFailures: number;
    errorRate: number;
    averageResponseTime: number;
    circuitBreakerOpen: boolean;
    lastError?: string;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: Date;
}

export interface AlertCondition {
  type:
    | 'error_rate'
    | 'response_time'
    | 'consecutive_failures'
    | 'circuit_breaker'
    | 'service_unavailable';
  threshold: number;
  duration?: number; // minutes
  comparison: 'greater_than' | 'less_than' | 'equals';
}

export interface Alert {
  id: string;
  ruleId: string;
  serviceName: string;
  severity: AlertRule['severity'];
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

export interface MonitoringMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
  lastUpdated: Date;
}

export interface DiagnosticInfo {
  serviceName: string;
  status: HealthCheckResult['status'];
  uptime: number;
  metrics: MonitoringMetrics;
  recentErrors: Array<{
    timestamp: Date;
    error: string;
    count: number;
  }>;
  performanceHistory: Array<{
    timestamp: Date;
    responseTime: number;
    success: boolean;
  }>;
  recommendations: string[];
}

@Injectable()
export class AIAssistantMonitoringService {
  private readonly logger = new Logger(AIAssistantMonitoringService.name);

  private readonly alertRules = new Map<string, AlertRule>();
  private readonly activeAlerts = new Map<string, Alert>();
  private readonly metrics = new Map<string, MonitoringMetrics>();
  private readonly performanceHistory = new Map<
    string,
    Array<{
      timestamp: Date;
      responseTime: number;
      success: boolean;
    }>
  >();
  private readonly errorHistory = new Map<
    string,
    Array<{
      timestamp: Date;
      error: string;
    }>
  >();

  private readonly config: {
    healthCheckInterval: number;
    metricsRetentionDays: number;
    alertCooldownMinutes: number;
    performanceHistoryLimit: number;
    errorHistoryLimit: number;
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly errorRecoveryService: AIAssistantErrorRecoveryService,
  ) {
    this.config = {
      healthCheckInterval:
        this.configService.get<number>('monitoring.healthCheckInterval') ||
        60000, // 1 minute
      metricsRetentionDays:
        this.configService.get<number>('monitoring.metricsRetentionDays') || 7,
      alertCooldownMinutes:
        this.configService.get<number>('monitoring.alertCooldownMinutes') || 15,
      performanceHistoryLimit:
        this.configService.get<number>('monitoring.performanceHistoryLimit') ||
        1000,
      errorHistoryLimit:
        this.configService.get<number>('monitoring.errorHistoryLimit') || 500,
    };

    this.initializeDefaultAlertRules();
    this.logger.log('AI Assistant Monitoring service initialized');
  }

  /**
   * Perform health check for a specific service
   */
  async performHealthCheck(serviceName: string): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const health = this.errorRecoveryService.getServiceHealth(serviceName);
      const responseTime = Date.now() - startTime;

      const result: HealthCheckResult = {
        serviceName,
        status: this.determineHealthStatus(health),
        responseTime,
        timestamp: new Date(),
        details: {
          consecutiveFailures: health.consecutiveFailures,
          errorRate: this.calculateErrorRate(serviceName),
          averageResponseTime: health.averageResponseTime,
          circuitBreakerOpen: health.circuitBreakerOpen,
          lastError: health.lastError?.message,
        },
      };

      // Update metrics
      this.updateMetrics(serviceName, true, responseTime);

      // Record performance history
      this.recordPerformance(serviceName, responseTime, true);

      // Check alert conditions
      await this.checkAlertConditions(serviceName, result);

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error(
        `Health check failed for ${serviceName}: ${error.message}`,
      );

      // Update metrics for failure
      this.updateMetrics(serviceName, false, responseTime);

      // Record performance history
      this.recordPerformance(serviceName, responseTime, false);

      // Record error
      this.recordError(serviceName, error.message);

      const result: HealthCheckResult = {
        serviceName,
        status: 'critical',
        responseTime,
        timestamp: new Date(),
        details: {
          consecutiveFailures: 1,
          errorRate: 1,
          averageResponseTime: responseTime,
          circuitBreakerOpen: false,
          lastError: error.message,
        },
      };

      // Check alert conditions
      await this.checkAlertConditions(serviceName, result);

      return result;
    }
  }

  /**
   * Perform health checks for all monitored services
   */
  async performAllHealthChecks(): Promise<HealthCheckResult[]> {
    const services = this.errorRecoveryService.getAllServiceHealth();
    const results: HealthCheckResult[] = [];

    for (const service of services) {
      try {
        const result = await this.performHealthCheck(service.serviceName);
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Failed to check health for ${service.serviceName}: ${error.message}`,
        );
      }
    }

    return results;
  }

  /**
   * Get current metrics for a service
   */
  getServiceMetrics(serviceName: string): MonitoringMetrics {
    return (
      this.metrics.get(serviceName) || {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        uptime: 100,
        lastUpdated: new Date(),
      }
    );
  }

  /**
   * Get diagnostic information for a service
   */
  async getDiagnosticInfo(serviceName: string): Promise<DiagnosticInfo> {
    const healthCheck = await this.performHealthCheck(serviceName);
    const metrics = this.getServiceMetrics(serviceName);
    const recentErrors = this.getRecentErrors(serviceName);
    const performanceHistory = this.getPerformanceHistory(serviceName);
    const recommendations =
      this.errorRecoveryService.getRecoveryRecommendations(serviceName);

    return {
      serviceName,
      status: healthCheck.status,
      uptime: metrics.uptime,
      metrics,
      recentErrors,
      performanceHistory: performanceHistory.slice(-50), // Last 50 entries
      recommendations,
    };
  }

  /**
   * Create a new alert rule
   */
  createAlertRule(rule: Omit<AlertRule, 'id'>): AlertRule {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alertRule: AlertRule = { ...rule, id };

    this.alertRules.set(id, alertRule);
    this.logger.log(`Created alert rule: ${alertRule.name} (${id})`);

    return alertRule;
  }

  /**
   * Update an existing alert rule
   */
  updateAlertRule(id: string, updates: Partial<AlertRule>): AlertRule | null {
    const rule = this.alertRules.get(id);
    if (!rule) {
      return null;
    }

    const updatedRule = { ...rule, ...updates };
    this.alertRules.set(id, updatedRule);
    this.logger.log(`Updated alert rule: ${updatedRule.name} (${id})`);

    return updatedRule;
  }

  /**
   * Delete an alert rule
   */
  deleteAlertRule(id: string): boolean {
    const deleted = this.alertRules.delete(id);
    if (deleted) {
      this.logger.log(`Deleted alert rule: ${id}`);
    }
    return deleted;
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(
      (alert) => !alert.resolved,
    );
  }

  /**
   * Get all alerts (including resolved)
   */
  getAllAlerts(): Alert[] {
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
      this.logger.log(`Resolved alert: ${alert.message} (${alertId})`);
      return true;
    }
    return false;
  }

  /**
   * Scheduled health check for all services
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduledHealthCheck(): Promise<void> {
    try {
      this.logger.debug('Performing scheduled health checks');
      await this.performAllHealthChecks();
    } catch (error) {
      this.logger.error(`Scheduled health check failed: ${error.message}`);
    }
  }

  /**
   * Scheduled cleanup of old data
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduledCleanup(): Promise<void> {
    try {
      this.logger.debug('Performing scheduled cleanup');
      this.cleanupOldData();
    } catch (error) {
      this.logger.error(`Scheduled cleanup failed: ${error.message}`);
    }
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    const defaultRules: Omit<AlertRule, 'id'>[] = [
      {
        name: 'High Error Rate',
        condition: {
          type: 'error_rate',
          threshold: 0.1, // 10%
          comparison: 'greater_than',
        },
        severity: 'high',
        enabled: true,
        cooldownMinutes: 15,
      },
      {
        name: 'Slow Response Time',
        condition: {
          type: 'response_time',
          threshold: 10000, // 10 seconds
          comparison: 'greater_than',
        },
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 10,
      },
      {
        name: 'Multiple Consecutive Failures',
        condition: {
          type: 'consecutive_failures',
          threshold: 5,
          comparison: 'greater_than',
        },
        severity: 'high',
        enabled: true,
        cooldownMinutes: 20,
      },
      {
        name: 'Circuit Breaker Open',
        condition: {
          type: 'circuit_breaker',
          threshold: 1,
          comparison: 'equals',
        },
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 30,
      },
      {
        name: 'Service Unavailable',
        condition: {
          type: 'service_unavailable',
          threshold: 1,
          comparison: 'equals',
        },
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 5,
      },
    ];

    defaultRules.forEach((rule) => this.createAlertRule(rule));
    this.logger.log(`Initialized ${defaultRules.length} default alert rules`);
  }

  /**
   * Determine health status based on service health
   */
  private determineHealthStatus(
    health: ServiceHealthStatus,
  ): HealthCheckResult['status'] {
    if (health.circuitBreakerOpen) {
      return 'critical';
    }

    if (health.consecutiveFailures >= 5) {
      return 'critical';
    }

    if (health.consecutiveFailures >= 3) {
      return 'unhealthy';
    }

    if (health.consecutiveFailures >= 1 || health.averageResponseTime > 5000) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Calculate error rate for a service
   */
  private calculateErrorRate(serviceName: string): number {
    const metrics = this.metrics.get(serviceName);
    if (!metrics || metrics.totalRequests === 0) {
      return 0;
    }

    return metrics.failedRequests / metrics.totalRequests;
  }

  /**
   * Update metrics for a service
   */
  private updateMetrics(
    serviceName: string,
    success: boolean,
    responseTime: number,
  ): void {
    const metrics = this.metrics.get(serviceName) || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      uptime: 100,
      lastUpdated: new Date(),
    };

    metrics.totalRequests += 1;

    if (success) {
      metrics.successfulRequests += 1;
    } else {
      metrics.failedRequests += 1;
    }

    // Update average response time
    metrics.averageResponseTime =
      (metrics.averageResponseTime + responseTime) / 2;

    // Update error rate
    metrics.errorRate = metrics.failedRequests / metrics.totalRequests;

    // Update uptime (simplified calculation)
    metrics.uptime = (metrics.successfulRequests / metrics.totalRequests) * 100;

    metrics.lastUpdated = new Date();

    this.metrics.set(serviceName, metrics);
  }

  /**
   * Record performance history
   */
  private recordPerformance(
    serviceName: string,
    responseTime: number,
    success: boolean,
  ): void {
    const history = this.performanceHistory.get(serviceName) || [];

    history.push({
      timestamp: new Date(),
      responseTime,
      success,
    });

    // Keep only recent entries
    if (history.length > this.config.performanceHistoryLimit) {
      history.splice(0, history.length - this.config.performanceHistoryLimit);
    }

    this.performanceHistory.set(serviceName, history);
  }

  /**
   * Record error
   */
  private recordError(serviceName: string, error: string): void {
    const errors = this.errorHistory.get(serviceName) || [];

    errors.push({
      timestamp: new Date(),
      error,
    });

    // Keep only recent entries
    if (errors.length > this.config.errorHistoryLimit) {
      errors.splice(0, errors.length - this.config.errorHistoryLimit);
    }

    this.errorHistory.set(serviceName, errors);
  }

  /**
   * Get recent errors with counts
   */
  private getRecentErrors(
    serviceName: string,
  ): Array<{ timestamp: Date; error: string; count: number }> {
    const errors = this.errorHistory.get(serviceName) || [];
    const recentErrors = errors.filter(
      (e) => Date.now() - e.timestamp.getTime() < 24 * 60 * 60 * 1000, // Last 24 hours
    );

    // Group by error message and count occurrences
    const errorCounts = new Map<string, { timestamp: Date; count: number }>();

    recentErrors.forEach((error) => {
      const existing = errorCounts.get(error.error);
      if (existing) {
        existing.count += 1;
        if (error.timestamp > existing.timestamp) {
          existing.timestamp = error.timestamp;
        }
      } else {
        errorCounts.set(error.error, { timestamp: error.timestamp, count: 1 });
      }
    });

    return Array.from(errorCounts.entries()).map(([error, data]) => ({
      timestamp: data.timestamp,
      error,
      count: data.count,
    }));
  }

  /**
   * Get performance history
   */
  private getPerformanceHistory(serviceName: string): Array<{
    timestamp: Date;
    responseTime: number;
    success: boolean;
  }> {
    return this.performanceHistory.get(serviceName) || [];
  }

  /**
   * Check alert conditions and trigger alerts if necessary
   */
  private async checkAlertConditions(
    serviceName: string,
    healthCheck: HealthCheckResult,
  ): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (Date.now() - rule.lastTriggered.getTime() < cooldownMs) {
          continue;
        }
      }

      const shouldTrigger = this.evaluateAlertCondition(
        rule.condition,
        serviceName,
        healthCheck,
      );

      if (shouldTrigger) {
        await this.triggerAlert(rule, serviceName, healthCheck);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateAlertCondition(
    condition: AlertCondition,
    serviceName: string,
    healthCheck: HealthCheckResult,
  ): boolean {
    let value: number;

    switch (condition.type) {
      case 'error_rate':
        value = healthCheck.details.errorRate;
        break;
      case 'response_time':
        value = healthCheck.details.averageResponseTime;
        break;
      case 'consecutive_failures':
        value = healthCheck.details.consecutiveFailures;
        break;
      case 'circuit_breaker':
        value = healthCheck.details.circuitBreakerOpen ? 1 : 0;
        break;
      case 'service_unavailable':
        value = healthCheck.status === 'critical' ? 1 : 0;
        break;
      default:
        return false;
    }

    switch (condition.comparison) {
      case 'greater_than':
        return value > condition.threshold;
      case 'less_than':
        return value < condition.threshold;
      case 'equals':
        return value === condition.threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(
    rule: AlertRule,
    serviceName: string,
    healthCheck: HealthCheckResult,
  ): Promise<void> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      serviceName,
      severity: rule.severity,
      message: this.generateAlertMessage(rule, serviceName, healthCheck),
      timestamp: new Date(),
      resolved: false,
      metadata: {
        healthCheck,
        rule: rule.name,
      },
    };

    this.activeAlerts.set(alertId, alert);
    rule.lastTriggered = new Date();

    this.logger.warn(`ALERT TRIGGERED: ${alert.message}`);

    // Here you would integrate with external alerting systems
    // e.g., email, Slack, PagerDuty, etc.
    await this.sendAlert(alert);
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(
    rule: AlertRule,
    serviceName: string,
    healthCheck: HealthCheckResult,
  ): string {
    const condition = rule.condition;

    switch (condition.type) {
      case 'error_rate':
        return `High error rate detected for ${serviceName}: ${(healthCheck.details.errorRate * 100).toFixed(1)}% (threshold: ${(condition.threshold * 100).toFixed(1)}%)`;
      case 'response_time':
        return `Slow response time detected for ${serviceName}: ${healthCheck.details.averageResponseTime}ms (threshold: ${condition.threshold}ms)`;
      case 'consecutive_failures':
        return `Multiple consecutive failures for ${serviceName}: ${healthCheck.details.consecutiveFailures} failures (threshold: ${condition.threshold})`;
      case 'circuit_breaker':
        return `Circuit breaker is open for ${serviceName}`;
      case 'service_unavailable':
        return `Service ${serviceName} is unavailable (status: ${healthCheck.status})`;
      default:
        return `Alert triggered for ${serviceName}: ${rule.name}`;
    }
  }

  /**
   * Send alert (placeholder for external integrations)
   */
  private async sendAlert(alert: Alert): Promise<void> {
    // This is where you would integrate with external alerting systems
    // For now, just log the alert
    this.logger.warn(
      `ALERT: [${alert.severity.toUpperCase()}] ${alert.message}`,
    );

    // Example integrations:
    // - Send email notification
    // - Post to Slack channel
    // - Create PagerDuty incident
    // - Send SMS notification
    // - Update monitoring dashboard
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoffTime =
      Date.now() - this.config.metricsRetentionDays * 24 * 60 * 60 * 1000;

    // Clean up performance history
    for (const [serviceName, history] of this.performanceHistory.entries()) {
      const filteredHistory = history.filter(
        (entry) => entry.timestamp.getTime() > cutoffTime,
      );
      this.performanceHistory.set(serviceName, filteredHistory);
    }

    // Clean up error history
    for (const [serviceName, errors] of this.errorHistory.entries()) {
      const filteredErrors = errors.filter(
        (error) => error.timestamp.getTime() > cutoffTime,
      );
      this.errorHistory.set(serviceName, filteredErrors);
    }

    // Clean up resolved alerts older than retention period
    const alertsToDelete: string[] = [];
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (
        alert.resolved &&
        alert.resolvedAt &&
        alert.resolvedAt.getTime() < cutoffTime
      ) {
        alertsToDelete.push(alertId);
      }
    }

    alertsToDelete.forEach((alertId) => this.activeAlerts.delete(alertId));

    this.logger.log(
      `Cleaned up old monitoring data (retention: ${this.config.metricsRetentionDays} days)`,
    );
  }

  /**
   * Get monitoring configuration
   */
  getConfiguration() {
    return { ...this.config };
  }

  /**
   * Update monitoring configuration
   */
  updateConfiguration(updates: Partial<typeof this.config>): void {
    Object.assign(this.config, updates);
    this.logger.log('Monitoring configuration updated');
  }
}
