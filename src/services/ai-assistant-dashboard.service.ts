import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIAssistantAnalyticsService,
  ComprehensiveAnalytics,
} from './ai-assistant-analytics.service';
import {
  AIAssistantMonitoringService,
  HealthCheckResult,
  Alert,
} from './ai-assistant-monitoring.service';
import {
  AIMonitoringService,
  AIServiceMetrics,
  AIServiceHealth,
} from './ai-monitoring.service';
import { AILoggingService, AIPerformanceMetrics } from './ai-logging.service';

export interface DashboardMetrics {
  overview: {
    totalUsers: number;
    activeConversations: number;
    dailyQuestions: number;
    averageResponseTime: number;
    systemHealth: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
    uptime: number;
  };
  realTime: {
    currentLoad: number;
    requestsPerMinute: number;
    errorRate: number;
    averageConfidence: number;
    activeUsers: number;
  };
  quality: {
    userSatisfaction: number;
    responseAccuracy: number;
    fallbackRate: number;
    escalationRate: number;
  };
  performance: {
    responseTime: {
      current: number;
      trend:
        | 'improving'
        | 'stable'
        | 'degrading'
        | 'increasing'
        | 'decreasing'
        | 'worsening';
    };
    throughput: {
      current: number;
      trend:
        | 'improving'
        | 'stable'
        | 'degrading'
        | 'increasing'
        | 'decreasing'
        | 'worsening';
    };
    errorRate: {
      current: number;
      trend:
        | 'improving'
        | 'stable'
        | 'degrading'
        | 'increasing'
        | 'decreasing'
        | 'worsening';
    };
  };
  alerts: {
    critical: number;
    warning: number;
    info: number;
    recent: Alert[];
  };
}

export interface DashboardChartData {
  conversationTrends: Array<{
    date: string;
    conversations: number;
    messages: number;
    users: number;
  }>;
  responseTimeChart: Array<{
    timestamp: string;
    responseTime: number;
    target: number;
  }>;
  qualityMetrics: Array<{
    date: string;
    confidence: number;
    satisfaction: number;
    accuracy: number;
  }>;
  usagePatterns: Array<{
    hour: number;
    dayOfWeek: number;
    usage: number;
    label: string;
  }>;
  errorDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  topQuestions: Array<{
    question: string;
    count: number;
    averageConfidence: number;
    category: string;
  }>;
}

export interface SystemStatus {
  services: Array<{
    name: string;
    status: 'online' | 'offline' | 'degraded';
    responseTime: number;
    lastCheck: Date;
    uptime: number;
  }>;
  dependencies: Array<{
    name: string;
    type: 'database' | 'api' | 'cache' | 'external';
    status: 'connected' | 'disconnected' | 'slow';
    latency: number;
    lastCheck: Date;
  }>;
  resources: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
}

export interface AlertSummary {
  total: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  recent: Alert[];
  trends: Array<{
    date: string;
    count: number;
    severity: string;
  }>;
}

export interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
    duration: string;
  };
  summary: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    peakLoad: number;
    uptime: number;
  };
  trends: {
    responseTime: Array<{ timestamp: string; value: number }>;
    throughput: Array<{ timestamp: string; value: number }>;
    errorRate: Array<{ timestamp: string; value: number }>;
    userSatisfaction: Array<{ timestamp: string; value: number }>;
  };
  insights: Array<{
    type: 'improvement' | 'degradation' | 'anomaly';
    metric: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    recommendations: string[];
  }>;
}

@Injectable()
export class AIAssistantDashboardService {
  private readonly logger = new Logger(AIAssistantDashboardService.name);

  private metricsCache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private readonly CACHE_TTL = {
    realTime: 30 * 1000, // 30 seconds
    overview: 5 * 60 * 1000, // 5 minutes
    charts: 10 * 60 * 1000, // 10 minutes
    reports: 60 * 60 * 1000, // 1 hour
  };

  constructor(
    private readonly analyticsService: AIAssistantAnalyticsService,
    private readonly monitoringService: AIAssistantMonitoringService,
    private readonly aiMonitoringService: AIMonitoringService,
    private readonly loggingService: AILoggingService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const cacheKey = 'dashboard-metrics';
    const cached = this.getFromCache(cacheKey, this.CACHE_TTL.overview);
    if (cached) return cached;

    try {
      const [healthChecks, aiMetrics, recentAnalytics, activeAlerts] =
        await Promise.all([
          this.monitoringService.performAllHealthChecks(),
          this.aiMonitoringService.getMetrics(),
          this.getRecentAnalytics(),
          this.monitoringService.getActiveAlerts(),
        ]);

      const systemHealth = this.determineOverallHealth(healthChecks);
      const uptime = this.calculateUptime(healthChecks);

      const metrics: DashboardMetrics = {
        overview: {
          totalUsers: recentAnalytics?.usage.activeUsers.monthly || 0,
          activeConversations:
            recentAnalytics?.conversations.activeConversations || 0,
          dailyQuestions: recentAnalytics?.usage.activeUsers.daily || 0,
          averageResponseTime: aiMetrics.averageResponseTime,
          systemHealth,
          uptime,
        },
        realTime: {
          currentLoad: aiMetrics.requestsPerMinute,
          requestsPerMinute: aiMetrics.requestsPerMinute,
          errorRate: (100 - aiMetrics.successRate) / 100,
          averageConfidence:
            recentAnalytics?.quality.responseQuality.averageConfidence || 0,
          activeUsers: recentAnalytics?.usage.activeUsers.daily || 0,
        },
        quality: {
          userSatisfaction:
            recentAnalytics?.quality.userSatisfaction.averageRating || 0,
          responseAccuracy:
            recentAnalytics?.quality.responseQuality.averageConfidence || 0,
          fallbackRate:
            recentAnalytics?.quality.fallbackUsage.fallbackRate || 0,
          escalationRate:
            recentAnalytics?.quality.escalationMetrics.escalationRate || 0,
        },
        performance: {
          responseTime: {
            current: aiMetrics.averageResponseTime,
            trend: this.calculateTrend(
              'responseTime',
              aiMetrics.averageResponseTime,
            ),
          },
          throughput: {
            current: aiMetrics.requestsPerMinute,
            trend: this.calculateTrend(
              'throughput',
              aiMetrics.requestsPerMinute,
            ),
          },
          errorRate: {
            current: (100 - aiMetrics.successRate) / 100,
            trend: this.calculateTrend(
              'errorRate',
              (100 - aiMetrics.successRate) / 100,
            ),
          },
        },
        alerts: {
          critical: activeAlerts.filter((a) => a.severity === 'critical')
            .length,
          warning: activeAlerts.filter(
            (a) => a.severity === 'high' || a.severity === 'medium',
          ).length,
          info: activeAlerts.filter((a) => a.severity === 'low').length,
          recent: activeAlerts.slice(0, 5),
        },
      };

      this.setCache(cacheKey, metrics, this.CACHE_TTL.overview);
      return metrics;
    } catch (error) {
      this.logger.error(
        `Failed to get dashboard metrics: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get chart data for dashboard visualizations
   */
  async getDashboardChartData(
    period: 'hour' | 'day' | 'week' | 'month' = 'day',
  ): Promise<DashboardChartData> {
    const cacheKey = `chart-data-${period}`;
    const cached = this.getFromCache(cacheKey, this.CACHE_TTL.charts);
    if (cached) return cached;

    try {
      const { startDate, endDate } = this.getPeriodDates(period);

      const [analytics, performanceMetrics, healthChecks] = await Promise.all([
        this.analyticsService.generateComprehensiveAnalytics(
          startDate,
          endDate,
        ),
        this.loggingService.getPerformanceMetrics(period, startDate, endDate),
        this.monitoringService.performAllHealthChecks(),
      ]);

      const chartData: DashboardChartData = {
        conversationTrends: this.generateConversationTrends(analytics),
        responseTimeChart: this.generateResponseTimeChart(performanceMetrics),
        qualityMetrics: this.generateQualityChart(analytics),
        usagePatterns: this.generateUsagePatterns(analytics),
        errorDistribution: this.generateErrorDistribution(performanceMetrics),
        topQuestions: await this.generateTopQuestions(startDate, endDate),
      };

      this.setCache(cacheKey, chartData, this.CACHE_TTL.charts);
      return chartData;
    } catch (error) {
      this.logger.error(`Failed to get chart data: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get system status information
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const cacheKey = 'system-status';
    const cached = this.getFromCache(cacheKey, this.CACHE_TTL.realTime);
    if (cached) return cached;

    try {
      const healthChecks =
        await this.monitoringService.performAllHealthChecks();
      const aiHealth = this.aiMonitoringService.getHealthStatus();

      const services = healthChecks.map((check) => ({
        name: check.serviceName,
        status: this.mapHealthToStatus(check.status),
        responseTime: check.responseTime,
        lastCheck: check.timestamp,
        uptime: this.calculateServiceUptime(check.serviceName),
      }));

      // Add AI service status
      services.push({
        name: 'AI Assistant Core',
        status: this.mapHealthToStatus(aiHealth.status),
        responseTime: 0, // Would need to track this
        lastCheck: aiHealth.lastHealthCheck,
        uptime: 99.9, // Would calculate from historical data
      });

      const dependencies = [
        {
          name: 'PostgreSQL Database',
          type: 'database' as const,
          status: 'connected' as const,
          latency: 5,
          lastCheck: new Date(),
        },
        {
          name: 'Redis Cache',
          type: 'cache' as const,
          status: 'connected' as const,
          latency: 2,
          lastCheck: new Date(),
        },
        {
          name: 'Hugging Face API',
          type: 'external' as const,
          status:
            aiHealth.status === 'healthy'
              ? ('connected' as const)
              : ('slow' as const),
          latency: 150,
          lastCheck: new Date(),
        },
      ];

      const resources = {
        cpu: 45, // Would get from system monitoring
        memory: 62,
        disk: 78,
        network: 23,
      };

      const status: SystemStatus = {
        services,
        dependencies,
        resources,
      };

      this.setCache(cacheKey, status, this.CACHE_TTL.realTime);
      return status;
    } catch (error) {
      this.logger.error(`Failed to get system status: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get alert summary
   */
  async getAlertSummary(
    period: 'hour' | 'day' | 'week' = 'day',
  ): Promise<AlertSummary> {
    try {
      const alerts = this.monitoringService.getAllAlerts();
      const { startDate } = this.getPeriodDates(period);

      const recentAlerts = alerts.filter(
        (alert) => alert.timestamp >= startDate,
      );

      const bySeverity: Record<string, number> = {};
      const byType: Record<string, number> = {};

      recentAlerts.forEach((alert) => {
        bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
        byType[alert.ruleId] = (byType[alert.ruleId] || 0) + 1;
      });

      const trends = this.generateAlertTrends(
        recentAlerts,
        startDate,
        new Date(),
      );

      return {
        total: recentAlerts.length,
        bySeverity,
        byType,
        recent: recentAlerts.slice(0, 10),
        trends,
      };
    } catch (error) {
      this.logger.error(`Failed to get alert summary: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(
    startDate: Date,
    endDate: Date,
  ): Promise<PerformanceReport> {
    const cacheKey = `performance-report-${startDate.getTime()}-${endDate.getTime()}`;
    const cached = this.getFromCache(cacheKey, this.CACHE_TTL.reports);
    if (cached) return cached;

    try {
      const [analytics, performanceMetrics, healthHistory] = await Promise.all([
        this.analyticsService.generateComprehensiveAnalytics(
          startDate,
          endDate,
        ),
        this.loggingService.getPerformanceMetrics('day', startDate, endDate),
        this.getHealthHistory(startDate, endDate),
      ]);

      const duration = endDate.getTime() - startDate.getTime();
      const uptime = this.calculatePeriodUptime(healthHistory);

      const report: PerformanceReport = {
        period: {
          start: startDate,
          end: endDate,
          duration: this.formatDuration(duration),
        },
        summary: {
          totalRequests: performanceMetrics.totalRequests,
          successRate:
            performanceMetrics.successfulRequests /
            Math.max(1, performanceMetrics.totalRequests),
          averageResponseTime: performanceMetrics.averageResponseTime,
          peakLoad: Math.max(
            ...performanceMetrics.performanceByHour.map((p) => p.requests),
          ),
          uptime,
        },
        trends: {
          responseTime: this.generateTrendData(
            performanceMetrics.performanceByHour,
            'avgResponseTime',
          ),
          throughput: this.generateTrendData(
            performanceMetrics.performanceByHour,
            'requests',
          ),
          errorRate: this.generateErrorRateTrend(performanceMetrics),
          userSatisfaction: this.generateSatisfactionTrend(analytics),
        },
        insights: this.generatePerformanceInsights(
          analytics,
          performanceMetrics,
        ),
      };

      this.setCache(cacheKey, report, this.CACHE_TTL.reports);
      return report;
    } catch (error) {
      this.logger.error(
        `Failed to generate performance report: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get real-time metrics (no caching)
   */
  async getRealTimeMetrics(): Promise<{
    timestamp: Date;
    activeUsers: number;
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    queueLength: number;
  }> {
    try {
      const aiMetrics = this.aiMonitoringService.getMetrics();

      return {
        timestamp: new Date(),
        activeUsers: 0, // Would need session tracking
        requestsPerMinute: aiMetrics.requestsPerMinute,
        averageResponseTime: aiMetrics.averageResponseTime,
        errorRate: (100 - aiMetrics.successRate) / 100,
        queueLength: 0, // Would need queue monitoring
      };
    } catch (error) {
      this.logger.error(
        `Failed to get real-time metrics: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Export dashboard data
   */
  async exportDashboardData(
    format: 'json' | 'csv',
    period: 'day' | 'week' | 'month',
  ): Promise<string> {
    try {
      const { startDate, endDate } = this.getPeriodDates(period);

      const [metrics, chartData, analytics, alerts] = await Promise.all([
        this.getDashboardMetrics(),
        this.getDashboardChartData(period),
        this.analyticsService.generateComprehensiveAnalytics(
          startDate,
          endDate,
        ),
        this.getAlertSummary(period === 'month' ? 'week' : period),
      ]);

      const exportData = {
        exportInfo: {
          generatedAt: new Date(),
          period: { startDate, endDate },
          format,
        },
        metrics,
        chartData,
        analytics,
        alerts,
      };

      if (format === 'json') {
        return JSON.stringify(exportData, null, 2);
      } else {
        return this.convertToCSV(exportData);
      }
    } catch (error) {
      this.logger.error(
        `Failed to export dashboard data: ${error.message}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private async getRecentAnalytics(): Promise<ComprehensiveAnalytics | null> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      return await this.analyticsService.generateComprehensiveAnalytics(
        startDate,
        endDate,
      );
    } catch (error) {
      this.logger.warn(`Failed to get recent analytics: ${error.message}`);
      return null;
    }
  }

  private determineOverallHealth(
    healthChecks: HealthCheckResult[],
  ): DashboardMetrics['overview']['systemHealth'] {
    if (healthChecks.some((check) => check.status === 'critical')) {
      return 'critical';
    }
    if (healthChecks.some((check) => check.status === 'unhealthy')) {
      return 'unhealthy';
    }
    if (healthChecks.some((check) => check.status === 'degraded')) {
      return 'degraded';
    }
    return 'healthy';
  }

  private calculateUptime(healthChecks: HealthCheckResult[]): number {
    // Simplified uptime calculation
    const healthyServices = healthChecks.filter(
      (check) => check.status === 'healthy' || check.status === 'degraded',
    ).length;

    return healthChecks.length > 0
      ? (healthyServices / healthChecks.length) * 100
      : 100;
  }

  private calculateTrend(
    metric: string,
    currentValue: number,
  ):
    | 'improving'
    | 'stable'
    | 'degrading'
    | 'increasing'
    | 'decreasing'
    | 'worsening' {
    // This would compare with historical data
    // For now, return stable as placeholder
    return 'stable';
  }

  private mapHealthToStatus(health: string): 'online' | 'offline' | 'degraded' {
    switch (health) {
      case 'healthy':
        return 'online';
      case 'degraded':
        return 'degraded';
      case 'unhealthy':
      case 'critical':
      default:
        return 'offline';
    }
  }

  private calculateServiceUptime(serviceName: string): number {
    // Would calculate from historical health check data
    return 99.5; // Placeholder
  }

  private getPeriodDates(period: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    let startDate: Date;

    switch (period) {
      case 'hour':
        startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  private generateConversationTrends(
    analytics: ComprehensiveAnalytics,
  ): DashboardChartData['conversationTrends'] {
    // Group trends by date
    const trendMap = new Map<
      string,
      { conversations: number; messages: number; users: number }
    >();

    analytics.conversations.conversationTrends.forEach((trend) => {
      if (trend.type === 'created') {
        const existing = trendMap.get(trend.date) || {
          conversations: 0,
          messages: 0,
          users: 0,
        };
        existing.conversations = trend.count;
        trendMap.set(trend.date, existing);
      }
    });

    return Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  private generateResponseTimeChart(
    metrics: AIPerformanceMetrics,
  ): DashboardChartData['responseTimeChart'] {
    return metrics.performanceByHour.map((hour, index) => ({
      timestamp: new Date(
        Date.now() -
          (metrics.performanceByHour.length - index) * 60 * 60 * 1000,
      ).toISOString(),
      responseTime: hour.avgResponseTime,
      target: 5000, // 5 second target
    }));
  }

  private generateQualityChart(
    analytics: ComprehensiveAnalytics,
  ): DashboardChartData['qualityMetrics'] {
    // Generate daily quality metrics
    return [
      {
        date: new Date().toISOString().split('T')[0],
        confidence: analytics.quality.responseQuality.averageConfidence,
        satisfaction: analytics.quality.userSatisfaction.averageRating / 5, // Normalize to 0-1
        accuracy: analytics.quality.responseQuality.averageConfidence,
      },
    ];
  }

  private generateUsagePatterns(
    analytics: ComprehensiveAnalytics,
  ): DashboardChartData['usagePatterns'] {
    return analytics.usage.peakUsageTimes.map((peak) => ({
      hour: peak.hour,
      dayOfWeek: peak.dayOfWeek,
      usage: peak.usage,
      label: this.formatUsageLabel(peak.dayOfWeek, peak.hour),
    }));
  }

  private generateErrorDistribution(
    metrics: AIPerformanceMetrics,
  ): DashboardChartData['errorDistribution'] {
    const total = metrics.topErrors.reduce(
      (sum, error) => sum + error.count,
      0,
    );

    return metrics.topErrors.map((error) => ({
      category: error.error,
      count: error.count,
      percentage: total > 0 ? (error.count / total) * 100 : 0,
    }));
  }

  private async generateTopQuestions(
    startDate: Date,
    endDate: Date,
  ): Promise<DashboardChartData['topQuestions']> {
    // This would analyze message content to find common questions
    // For now, return placeholder data
    return [
      {
        question: 'How do I write a literature review?',
        count: 45,
        averageConfidence: 0.85,
        category: 'methodology',
      },
      {
        question: 'What is the project timeline?',
        count: 32,
        averageConfidence: 0.92,
        category: 'planning',
      },
    ];
  }

  private async getHealthHistory(
    startDate: Date,
    endDate: Date,
  ): Promise<HealthCheckResult[]> {
    // Would retrieve historical health check data
    return [];
  }

  private calculatePeriodUptime(healthHistory: HealthCheckResult[]): number {
    // Calculate uptime from health history
    return 99.8; // Placeholder
  }

  private generateTrendData(
    performanceData: Array<{
      hour: number;
      requests: number;
      avgResponseTime: number;
    }>,
    metric: 'requests' | 'avgResponseTime',
  ): Array<{ timestamp: string; value: number }> {
    return performanceData.map((data, index) => ({
      timestamp: new Date(
        Date.now() - (performanceData.length - index) * 60 * 60 * 1000,
      ).toISOString(),
      value: data[metric],
    }));
  }

  private generateErrorRateTrend(
    metrics: AIPerformanceMetrics,
  ): Array<{ timestamp: string; value: number }> {
    return metrics.performanceByHour.map((hour, index) => ({
      timestamp: new Date(
        Date.now() -
          (metrics.performanceByHour.length - index) * 60 * 60 * 1000,
      ).toISOString(),
      value: hour.requests > 0 ? 0.05 : 0, // Placeholder calculation
    }));
  }

  private generateSatisfactionTrend(
    analytics: ComprehensiveAnalytics,
  ): Array<{ timestamp: string; value: number }> {
    return [
      {
        timestamp: new Date().toISOString(),
        value: analytics.quality.userSatisfaction.averageRating / 5,
      },
    ];
  }

  private generatePerformanceInsights(
    analytics: ComprehensiveAnalytics,
    metrics: AIPerformanceMetrics,
  ): PerformanceReport['insights'] {
    const insights: PerformanceReport['insights'] = [];

    // Response time insight
    if (metrics.averageResponseTime > 10000) {
      insights.push({
        type: 'degradation',
        metric: 'Response Time',
        description: `Average response time of ${(metrics.averageResponseTime / 1000).toFixed(1)}s exceeds target of 10s`,
        impact: 'high',
        recommendations: [
          'Optimize AI API calls',
          'Implement response caching',
          'Consider load balancing',
        ],
      });
    }

    // User satisfaction insight
    if (analytics.quality.userSatisfaction.averageRating < 3.5) {
      insights.push({
        type: 'degradation',
        metric: 'User Satisfaction',
        description: `User satisfaction rating of ${analytics.quality.userSatisfaction.averageRating.toFixed(1)}/5 is below target`,
        impact: 'high',
        recommendations: [
          'Analyze user feedback patterns',
          'Improve response quality',
          'Enhance knowledge base content',
        ],
      });
    }

    return insights;
  }

  private generateAlertTrends(
    alerts: Alert[],
    startDate: Date,
    endDate: Date,
  ): AlertSummary['trends'] {
    const trends: AlertSummary['trends'] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);

      const dayAlerts = alerts.filter(
        (alert) => alert.timestamp >= dayStart && alert.timestamp < dayEnd,
      );

      const severityCounts = dayAlerts.reduce(
        (acc, alert) => {
          acc[alert.severity] = (acc[alert.severity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      Object.entries(severityCounts).forEach(([severity, count]) => {
        trends.push({
          date: currentDate.toISOString().split('T')[0],
          count,
          severity,
        });
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return trends;
  }

  private formatUsageLabel(dayOfWeek: number, hour: number): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[dayOfWeek]} ${hour}:00`;
  }

  private formatDuration(milliseconds: number): string {
    const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
    const hours = Math.floor(
      (milliseconds % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
    );

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return 'Less than 1 hour';
    }
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion
    const headers = ['Metric', 'Value', 'Timestamp'];
    const rows = [headers.join(',')];

    // Flatten the data structure for CSV export
    const flattenObject = (obj: any, prefix = ''): Array<[string, any]> => {
      const result: Array<[string, any]> = [];

      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          !(value instanceof Date)
        ) {
          result.push(...flattenObject(value, fullKey));
        } else {
          result.push([fullKey, value]);
        }
      }

      return result;
    };

    const flattened = flattenObject(data);
    flattened.forEach(([key, value]) => {
      const csvValue =
        typeof value === 'string' && value.includes(',')
          ? `"${value.replace(/"/g, '""')}"`
          : String(value);
      rows.push(`${key},${csvValue},${new Date().toISOString()}`);
    });

    return rows.join('\n');
  }

  private getFromCache(key: string, ttl: number): any {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.metricsCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Clean up old cache entries
    if (this.metricsCache.size > 100) {
      const oldestKey = Array.from(this.metricsCache.keys())[0];
      this.metricsCache.delete(oldestKey);
    }
  }
}
