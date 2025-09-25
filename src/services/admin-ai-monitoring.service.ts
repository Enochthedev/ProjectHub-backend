import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, MoreThan, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AIServiceConfig } from '../entities/ai-service-config.entity';
import { AIApiUsage } from '../entities/ai-api-usage.entity';
import {
  AIAlertRule,
  MetricType,
  AlertSeverity,
  AlertCondition,
} from '../entities/ai-alert-rule.entity';
import { AIAlert, AlertStatus } from '../entities/ai-alert.entity';
import { AdminAuditService } from './admin-audit.service';
import { HuggingFaceService } from './hugging-face.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { AIRateLimiterService } from './ai-rate-limiter.service';
import {
  AIHealthCheckDto,
  AIPerformanceMetricsDto,
  AIErrorAnalysisDto,
  AIAlertDto,
  CreateAIAlertRuleDto,
  UpdateAIAlertRuleDto,
  AIAlertRuleResponseDto,
  AIDiagnosticsDto,
  AIServiceComparisonDto,
  AIUsagePatternDto,
  AIMonitoringFiltersDto,
  AIMonitoringDashboardDto,
  AIPerformanceReportDto,
  HealthStatus,
} from '../dto/admin/ai-monitoring.dto';

@Injectable()
export class AdminAIMonitoringService {
  private readonly logger = new Logger(AdminAIMonitoringService.name);

  constructor(
    @InjectRepository(AIServiceConfig)
    private readonly serviceConfigRepository: Repository<AIServiceConfig>,
    @InjectRepository(AIApiUsage)
    private readonly usageRepository: Repository<AIApiUsage>,
    @InjectRepository(AIAlertRule)
    private readonly alertRuleRepository: Repository<AIAlertRule>,
    @InjectRepository(AIAlert)
    private readonly alertRepository: Repository<AIAlert>,
    private readonly dataSource: DataSource,
    private readonly auditService: AdminAuditService,
    private readonly huggingFaceService: HuggingFaceService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly rateLimiterService: AIRateLimiterService,
  ) {}

  /**
   * Get health check for all AI services
   */
  async getServicesHealth(): Promise<AIHealthCheckDto[]> {
    const services = await this.serviceConfigRepository.find({
      where: { isActive: true },
    });

    const healthChecks = await Promise.all(
      services.map((service) => this.getServiceHealth(service.id)),
    );

    return healthChecks;
  }

  /**
   * Get health check for a specific AI service
   */
  async getServiceHealth(serviceId: string): Promise<AIHealthCheckDto> {
    const service = await this.serviceConfigRepository.findOne({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException(`AI service with ID ${serviceId} not found`);
    }

    const startTime = Date.now();
    let overallStatus = HealthStatus.HEALTHY;
    const checks: Array<{
      name: string;
      status: HealthStatus;
      message?: string;
      responseTime?: number;
    }> = [];
    const dependencies: Array<{
      name: string;
      status: HealthStatus;
      responseTime?: number;
    }> = [];

    // Connectivity check
    try {
      const connectivityStart = Date.now();
      let isHealthy = false;

      if (service.serviceType === 'hugging_face') {
        isHealthy = await this.huggingFaceService.healthCheck();
      }

      const connectivityTime = Date.now() - connectivityStart;
      checks.push({
        name: 'Connectivity',
        status: isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        responseTime: connectivityTime,
        message: isHealthy
          ? 'Service is reachable'
          : 'Service is not reachable',
      });

      if (!isHealthy) overallStatus = HealthStatus.UNHEALTHY;
    } catch (error) {
      checks.push({
        name: 'Connectivity',
        status: HealthStatus.UNHEALTHY,
        message: `Connectivity failed: ${error.message}`,
      });
      overallStatus = HealthStatus.UNHEALTHY;
    }

    // Rate limit check
    try {
      const rateLimitStatus = await this.rateLimiterService.checkRateLimit();
      const rateLimitHealth =
        rateLimitStatus.remainingRequests > 10
          ? HealthStatus.HEALTHY
          : rateLimitStatus.remainingRequests > 0
            ? HealthStatus.DEGRADED
            : HealthStatus.UNHEALTHY;

      checks.push({
        name: 'Rate Limits',
        status: rateLimitHealth,
        message: `${rateLimitStatus.remainingRequests} requests remaining`,
      });

      if (rateLimitHealth === HealthStatus.UNHEALTHY) {
        overallStatus = HealthStatus.UNHEALTHY;
      } else if (
        rateLimitHealth === HealthStatus.DEGRADED &&
        overallStatus === HealthStatus.HEALTHY
      ) {
        overallStatus = HealthStatus.DEGRADED;
      }
    } catch (error) {
      checks.push({
        name: 'Rate Limits',
        status: HealthStatus.UNKNOWN,
        message: `Rate limit check failed: ${error.message}`,
      });
    }

    // Circuit breaker check
    try {
      const circuitStatus = this.circuitBreakerService.getStatus(
        `${service.serviceType}-${service.modelType}`,
      );
      const circuitHealth =
        circuitStatus?.state === 'CLOSED'
          ? HealthStatus.HEALTHY
          : circuitStatus?.state === 'HALF_OPEN'
            ? HealthStatus.DEGRADED
            : HealthStatus.UNHEALTHY;

      checks.push({
        name: 'Circuit Breaker',
        status: circuitHealth,
        message: `Circuit breaker state: ${circuitStatus?.state || 'unknown'}`,
      });

      if (circuitHealth === HealthStatus.UNHEALTHY) {
        overallStatus = HealthStatus.UNHEALTHY;
      } else if (
        circuitHealth === HealthStatus.DEGRADED &&
        overallStatus === HealthStatus.HEALTHY
      ) {
        overallStatus = HealthStatus.DEGRADED;
      }
    } catch (error) {
      checks.push({
        name: 'Circuit Breaker',
        status: HealthStatus.UNKNOWN,
        message: `Circuit breaker check failed: ${error.message}`,
      });
    }

    // Performance check (last 5 minutes)
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentUsage = await this.usageRepository.find({
        where: {
          model: service.model,
          createdAt: MoreThan(fiveMinutesAgo),
        },
      });

      if (recentUsage.length > 0) {
        const avgResponseTime =
          recentUsage.reduce((sum, usage) => sum + usage.responseTimeMs, 0) /
          recentUsage.length;
        const successRate =
          (recentUsage.filter((usage) => usage.success).length /
            recentUsage.length) *
          100;

        const performanceHealth =
          successRate >= 95 && avgResponseTime < 5000
            ? HealthStatus.HEALTHY
            : successRate >= 90 && avgResponseTime < 10000
              ? HealthStatus.DEGRADED
              : HealthStatus.UNHEALTHY;

        checks.push({
          name: 'Performance',
          status: performanceHealth,
          responseTime: avgResponseTime,
          message: `${successRate.toFixed(1)}% success rate, ${avgResponseTime.toFixed(0)}ms avg response time`,
        });

        if (performanceHealth === HealthStatus.UNHEALTHY) {
          overallStatus = HealthStatus.UNHEALTHY;
        } else if (
          performanceHealth === HealthStatus.DEGRADED &&
          overallStatus === HealthStatus.HEALTHY
        ) {
          overallStatus = HealthStatus.DEGRADED;
        }
      } else {
        checks.push({
          name: 'Performance',
          status: HealthStatus.UNKNOWN,
          message: 'No recent usage data available',
        });
      }
    } catch (error) {
      checks.push({
        name: 'Performance',
        status: HealthStatus.UNKNOWN,
        message: `Performance check failed: ${error.message}`,
      });
    }

    const totalResponseTime = Date.now() - startTime;

    return {
      serviceId: service.id,
      serviceName: service.name,
      status: overallStatus,
      lastChecked: new Date(),
      responseTime: totalResponseTime,
      uptime: 99.9, // Would be calculated from historical data
      checks,
      dependencies,
    };
  }

  /**
   * Get performance metrics for a service
   */
  async getServicePerformanceMetrics(
    serviceId: string,
    hoursBack: number = 24,
  ): Promise<AIPerformanceMetricsDto> {
    const service = await this.serviceConfigRepository.findOne({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException(`AI service with ID ${serviceId} not found`);
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hoursBack * 60 * 60 * 1000);

    // Get usage data for the time range
    const usageData = await this.usageRepository.find({
      where: {
        model: service.model,
        createdAt: Between(startTime, endTime),
      },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    // Calculate metrics
    const totalRequests = usageData.length;
    const successfulRequests = usageData.filter((u) => u.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate =
      totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    const errorRate = 100 - successRate;

    const responseTimes = usageData
      .map((u) => u.responseTimeMs)
      .sort((a, b) => a - b);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length
        : 0;
    const medianResponseTime =
      responseTimes.length > 0
        ? responseTimes[Math.floor(responseTimes.length / 2)]
        : 0;
    const p95ResponseTime =
      responseTimes.length > 0
        ? responseTimes[Math.floor(responseTimes.length * 0.95)]
        : 0;
    const p99ResponseTime =
      responseTimes.length > 0
        ? responseTimes[Math.floor(responseTimes.length * 0.99)]
        : 0;
    const minResponseTime = responseTimes.length > 0 ? responseTimes[0] : 0;
    const maxResponseTime =
      responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0;

    const totalTokensUsed = usageData.reduce((sum, u) => sum + u.tokensUsed, 0);
    const averageTokensPerRequest =
      totalRequests > 0 ? totalTokensUsed / totalRequests : 0;

    const throughput = totalRequests > 0 ? (totalRequests / hoursBack) * 60 : 0; // requests per minute

    // Calculate trends (compare with previous period)
    const previousStartTime = new Date(
      startTime.getTime() - hoursBack * 60 * 60 * 1000,
    );
    const previousUsageData = await this.usageRepository.find({
      where: {
        model: service.model,
        createdAt: Between(previousStartTime, startTime),
      },
    });

    const previousAvgResponseTime =
      previousUsageData.length > 0
        ? previousUsageData.reduce((sum, u) => sum + u.responseTimeMs, 0) /
          previousUsageData.length
        : 0;
    const previousSuccessRate =
      previousUsageData.length > 0
        ? (previousUsageData.filter((u) => u.success).length /
            previousUsageData.length) *
          100
        : 0;
    const previousThroughput =
      previousUsageData.length > 0
        ? (previousUsageData.length / hoursBack) * 60
        : 0;
    const previousErrorRate = 100 - previousSuccessRate;

    const responseTimeTrend =
      previousAvgResponseTime > 0
        ? ((averageResponseTime - previousAvgResponseTime) /
            previousAvgResponseTime) *
          100
        : 0;
    const successRateTrend =
      previousSuccessRate > 0
        ? ((successRate - previousSuccessRate) / previousSuccessRate) * 100
        : 0;
    const throughputTrend =
      previousThroughput > 0
        ? ((throughput - previousThroughput) / previousThroughput) * 100
        : 0;
    const errorRateTrend =
      previousErrorRate > 0
        ? ((errorRate - previousErrorRate) / previousErrorRate) * 100
        : 0;

    // Calculate breakdowns
    const endpointBreakdown = this.calculateEndpointBreakdown(usageData);
    const modelBreakdown = this.calculateModelBreakdown(usageData);
    const hourlyBreakdown = this.calculateHourlyBreakdown(
      usageData,
      startTime,
      endTime,
    );
    const userBreakdown = this.calculateUserBreakdown(usageData);

    return {
      serviceId: service.id,
      serviceName: service.name,
      timeRange: { start: startTime, end: endTime },
      metrics: {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        medianResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        minResponseTime,
        maxResponseTime,
        successRate,
        errorRate,
        throughput,
        totalTokensUsed,
        averageTokensPerRequest,
        totalCost: totalTokensUsed * 0.0001, // Mock cost calculation
        averageCostPerRequest:
          totalRequests > 0 ? (totalTokensUsed * 0.0001) / totalRequests : 0,
      },
      trends: {
        responseTimeTrend,
        successRateTrend,
        throughputTrend,
        errorRateTrend,
      },
      breakdown: {
        byEndpoint: endpointBreakdown,
        byModel: modelBreakdown,
        byHour: hourlyBreakdown,
        byUser: userBreakdown,
      },
    };
  }

  /**
   * Get error analysis for a service
   */
  async getServiceErrorAnalysis(
    serviceId: string,
    hoursBack: number = 24,
  ): Promise<AIErrorAnalysisDto> {
    const service = await this.serviceConfigRepository.findOne({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException(`AI service with ID ${serviceId} not found`);
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hoursBack * 60 * 60 * 1000);

    // Get error data
    const errorData = await this.usageRepository.find({
      where: {
        model: service.model,
        success: false,
        createdAt: Between(startTime, endTime),
      },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    const totalUsage = await this.usageRepository.count({
      where: {
        model: service.model,
        createdAt: Between(startTime, endTime),
      },
    });

    const totalErrors = errorData.length;
    const errorRate = totalUsage > 0 ? (totalErrors / totalUsage) * 100 : 0;

    // Calculate error breakdowns
    const errorTypeBreakdown = this.calculateErrorTypeBreakdown(errorData);
    const errorEndpointBreakdown =
      this.calculateErrorEndpointBreakdown(errorData);
    const errorModelBreakdown = this.calculateErrorModelBreakdown(errorData);
    const errorTimeBreakdown = this.calculateErrorTimeBreakdown(errorData);

    const mostCommonErrors = errorTypeBreakdown.slice(0, 5).map((error) => ({
      errorType: error.errorType,
      count: error.count,
      percentage: error.percentage,
      lastOccurrence:
        errorData.find((e) => e.errorMessage === error.errorType)?.createdAt ||
        new Date(),
    }));

    const recentErrors = errorData.slice(0, 20).map((error) => ({
      timestamp: error.createdAt,
      errorType: this.categorizeError(error.errorMessage || ''),
      errorMessage: error.errorMessage || 'Unknown error',
      endpoint: error.endpoint,
      model: error.model,
      userId: error.userId || undefined,
      responseTime: error.responseTimeMs,
    }));

    return {
      serviceId: service.id,
      serviceName: service.name,
      timeRange: { start: startTime, end: endTime },
      errorSummary: {
        totalErrors,
        errorRate,
        mostCommonErrors,
      },
      errorBreakdown: {
        byType: errorTypeBreakdown,
        byEndpoint: errorEndpointBreakdown,
        byModel: errorModelBreakdown,
        byTimeOfDay: errorTimeBreakdown,
      },
      recentErrors,
    };
  }

  /**
   * Create alert rule
   */
  async createAlertRule(
    createDto: CreateAIAlertRuleDto,
    adminId: string,
  ): Promise<AIAlertRuleResponseDto> {
    // Validate service exists
    const service = await this.serviceConfigRepository.findOne({
      where: { id: createDto.serviceId },
    });

    if (!service) {
      throw new NotFoundException(
        `AI service with ID ${createDto.serviceId} not found`,
      );
    }

    const alertRule = this.alertRuleRepository.create({
      ...createDto,
      condition: createDto.condition as AlertCondition,
      createdById: adminId,
      updatedById: adminId,
    });

    const savedRule = await this.alertRuleRepository.save(alertRule);

    // Log the creation
    await this.auditService.logAdminAction(
      adminId,
      'create',
      'ai_alert_rule',
      savedRule.id,
      null,
      savedRule,
    );

    this.logger.log(
      `AI alert rule '${savedRule.name}' created by admin ${adminId}`,
    );

    return this.mapAlertRuleToResponseDto(savedRule, service.name);
  }

  /**
   * Update alert rule
   */
  async updateAlertRule(
    id: string,
    updateDto: UpdateAIAlertRuleDto,
    adminId: string,
  ): Promise<AIAlertRuleResponseDto> {
    const alertRule = await this.alertRuleRepository.findOne({
      where: { id },
      relations: ['service'],
    });

    if (!alertRule) {
      throw new NotFoundException(`AI alert rule with ID ${id} not found`);
    }

    const oldValues = { ...alertRule };

    Object.assign(alertRule, updateDto);
    alertRule.updatedById = adminId;

    const savedRule = await this.alertRuleRepository.save(alertRule);

    // Log the update
    await this.auditService.logAdminAction(
      adminId,
      'update',
      'ai_alert_rule',
      savedRule.id,
      oldValues,
      savedRule,
    );

    this.logger.log(
      `AI alert rule '${savedRule.name}' updated by admin ${adminId}`,
    );

    return this.mapAlertRuleToResponseDto(savedRule, alertRule.service.name);
  }

  /**
   * Delete alert rule
   */
  async deleteAlertRule(id: string, adminId: string): Promise<void> {
    const alertRule = await this.alertRuleRepository.findOne({
      where: { id },
    });

    if (!alertRule) {
      throw new NotFoundException(`AI alert rule with ID ${id} not found`);
    }

    await this.alertRuleRepository.remove(alertRule);

    // Log the deletion
    await this.auditService.logAdminAction(
      adminId,
      'delete',
      'ai_alert_rule',
      id,
      alertRule,
      null,
    );

    this.logger.log(
      `AI alert rule '${alertRule.name}' deleted by admin ${adminId}`,
    );
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(
    filters?: AIMonitoringFiltersDto,
  ): Promise<AIAlertDto[]> {
    const queryBuilder = this.alertRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.service', 'service')
      .leftJoinAndSelect('alert.rule', 'rule')
      .leftJoinAndSelect('alert.acknowledgedBy', 'acknowledgedBy')
      .where('alert.status = :status', { status: AlertStatus.ACTIVE });

    if (filters?.serviceId) {
      queryBuilder.andWhere('alert.serviceId = :serviceId', {
        serviceId: filters.serviceId,
      });
    }

    if (filters?.alertSeverity) {
      queryBuilder.andWhere('alert.severity = :severity', {
        severity: filters.alertSeverity,
      });
    }

    queryBuilder.orderBy('alert.triggeredAt', 'DESC');

    if (filters?.limit) {
      queryBuilder.take(filters.limit);
    }

    const alerts = await queryBuilder.getMany();

    return alerts.map((alert) => this.mapAlertToDto(alert));
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(
    id: string,
    adminId: string,
    notes?: string,
  ): Promise<AIAlertDto> {
    const alert = await this.alertRepository.findOne({
      where: { id },
      relations: ['service', 'rule'],
    });

    if (!alert) {
      throw new NotFoundException(`AI alert with ID ${id} not found`);
    }

    alert.acknowledge(adminId, notes);
    const savedAlert = await this.alertRepository.save(alert);

    // Log the acknowledgment
    await this.auditService.logAdminAction(
      adminId,
      'acknowledge',
      'ai_alert',
      savedAlert.id,
      null,
      { acknowledgedBy: adminId, notes },
    );

    this.logger.log(
      `AI alert '${savedAlert.title}' acknowledged by admin ${adminId}`,
    );

    return this.mapAlertToDto(savedAlert);
  }

  /**
   * Resolve alert
   */
  async resolveAlert(
    id: string,
    adminId: string,
    notes?: string,
  ): Promise<AIAlertDto> {
    const alert = await this.alertRepository.findOne({
      where: { id },
      relations: ['service', 'rule'],
    });

    if (!alert) {
      throw new NotFoundException(`AI alert with ID ${id} not found`);
    }

    alert.resolve(notes);
    const savedAlert = await this.alertRepository.save(alert);

    // Log the resolution
    await this.auditService.logAdminAction(
      adminId,
      'resolve',
      'ai_alert',
      savedAlert.id,
      null,
      { resolvedBy: adminId, notes },
    );

    this.logger.log(
      `AI alert '${savedAlert.title}' resolved by admin ${adminId}`,
    );

    return this.mapAlertToDto(savedAlert);
  }

  /**
   * Get monitoring dashboard data
   */
  async getMonitoringDashboard(): Promise<AIMonitoringDashboardDto> {
    const services = await this.serviceConfigRepository.find({
      where: { isActive: true },
    });

    const healthChecks = await Promise.all(
      services.map((service) => this.getServiceHealth(service.id)),
    );

    const healthyServices = healthChecks.filter(
      (h) => h.status === HealthStatus.HEALTHY,
    ).length;
    const degradedServices = healthChecks.filter(
      (h) => h.status === HealthStatus.DEGRADED,
    ).length;
    const unhealthyServices = healthChecks.filter(
      (h) => h.status === HealthStatus.UNHEALTHY,
    ).length;

    const activeAlerts = await this.getActiveAlerts({ limit: 10 });

    // Get 24h metrics
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const totalRequests24h = await this.usageRepository.count({
      where: { createdAt: MoreThan(yesterday) },
    });

    const usage24h = await this.usageRepository.find({
      where: { createdAt: MoreThan(yesterday) },
    });

    const averageResponseTime24h =
      usage24h.length > 0
        ? usage24h.reduce((sum, u) => sum + u.responseTimeMs, 0) /
          usage24h.length
        : 0;

    const successRate24h =
      usage24h.length > 0
        ? (usage24h.filter((u) => u.success).length / usage24h.length) * 100
        : 0;

    const totalCost24h =
      usage24h.reduce((sum, u) => sum + u.tokensUsed, 0) * 0.0001;

    return {
      overview: {
        totalServices: services.length,
        healthyServices,
        degradedServices,
        unhealthyServices,
        activeAlerts: activeAlerts.length,
        totalRequests24h,
        averageResponseTime24h,
        successRate24h,
        totalCost24h,
      },
      serviceHealth: healthChecks.map((h) => ({
        serviceId: h.serviceId,
        serviceName: h.serviceName,
        status: h.status,
        responseTime: h.responseTime,
        successRate:
          h.checks.find((c) => c.name === 'Performance')?.responseTime || 0,
        lastChecked: h.lastChecked,
      })),
      recentAlerts: activeAlerts,
      performanceTrends: [], // Would be populated with historical data
      topErrors: [], // Would be populated with error analysis
      costAnalysis: {
        totalCost24h,
        costByService: [], // Would be calculated per service
        costTrend: [], // Would be populated with historical cost data
      },
    };
  }

  /**
   * Scheduled task to check alert rules
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAlertRules(): Promise<void> {
    try {
      const activeRules = await this.alertRuleRepository.find({
        where: { isEnabled: true },
        relations: ['service'],
      });

      for (const rule of activeRules) {
        if (rule.isInCooldown()) {
          continue;
        }

        const currentValue = await this.getCurrentMetricValue(rule);

        if (rule.shouldTrigger(currentValue)) {
          await this.triggerAlert(rule, currentValue);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking alert rules: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get current metric value for alert rule evaluation
   */
  private async getCurrentMetricValue(rule: AIAlertRule): Promise<number> {
    const evaluationStart = new Date(
      Date.now() - rule.evaluationWindow * 60 * 1000,
    );

    const usageData = await this.usageRepository.find({
      where: {
        model: rule.service.model,
        createdAt: MoreThan(evaluationStart),
      },
    });

    if (usageData.length === 0) {
      return 0;
    }

    switch (rule.metricType) {
      case MetricType.RESPONSE_TIME:
        return (
          usageData.reduce((sum, u) => sum + u.responseTimeMs, 0) /
          usageData.length
        );
      case MetricType.SUCCESS_RATE:
        return (
          (usageData.filter((u) => u.success).length / usageData.length) * 100
        );
      case MetricType.ERROR_RATE:
        return (
          (usageData.filter((u) => !u.success).length / usageData.length) * 100
        );
      case MetricType.THROUGHPUT:
        return (usageData.length / rule.evaluationWindow) * 60; // requests per minute
      case MetricType.TOKEN_USAGE:
        return usageData.reduce((sum, u) => sum + u.tokensUsed, 0);
      case MetricType.COST:
        return usageData.reduce((sum, u) => sum + u.tokensUsed, 0) * 0.0001;
      default:
        return 0;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(
    rule: AIAlertRule,
    currentValue: number,
  ): Promise<void> {
    // Check if there's already an active alert for this rule
    const existingAlert = await this.alertRepository.findOne({
      where: {
        ruleId: rule.id,
        status: AlertStatus.ACTIVE,
      },
    });

    if (existingAlert) {
      // Update existing alert
      existingAlert.updateCurrentValue(currentValue);
      await this.alertRepository.save(existingAlert);
    } else {
      // Create new alert
      const title = `${rule.name} - ${rule.service.name}`;
      const description = `${rule.getConditionDescription()} (current: ${currentValue.toFixed(2)})`;

      const alert = this.alertRepository.create(
        AIAlert.createFromRule(rule, currentValue, title, description),
      );

      await this.alertRepository.save(alert);
    }

    // Update rule trigger info
    rule.trigger();
    await this.alertRuleRepository.save(rule);

    this.logger.warn(
      `Alert triggered: ${rule.name} for service ${rule.service.name}`,
    );
  }

  /**
   * Helper methods for breakdowns and calculations
   */
  private calculateEndpointBreakdown(usageData: AIApiUsage[]) {
    const endpointMap = new Map<
      string,
      { requests: number; totalResponseTime: number; successCount: number }
    >();

    usageData.forEach((usage) => {
      const endpoint = usage.endpoint;
      const existing = endpointMap.get(endpoint) || {
        requests: 0,
        totalResponseTime: 0,
        successCount: 0,
      };

      existing.requests += 1;
      existing.totalResponseTime += usage.responseTimeMs;
      if (usage.success) existing.successCount += 1;

      endpointMap.set(endpoint, existing);
    });

    return Array.from(endpointMap.entries()).map(([endpoint, data]) => ({
      endpoint,
      requests: data.requests,
      averageResponseTime: data.totalResponseTime / data.requests,
      successRate: (data.successCount / data.requests) * 100,
    }));
  }

  private calculateModelBreakdown(usageData: AIApiUsage[]) {
    const modelMap = new Map<
      string,
      {
        requests: number;
        totalResponseTime: number;
        successCount: number;
        tokensUsed: number;
      }
    >();

    usageData.forEach((usage) => {
      const model = usage.model;
      const existing = modelMap.get(model) || {
        requests: 0,
        totalResponseTime: 0,
        successCount: 0,
        tokensUsed: 0,
      };

      existing.requests += 1;
      existing.totalResponseTime += usage.responseTimeMs;
      existing.tokensUsed += usage.tokensUsed;
      if (usage.success) existing.successCount += 1;

      modelMap.set(model, existing);
    });

    return Array.from(modelMap.entries()).map(([model, data]) => ({
      model,
      requests: data.requests,
      averageResponseTime: data.totalResponseTime / data.requests,
      successRate: (data.successCount / data.requests) * 100,
      tokensUsed: data.tokensUsed,
    }));
  }

  private calculateHourlyBreakdown(
    usageData: AIApiUsage[],
    startTime: Date,
    endTime: Date,
  ) {
    const hourlyMap = new Map<
      string,
      { requests: number; totalResponseTime: number; successCount: number }
    >();

    // Initialize all hours in the range
    const currentHour = new Date(startTime);
    currentHour.setMinutes(0, 0, 0);

    while (currentHour <= endTime) {
      const hourKey = currentHour.toISOString();
      hourlyMap.set(hourKey, {
        requests: 0,
        totalResponseTime: 0,
        successCount: 0,
      });
      currentHour.setHours(currentHour.getHours() + 1);
    }

    // Populate with actual data
    usageData.forEach((usage) => {
      const hour = new Date(usage.createdAt);
      hour.setMinutes(0, 0, 0);
      const hourKey = hour.toISOString();

      const existing = hourlyMap.get(hourKey);
      if (existing) {
        existing.requests += 1;
        existing.totalResponseTime += usage.responseTimeMs;
        if (usage.success) existing.successCount += 1;
      }
    });

    return Array.from(hourlyMap.entries()).map(([hourKey, data]) => ({
      hour: new Date(hourKey),
      requests: data.requests,
      averageResponseTime:
        data.requests > 0 ? data.totalResponseTime / data.requests : 0,
      successRate:
        data.requests > 0 ? (data.successCount / data.requests) * 100 : 0,
    }));
  }

  private calculateUserBreakdown(usageData: AIApiUsage[]) {
    const userMap = new Map<
      string,
      { requests: number; totalResponseTime: number; successCount: number }
    >();

    usageData.forEach((usage) => {
      if (!usage.userId) return;

      const userId = usage.userId;
      const existing = userMap.get(userId) || {
        requests: 0,
        totalResponseTime: 0,
        successCount: 0,
      };

      existing.requests += 1;
      existing.totalResponseTime += usage.responseTimeMs;
      if (usage.success) existing.successCount += 1;

      userMap.set(userId, existing);
    });

    return Array.from(userMap.entries())
      .map(([userId, data]) => ({
        userId,
        requests: data.requests,
        averageResponseTime: data.totalResponseTime / data.requests,
        successRate: (data.successCount / data.requests) * 100,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10); // Top 10 users
  }

  private calculateErrorTypeBreakdown(errorData: AIApiUsage[]) {
    const errorMap = new Map<
      string,
      { count: number; totalResponseTime: number }
    >();

    errorData.forEach((error) => {
      const errorType = this.categorizeError(error.errorMessage || '');
      const existing = errorMap.get(errorType) || {
        count: 0,
        totalResponseTime: 0,
      };

      existing.count += 1;
      existing.totalResponseTime += error.responseTimeMs;

      errorMap.set(errorType, existing);
    });

    const totalErrors = errorData.length;

    return Array.from(errorMap.entries()).map(([errorType, data]) => ({
      errorType,
      count: data.count,
      percentage: totalErrors > 0 ? (data.count / totalErrors) * 100 : 0,
      averageResponseTime: data.totalResponseTime / data.count,
    }));
  }

  private calculateErrorEndpointBreakdown(errorData: AIApiUsage[]) {
    const endpointMap = new Map<string, number>();

    errorData.forEach((error) => {
      const endpoint = error.endpoint;
      endpointMap.set(endpoint, (endpointMap.get(endpoint) || 0) + 1);
    });

    return Array.from(endpointMap.entries()).map(([endpoint, errorCount]) => ({
      endpoint,
      errorCount,
      errorRate: 0, // Would need total requests per endpoint to calculate
    }));
  }

  private calculateErrorModelBreakdown(errorData: AIApiUsage[]) {
    const modelMap = new Map<string, number>();

    errorData.forEach((error) => {
      const model = error.model;
      modelMap.set(model, (modelMap.get(model) || 0) + 1);
    });

    return Array.from(modelMap.entries()).map(([model, errorCount]) => ({
      model,
      errorCount,
      errorRate: 0, // Would need total requests per model to calculate
    }));
  }

  private calculateErrorTimeBreakdown(errorData: AIApiUsage[]) {
    const hourMap = new Map<number, number>();

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourMap.set(i, 0);
    }

    errorData.forEach((error) => {
      const hour = error.createdAt.getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });

    return Array.from(hourMap.entries()).map(([hour, errorCount]) => ({
      hour,
      errorCount,
      errorRate: 0, // Would need total requests per hour to calculate
    }));
  }

  private categorizeError(errorMessage: string): string {
    if (errorMessage.toLowerCase().includes('timeout')) return 'Timeout';
    if (errorMessage.toLowerCase().includes('rate limit')) return 'Rate Limit';
    if (errorMessage.toLowerCase().includes('authentication'))
      return 'Authentication';
    if (errorMessage.toLowerCase().includes('authorization'))
      return 'Authorization';
    if (errorMessage.toLowerCase().includes('network')) return 'Network';
    if (errorMessage.toLowerCase().includes('server')) return 'Server Error';
    if (errorMessage.toLowerCase().includes('validation')) return 'Validation';
    return 'Unknown Error';
  }

  private mapAlertRuleToResponseDto(
    rule: AIAlertRule,
    serviceName: string,
  ): AIAlertRuleResponseDto {
    return {
      id: rule.id,
      name: rule.name,
      serviceId: rule.serviceId,
      serviceName,
      metricType: rule.metricType,
      condition: rule.condition,
      threshold: rule.threshold,
      severity: rule.severity,
      description: rule.description || undefined,
      evaluationWindow: rule.evaluationWindow,
      cooldownPeriod: rule.cooldownPeriod,
      isEnabled: rule.isEnabled,
      notificationChannels: rule.notificationChannels,
      lastTriggered: rule.lastTriggered || undefined,
      triggerCount: rule.triggerCount,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
      createdBy: rule.createdById,
      updatedBy: rule.updatedById,
    };
  }

  private mapAlertToDto(alert: AIAlert): AIAlertDto {
    return {
      id: alert.id,
      serviceId: alert.serviceId,
      serviceName: alert.service?.name || 'Unknown Service',
      alertType: alert.alertType,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      threshold: alert.threshold,
      currentValue: alert.currentValue,
      isActive: alert.isActive(),
      triggeredAt: alert.triggeredAt,
      resolvedAt: alert.resolvedAt || undefined,
      acknowledgedAt: alert.acknowledgedAt || undefined,
      acknowledgedBy: alert.acknowledgedById || undefined,
      metadata: alert.metadata || {},
    };
  }
}
