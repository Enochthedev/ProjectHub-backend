import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

import { AIMonitoringService, AIAlert } from './ai-monitoring.service';
import {
  CircuitBreakerService,
  CircuitBreakerState,
} from './circuit-breaker.service';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
  actions: AlertAction[];
}

export interface AlertCondition {
  type:
    | 'error_rate'
    | 'response_time'
    | 'rate_limit'
    | 'circuit_breaker'
    | 'token_usage'
    | 'custom';
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  timeWindow: number; // minutes
  minimumSamples?: number;
}

export interface AlertAction {
  type: 'log' | 'email' | 'webhook' | 'slack';
  config: any;
}

export interface AlertNotification {
  alertId: string;
  rule: AlertRule;
  currentValue: number;
  threshold: number;
  message: string;
  timestamp: Date;
  metadata?: any;
}

@Injectable()
export class AIAlertingService {
  private readonly logger = new Logger(AIAlertingService.name);
  private readonly alertRules = new Map<string, AlertRule>();
  private readonly lastAlertTimes = new Map<string, Date>();
  private readonly alertHistory: AlertNotification[] = [];
  private readonly maxHistorySize = 1000;

  constructor(
    private readonly aiMonitoringService: AIMonitoringService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly configService: ConfigService,
  ) {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        description: 'Alert when AI API error rate exceeds threshold',
        condition: {
          type: 'error_rate',
          threshold: 10, // 10%
          operator: 'gt',
          timeWindow: 15, // 15 minutes
          minimumSamples: 5,
        },
        severity: 'high',
        enabled: true,
        cooldownMinutes: 30,
        actions: [
          { type: 'log', config: { level: 'error' } },
          { type: 'email', config: { recipients: ['admin@example.com'] } },
        ],
      },
      {
        id: 'slow_response_time',
        name: 'Slow Response Time',
        description: 'Alert when AI API response time is consistently slow',
        condition: {
          type: 'response_time',
          threshold: 5000, // 5 seconds
          operator: 'gt',
          timeWindow: 10, // 10 minutes
          minimumSamples: 3,
        },
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 15,
        actions: [{ type: 'log', config: { level: 'warn' } }],
      },
      {
        id: 'rate_limit_exceeded',
        name: 'Rate Limit Exceeded',
        description: 'Alert when rate limit is frequently exceeded',
        condition: {
          type: 'rate_limit',
          threshold: 5, // 5 rate limit hits
          operator: 'gte',
          timeWindow: 60, // 1 hour
        },
        severity: 'high',
        enabled: true,
        cooldownMinutes: 60,
        actions: [
          { type: 'log', config: { level: 'error' } },
          { type: 'email', config: { recipients: ['admin@example.com'] } },
        ],
      },
      {
        id: 'circuit_breaker_open',
        name: 'Circuit Breaker Open',
        description: 'Alert when circuit breaker opens',
        condition: {
          type: 'circuit_breaker',
          threshold: 1,
          operator: 'gte',
          timeWindow: 1,
        },
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 5,
        actions: [
          { type: 'log', config: { level: 'error' } },
          { type: 'email', config: { recipients: ['admin@example.com'] } },
        ],
      },
      {
        id: 'high_token_usage',
        name: 'High Token Usage',
        description: 'Alert when monthly token usage approaches limit',
        condition: {
          type: 'token_usage',
          threshold: 90, // 90% of monthly limit
          operator: 'gt',
          timeWindow: 60, // 1 hour
        },
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 240, // 4 hours
        actions: [
          { type: 'log', config: { level: 'warn' } },
          { type: 'email', config: { recipients: ['admin@example.com'] } },
        ],
      },
    ];

    defaultRules.forEach((rule) => {
      this.alertRules.set(rule.id, rule);
    });

    this.logger.log(`Initialized ${defaultRules.length} default alert rules`);
  }

  /**
   * Add or update an alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.logger.log(`Added/updated alert rule: ${rule.name}`);
  }

  /**
   * Remove an alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId);
    if (removed) {
      this.logger.log(`Removed alert rule: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Get alert rule by ID
   */
  getAlertRule(ruleId: string): AlertRule | undefined {
    return this.alertRules.get(ruleId);
  }

  /**
   * Enable/disable an alert rule
   */
  setAlertRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.logger.log(
        `Alert rule ${ruleId} ${enabled ? 'enabled' : 'disabled'}`,
      );
      return true;
    }
    return false;
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): AlertNotification[] {
    return this.alertHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Check all alert rules (called periodically)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAlertRules(): Promise<void> {
    try {
      const enabledRules = Array.from(this.alertRules.values()).filter(
        (rule) => rule.enabled,
      );

      for (const rule of enabledRules) {
        await this.checkAlertRule(rule);
      }
    } catch (error) {
      this.logger.error(`Error checking alert rules: ${error.message}`, error);
    }
  }

  /**
   * Check a specific alert rule
   */
  private async checkAlertRule(rule: AlertRule): Promise<void> {
    try {
      // Check cooldown period
      const lastAlertTime = this.lastAlertTimes.get(rule.id);
      if (lastAlertTime) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (Date.now() - lastAlertTime.getTime() < cooldownMs) {
          return; // Still in cooldown
        }
      }

      const currentValue = await this.evaluateCondition(rule.condition);
      const shouldAlert = this.shouldTriggerAlert(rule.condition, currentValue);

      if (shouldAlert) {
        await this.triggerAlert(rule, currentValue);
      }
    } catch (error) {
      this.logger.error(
        `Error checking alert rule ${rule.id}: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Evaluate an alert condition
   */
  private async evaluateCondition(condition: AlertCondition): Promise<number> {
    const metrics = this.aiMonitoringService.getMetrics();
    const health = this.aiMonitoringService.getHealthStatus();

    switch (condition.type) {
      case 'error_rate':
        return 100 - metrics.successRate;

      case 'response_time':
        return metrics.averageResponseTime;

      case 'rate_limit':
        return metrics.rateLimitHits;

      case 'circuit_breaker':
        return health.circuitBreakerState === CircuitBreakerState.OPEN ? 1 : 0;

      case 'token_usage':
        // Calculate percentage of monthly limit (30,000 tokens)
        const monthlyLimit = 30000;
        return (metrics.totalTokensUsed / monthlyLimit) * 100;

      default:
        return 0;
    }
  }

  /**
   * Check if alert should be triggered
   */
  private shouldTriggerAlert(
    condition: AlertCondition,
    currentValue: number,
  ): boolean {
    switch (condition.operator) {
      case 'gt':
        return currentValue > condition.threshold;
      case 'lt':
        return currentValue < condition.threshold;
      case 'eq':
        return currentValue === condition.threshold;
      case 'gte':
        return currentValue >= condition.threshold;
      case 'lte':
        return currentValue <= condition.threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(
    rule: AlertRule,
    currentValue: number,
  ): Promise<void> {
    const notification: AlertNotification = {
      alertId: `${rule.id}_${Date.now()}`,
      rule,
      currentValue,
      threshold: rule.condition.threshold,
      message: this.generateAlertMessage(rule, currentValue),
      timestamp: new Date(),
      metadata: {
        metrics: this.aiMonitoringService.getMetrics(),
        health: this.aiMonitoringService.getHealthStatus(),
      },
    };

    // Add to history
    this.alertHistory.push(notification);
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.shift();
    }

    // Update last alert time
    this.lastAlertTimes.set(rule.id, new Date());

    // Execute alert actions
    for (const action of rule.actions) {
      await this.executeAlertAction(action, notification);
    }

    this.logger.warn(`Alert triggered: ${rule.name}`, {
      ruleId: rule.id,
      severity: rule.severity,
      currentValue,
      threshold: rule.condition.threshold,
      message: notification.message,
    });
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, currentValue: number): string {
    const condition = rule.condition;
    let unit = '';

    switch (condition.type) {
      case 'error_rate':
        unit = '%';
        break;
      case 'response_time':
        unit = 'ms';
        break;
      case 'rate_limit':
        unit = ' hits';
        break;
      case 'token_usage':
        unit = '%';
        break;
    }

    return `${rule.name}: ${condition.type} is ${currentValue}${unit}, which exceeds threshold of ${condition.threshold}${unit}`;
  }

  /**
   * Execute an alert action
   */
  private async executeAlertAction(
    action: AlertAction,
    notification: AlertNotification,
  ): Promise<void> {
    try {
      switch (action.type) {
        case 'log':
          this.executeLogAction(action, notification);
          break;

        case 'email':
          await this.executeEmailAction(action, notification);
          break;

        case 'webhook':
          await this.executeWebhookAction(action, notification);
          break;

        case 'slack':
          await this.executeSlackAction(action, notification);
          break;

        default:
          this.logger.warn(`Unknown alert action type: ${action.type}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to execute alert action ${action.type}: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Execute log action
   */
  private executeLogAction(
    action: AlertAction,
    notification: AlertNotification,
  ): void {
    const level = action.config.level || 'warn';
    const message = `ALERT: ${notification.message}`;
    const context = {
      alertId: notification.alertId,
      rule: notification.rule.name,
      severity: notification.rule.severity,
      currentValue: notification.currentValue,
      threshold: notification.threshold,
    };

    switch (level) {
      case 'error':
        this.logger.error(message, context);
        break;
      case 'warn':
        this.logger.warn(message, context);
        break;
      case 'log':
        this.logger.log(message, context);
        break;
      case 'debug':
        this.logger.debug(message, context);
        break;
      default:
        this.logger.warn(message, context);
    }
  }

  /**
   * Execute email action (placeholder - would integrate with email service)
   */
  private async executeEmailAction(
    action: AlertAction,
    notification: AlertNotification,
  ): Promise<void> {
    // This would integrate with the existing email service
    this.logger.log(
      `Email alert would be sent to: ${action.config.recipients?.join(', ')}`,
      {
        subject: `AI Service Alert: ${notification.rule.name}`,
        message: notification.message,
        severity: notification.rule.severity,
      },
    );
  }

  /**
   * Execute webhook action
   */
  private async executeWebhookAction(
    action: AlertAction,
    notification: AlertNotification,
  ): Promise<void> {
    const webhookUrl = action.config.url;
    if (!webhookUrl) {
      this.logger.error('Webhook URL not configured for alert action');
      return;
    }

    const payload = {
      alert: {
        id: notification.alertId,
        rule: notification.rule.name,
        severity: notification.rule.severity,
        message: notification.message,
        currentValue: notification.currentValue,
        threshold: notification.threshold,
        timestamp: notification.timestamp,
      },
      metadata: notification.metadata,
    };

    try {
      // This would use an HTTP client to send the webhook
      this.logger.log(`Webhook alert would be sent to: ${webhookUrl}`, payload);
    } catch (error) {
      this.logger.error(
        `Failed to send webhook alert: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Execute Slack action
   */
  private async executeSlackAction(
    action: AlertAction,
    notification: AlertNotification,
  ): Promise<void> {
    const webhookUrl = action.config.webhookUrl;
    if (!webhookUrl) {
      this.logger.error('Slack webhook URL not configured for alert action');
      return;
    }

    const color = this.getSeverityColor(notification.rule.severity);
    const payload = {
      attachments: [
        {
          color,
          title: `AI Service Alert: ${notification.rule.name}`,
          text: notification.message,
          fields: [
            {
              title: 'Severity',
              value: notification.rule.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Current Value',
              value: notification.currentValue.toString(),
              short: true,
            },
            {
              title: 'Threshold',
              value: notification.threshold.toString(),
              short: true,
            },
            {
              title: 'Time',
              value: notification.timestamp.toISOString(),
              short: true,
            },
          ],
          ts: Math.floor(notification.timestamp.getTime() / 1000),
        },
      ],
    };

    try {
      // This would use an HTTP client to send to Slack
      this.logger.log(`Slack alert would be sent to: ${webhookUrl}`, payload);
    } catch (error) {
      this.logger.error(`Failed to send Slack alert: ${error.message}`, error);
    }
  }

  /**
   * Get color for severity level (for Slack)
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#ff0000'; // Red
      case 'high':
        return '#ff8c00'; // Orange
      case 'medium':
        return '#ffd700'; // Yellow
      case 'low':
        return '#00ff00'; // Green
      default:
        return '#808080'; // Gray
    }
  }

  /**
   * Test an alert rule
   */
  async testAlertRule(
    ruleId: string,
  ): Promise<{ success: boolean; message: string; currentValue?: number }> {
    try {
      const rule = this.alertRules.get(ruleId);
      if (!rule) {
        return { success: false, message: `Alert rule ${ruleId} not found` };
      }

      const currentValue = await this.evaluateCondition(rule.condition);
      const wouldTrigger = this.shouldTriggerAlert(
        rule.condition,
        currentValue,
      );

      return {
        success: true,
        message: wouldTrigger
          ? `Alert rule would trigger (current: ${currentValue}, threshold: ${rule.condition.threshold})`
          : `Alert rule would not trigger (current: ${currentValue}, threshold: ${rule.condition.threshold})`,
        currentValue,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error testing alert rule: ${error.message}`,
      };
    }
  }

  /**
   * Force trigger an alert for testing
   */
  async forceTriggerAlert(
    ruleId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const rule = this.alertRules.get(ruleId);
      if (!rule) {
        return { success: false, message: `Alert rule ${ruleId} not found` };
      }

      const currentValue = await this.evaluateCondition(rule.condition);
      await this.triggerAlert(rule, currentValue);

      return {
        success: true,
        message: `Alert ${ruleId} triggered successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error triggering alert: ${error.message}`,
      };
    }
  }
}
