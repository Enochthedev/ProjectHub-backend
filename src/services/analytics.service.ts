import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { PlatformAnalytics } from '../entities/platform-analytics.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { ProjectView } from '../entities/project-view.entity';
import { Milestone } from '../entities/milestone.entity';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { AnalyticsMetric } from '../common/enums/analytics-metric.enum';
import { AnalyticsPeriod } from '../common/enums/analytics-period.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { ApprovalStatus } from '../common/enums/approval-status.enum';
import { MilestoneStatus } from '../common/enums/milestone-status.enum';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface PlatformUsageMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userGrowthRate: number;
  totalProjects: number;
  approvedProjects: number;
  pendingProjects: number;
  projectApprovalRate: number;
  totalMilestones: number;
  completedMilestones: number;
  milestoneCompletionRate: number;
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  averageMessagesPerConversation: number;
}

export interface TrendAnalysis {
  metric: AnalyticsMetric;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  isSignificant: boolean;
}

export interface SystemHealthMetrics {
  uptime: number;
  averageResponseTime: number;
  errorRate: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  healthScore: number;
}

export interface PatternRecognition {
  pattern: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
  detectedAt: Date;
}

export interface ComprehensivePlatformAnalytics {
  period: DateRange;
  usage: PlatformUsageMetrics;
  trends: TrendAnalysis[];
  systemHealth: SystemHealthMetrics;
  patterns: PatternRecognition[];
  insights: Array<{
    type: 'trend' | 'anomaly' | 'recommendation' | 'alert';
    title: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    actionRequired: boolean;
  }>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(PlatformAnalytics)
    private readonly analyticsRepository: Repository<PlatformAnalytics>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectView)
    private readonly projectViewRepository: Repository<ProjectView>,
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly messageRepository: Repository<ConversationMessage>,
  ) {}

  /**
   * Generate comprehensive platform analytics for a given period
   */
  async generateComprehensiveAnalytics(
    dateRange: DateRange,
  ): Promise<ComprehensivePlatformAnalytics> {
    this.logger.log(
      `Generating comprehensive analytics from ${dateRange.startDate.toISOString()} to ${dateRange.endDate.toISOString()}`,
    );

    const [usage, trends, systemHealth, patterns] = await Promise.all([
      this.getPlatformUsageMetrics(dateRange),
      this.getTrendAnalysis(dateRange),
      this.getSystemHealthMetrics(),
      this.getPatternRecognition(dateRange),
    ]);

    const insights = this.generateInsights(
      usage,
      trends,
      systemHealth,
      patterns,
    );

    return {
      period: dateRange,
      usage,
      trends,
      systemHealth,
      patterns,
      insights,
    };
  }

  /**
   * Get platform usage metrics for a given period
   */
  async getPlatformUsageMetrics(
    dateRange: DateRange,
  ): Promise<PlatformUsageMetrics> {
    const { startDate, endDate } = dateRange;

    // Calculate previous period for comparison
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(startDate.getTime());

    const [
      totalUsers,
      activeUsers,
      newUsers,
      previousNewUsers,
      totalProjects,
      approvedProjects,
      pendingProjects,
      totalMilestones,
      completedMilestones,
      totalConversations,
      activeConversations,
      totalMessages,
    ] = await Promise.all([
      this.userRepository.count(),
      this.getActiveUsersCount(dateRange),
      this.userRepository.count({
        where: { createdAt: Between(startDate, endDate) },
      }),
      this.userRepository.count({
        where: { createdAt: Between(previousStartDate, previousEndDate) },
      }),
      this.projectRepository.count(),
      this.projectRepository.count({
        where: { approvalStatus: ApprovalStatus.APPROVED },
      }),
      this.projectRepository.count({
        where: { approvalStatus: ApprovalStatus.PENDING },
      }),
      this.milestoneRepository.count(),
      this.milestoneRepository.count({
        where: { status: MilestoneStatus.COMPLETED },
      }),
      this.conversationRepository.count(),
      this.conversationRepository.count({
        where: {
          updatedAt: MoreThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        },
      }),
      this.messageRepository.count(),
    ]);

    const userGrowthRate =
      previousNewUsers > 0
        ? ((newUsers - previousNewUsers) / previousNewUsers) * 100
        : 0;

    const projectApprovalRate =
      totalProjects > 0 ? (approvedProjects / totalProjects) * 100 : 0;

    const milestoneCompletionRate =
      totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

    const averageMessagesPerConversation =
      totalConversations > 0 ? totalMessages / totalConversations : 0;

    return {
      totalUsers,
      activeUsers,
      newUsers,
      userGrowthRate,
      totalProjects,
      approvedProjects,
      pendingProjects,
      projectApprovalRate,
      totalMilestones,
      completedMilestones,
      milestoneCompletionRate,
      totalConversations,
      activeConversations,
      totalMessages,
      averageMessagesPerConversation,
    };
  }

  /**
   * Get trend analysis for key metrics
   */
  async getTrendAnalysis(dateRange: DateRange): Promise<TrendAnalysis[]> {
    const trends: TrendAnalysis[] = [];
    const keyMetrics = [
      AnalyticsMetric.USER_REGISTRATIONS,
      AnalyticsMetric.USER_LOGINS,
      AnalyticsMetric.ACTIVE_USERS,
      AnalyticsMetric.PROJECT_SUBMISSIONS,
      AnalyticsMetric.PROJECT_APPROVALS,
      AnalyticsMetric.AI_QUERIES,
      AnalyticsMetric.MILESTONE_COMPLETIONS,
    ];

    for (const metric of keyMetrics) {
      const trend = await this.calculateTrendForMetric(metric, dateRange);
      if (trend) {
        trends.push(trend);
      }
    }

    return trends;
  }

  /**
   * Get system health metrics
   */
  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    // In a real implementation, these would come from monitoring systems
    // For now, we'll return mock data with realistic values
    const uptime = 99.9;
    const averageResponseTime = 150; // ms
    const errorRate = 0.1; // percentage
    const activeConnections = 250;
    const memoryUsage = 65; // percentage
    const cpuUsage = 45; // percentage
    const diskUsage = 70; // percentage

    // Calculate health score based on metrics
    const healthScore = this.calculateHealthScore({
      uptime,
      averageResponseTime,
      errorRate,
      memoryUsage,
      cpuUsage,
      diskUsage,
    });

    return {
      uptime,
      averageResponseTime,
      errorRate,
      activeConnections,
      memoryUsage,
      cpuUsage,
      diskUsage,
      healthScore,
    };
  }

  /**
   * Get pattern recognition insights
   */
  async getPatternRecognition(
    dateRange: DateRange,
  ): Promise<PatternRecognition[]> {
    const patterns: PatternRecognition[] = [];

    // Analyze user registration patterns
    const registrationPattern =
      await this.analyzeRegistrationPatterns(dateRange);
    if (registrationPattern) {
      patterns.push(registrationPattern);
    }

    // Analyze project submission patterns
    const submissionPattern = await this.analyzeSubmissionPatterns(dateRange);
    if (submissionPattern) {
      patterns.push(submissionPattern);
    }

    // Analyze usage patterns
    const usagePattern = await this.analyzeUsagePatterns(dateRange);
    if (usagePattern) {
      patterns.push(usagePattern);
    }

    return patterns;
  }

  /**
   * Record a metric value
   */
  async recordMetric(
    metric: AnalyticsMetric,
    value: number,
    date: Date = new Date(),
    period: AnalyticsPeriod = AnalyticsPeriod.DAILY,
    metadata?: Record<string, any>,
  ): Promise<PlatformAnalytics> {
    // Check if metric already exists for this date and period
    const existing = await this.analyticsRepository.findOne({
      where: {
        metric,
        date: new Date(date.toDateString()),
        period,
      },
    });

    if (existing) {
      // Update existing metric
      existing.previousValue = existing.value;
      existing.value = value;
      existing.updateChangePercent();
      if (metadata) {
        existing.metadata = { ...existing.metadata, ...metadata };
      }
      return this.analyticsRepository.save(existing);
    } else {
      // Create new metric
      const analytics = new PlatformAnalytics();
      analytics.metric = metric;
      analytics.value = value;
      analytics.date = new Date(date.toDateString());
      analytics.period = period;
      analytics.metadata = metadata || null;
      analytics.category = analytics.getMetricCategory();

      return this.analyticsRepository.save(analytics);
    }
  }

  /**
   * Get metrics for a specific period
   */
  async getMetrics(
    metric: AnalyticsMetric,
    dateRange: DateRange,
    period: AnalyticsPeriod = AnalyticsPeriod.DAILY,
  ): Promise<PlatformAnalytics[]> {
    return this.analyticsRepository.find({
      where: {
        metric,
        date: Between(dateRange.startDate, dateRange.endDate),
        period,
      },
      order: { date: 'ASC' },
    });
  }

  /**
   * Get aggregated metrics
   */
  async getAggregatedMetrics(
    metrics: AnalyticsMetric[],
    dateRange: DateRange,
    aggregationType: 'sum' | 'avg' | 'max' | 'min' = 'sum',
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    for (const metric of metrics) {
      const data = await this.getMetrics(metric, dateRange);

      if (data.length === 0) {
        result[metric] = 0;
        continue;
      }

      const values = data.map((d) => Number(d.value));

      switch (aggregationType) {
        case 'sum':
          result[metric] = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'avg':
          result[metric] =
            values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'max':
          result[metric] = Math.max(...values);
          break;
        case 'min':
          result[metric] = Math.min(...values);
          break;
      }
    }

    return result;
  }

  /**
   * Calculate daily metrics and store them
   */
  async calculateAndStoreDailyMetrics(date: Date = new Date()): Promise<void> {
    this.logger.log(`Calculating daily metrics for ${date.toDateString()}`);

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const dateRange = { startDate: startOfDay, endDate: endOfDay };

    // Calculate and store various metrics
    await Promise.all([
      this.calculateUserMetrics(dateRange),
      this.calculateProjectMetrics(dateRange),
      this.calculateMilestoneMetrics(dateRange),
      this.calculateAIMetrics(dateRange),
      this.calculateSystemMetrics(dateRange),
    ]);

    this.logger.log(
      `Daily metrics calculation completed for ${date.toDateString()}`,
    );
  }

  // Private helper methods

  private async getActiveUsersCount(dateRange: DateRange): Promise<number> {
    // Users who have logged in or performed any action in the date range
    const activeUserIds = await this.userRepository
      .createQueryBuilder('user')
      .select('DISTINCT user.id')
      .leftJoin('user.projects', 'project')
      .leftJoin('user.conversations', 'conversation')
      .leftJoin('user.milestones', 'milestone')
      .where('user.updatedAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .orWhere('project.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .orWhere('conversation.createdAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .orWhere('milestone.updatedAt BETWEEN :start AND :end', {
        start: dateRange.startDate,
        end: dateRange.endDate,
      })
      .getRawMany();

    return activeUserIds.length;
  }

  private async calculateTrendForMetric(
    metric: AnalyticsMetric,
    dateRange: DateRange,
  ): Promise<TrendAnalysis | null> {
    const periodDuration =
      dateRange.endDate.getTime() - dateRange.startDate.getTime();
    const previousStartDate = new Date(
      dateRange.startDate.getTime() - periodDuration,
    );
    const previousEndDate = new Date(dateRange.startDate.getTime());

    const [currentData, previousData] = await Promise.all([
      this.getMetrics(metric, dateRange),
      this.getMetrics(metric, {
        startDate: previousStartDate,
        endDate: previousEndDate,
      }),
    ]);

    if (currentData.length === 0 && previousData.length === 0) {
      return null;
    }

    const currentValue = currentData.reduce(
      (sum, d) => sum + Number(d.value),
      0,
    );
    const previousValue = previousData.reduce(
      (sum, d) => sum + Number(d.value),
      0,
    );

    const changePercent =
      previousValue > 0
        ? ((currentValue - previousValue) / previousValue) * 100
        : 0;

    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(changePercent) < 5) {
      trend = 'stable';
    } else if (changePercent > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    const isSignificant = Math.abs(changePercent) > 10;

    return {
      metric,
      currentValue,
      previousValue,
      changePercent,
      trend,
      isSignificant,
    };
  }

  private calculateHealthScore(metrics: {
    uptime: number;
    averageResponseTime: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
  }): number {
    const weights = {
      uptime: 0.3,
      responseTime: 0.2,
      errorRate: 0.2,
      memory: 0.1,
      cpu: 0.1,
      disk: 0.1,
    };

    const scores = {
      uptime: Math.min(metrics.uptime, 100),
      responseTime: Math.max(0, 100 - metrics.averageResponseTime / 10),
      errorRate: Math.max(0, 100 - metrics.errorRate * 10),
      memory: Math.max(0, 100 - metrics.memoryUsage),
      cpu: Math.max(0, 100 - metrics.cpuUsage),
      disk: Math.max(0, 100 - metrics.diskUsage),
    };

    const healthScore =
      scores.uptime * weights.uptime +
      scores.responseTime * weights.responseTime +
      scores.errorRate * weights.errorRate +
      scores.memory * weights.memory +
      scores.cpu * weights.cpu +
      scores.disk * weights.disk;

    return Math.round(healthScore * 100) / 100;
  }

  private async analyzeRegistrationPatterns(
    dateRange: DateRange,
  ): Promise<PatternRecognition | null> {
    const registrations = await this.userRepository.find({
      where: { createdAt: Between(dateRange.startDate, dateRange.endDate) },
      select: ['createdAt', 'role'],
    });

    if (registrations.length < 10) {
      return null;
    }

    // Analyze registration patterns by day of week
    const dayPatterns = new Array(7).fill(0);
    registrations.forEach((reg) => {
      const dayOfWeek = reg.createdAt.getDay();
      dayPatterns[dayOfWeek]++;
    });

    const maxDay = dayPatterns.indexOf(Math.max(...dayPatterns));
    const minDay = dayPatterns.indexOf(Math.min(...dayPatterns));
    const variance = this.calculateVariance(dayPatterns);

    if (variance > 5) {
      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      return {
        pattern: 'registration_day_pattern',
        description: `Peak registrations occur on ${dayNames[maxDay]}, lowest on ${dayNames[minDay]}`,
        confidence: Math.min(0.9, variance / 10),
        impact: variance > 10 ? 'high' : 'medium',
        recommendation: `Consider targeted marketing campaigns on ${dayNames[maxDay]}s`,
        detectedAt: new Date(),
      };
    }

    return null;
  }

  private async analyzeSubmissionPatterns(
    dateRange: DateRange,
  ): Promise<PatternRecognition | null> {
    const submissions = await this.projectRepository.find({
      where: { createdAt: Between(dateRange.startDate, dateRange.endDate) },
      select: ['createdAt', 'specialization'],
    });

    if (submissions.length < 5) {
      return null;
    }

    // Analyze submission patterns by specialization
    const specializationCounts: Record<string, number> = {};
    submissions.forEach((sub) => {
      specializationCounts[sub.specialization] =
        (specializationCounts[sub.specialization] || 0) + 1;
    });

    const sortedSpecs = Object.entries(specializationCounts).sort(
      ([, a], [, b]) => b - a,
    );

    if (sortedSpecs.length > 1 && sortedSpecs[0][1] > sortedSpecs[1][1] * 2) {
      return {
        pattern: 'specialization_dominance',
        description: `${sortedSpecs[0][0]} dominates project submissions (${sortedSpecs[0][1]} projects)`,
        confidence: 0.8,
        impact: 'medium',
        recommendation:
          'Consider promoting other specializations to balance submissions',
        detectedAt: new Date(),
      };
    }

    return null;
  }

  private async analyzeUsagePatterns(
    dateRange: DateRange,
  ): Promise<PatternRecognition | null> {
    const views = await this.projectViewRepository.find({
      where: { viewedAt: Between(dateRange.startDate, dateRange.endDate) },
      select: ['viewedAt'],
    });

    if (views.length < 20) {
      return null;
    }

    // Analyze usage patterns by hour
    const hourPatterns = new Array(24).fill(0);
    views.forEach((view) => {
      const hour = view.viewedAt.getHours();
      hourPatterns[hour]++;
    });

    const peakHour = hourPatterns.indexOf(Math.max(...hourPatterns));
    const lowHour = hourPatterns.indexOf(Math.min(...hourPatterns));

    if (hourPatterns[peakHour] > hourPatterns[lowHour] * 3) {
      return {
        pattern: 'usage_time_pattern',
        description: `Peak usage at ${peakHour}:00, lowest at ${lowHour}:00`,
        confidence: 0.7,
        impact: 'low',
        recommendation: `Schedule maintenance during ${lowHour}:00-${(lowHour + 2) % 24}:00`,
        detectedAt: new Date(),
      };
    }

    return null;
  }

  private generateInsights(
    usage: PlatformUsageMetrics,
    trends: TrendAnalysis[],
    systemHealth: SystemHealthMetrics,
    patterns: PatternRecognition[],
  ): Array<{
    type: 'trend' | 'anomaly' | 'recommendation' | 'alert';
    title: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    actionRequired: boolean;
  }> {
    const insights: Array<{
      type: 'trend' | 'anomaly' | 'recommendation' | 'alert';
      title: string;
      description: string;
      severity: 'high' | 'medium' | 'low';
      actionRequired: boolean;
    }> = [];

    // System health insights
    if (systemHealth.healthScore < 70) {
      insights.push({
        type: 'alert' as const,
        title: 'System Health Alert',
        description: `System health score is ${systemHealth.healthScore}%. Immediate attention required.`,
        severity: 'high' as const,
        actionRequired: true,
      });
    }

    // User growth insights
    if (usage.userGrowthRate > 20) {
      insights.push({
        type: 'trend' as const,
        title: 'Strong User Growth',
        description: `User registrations increased by ${usage.userGrowthRate.toFixed(1)}% this period.`,
        severity: 'low' as const,
        actionRequired: false,
      });
    } else if (usage.userGrowthRate < -10) {
      insights.push({
        type: 'alert' as const,
        title: 'Declining User Growth',
        description: `User registrations decreased by ${Math.abs(usage.userGrowthRate).toFixed(1)}% this period.`,
        severity: 'medium' as const,
        actionRequired: true,
      });
    }

    // Project approval insights
    if (usage.projectApprovalRate < 60) {
      insights.push({
        type: 'recommendation' as const,
        title: 'Low Project Approval Rate',
        description: `Only ${usage.projectApprovalRate.toFixed(1)}% of projects are approved. Consider reviewing approval criteria.`,
        severity: 'medium' as const,
        actionRequired: true,
      });
    }

    // Milestone completion insights
    if (usage.milestoneCompletionRate < 70) {
      insights.push({
        type: 'recommendation' as const,
        title: 'Low Milestone Completion',
        description: `Milestone completion rate is ${usage.milestoneCompletionRate.toFixed(1)}%. Students may need additional support.`,
        severity: 'medium' as const,
        actionRequired: true,
      });
    }

    // Pattern-based insights
    patterns.forEach((pattern) => {
      if (pattern.impact === 'high') {
        insights.push({
          type: 'anomaly' as const,
          title: `Pattern Detected: ${pattern.pattern}`,
          description: pattern.description,
          severity: 'medium' as const,
          actionRequired: true,
        });
      }
    });

    // Trend-based insights
    trends.forEach((trend) => {
      if (trend.isSignificant && trend.trend === 'down') {
        insights.push({
          type: 'alert' as const,
          title: `Declining Trend: ${trend.metric}`,
          description: `${trend.metric} decreased by ${Math.abs(trend.changePercent).toFixed(1)}%`,
          severity: 'medium' as const,
          actionRequired: true,
        });
      }
    });

    return insights;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private async calculateUserMetrics(dateRange: DateRange): Promise<void> {
    const newUsers = await this.userRepository.count({
      where: { createdAt: Between(dateRange.startDate, dateRange.endDate) },
    });

    const activeUsers = await this.getActiveUsersCount(dateRange);

    // Since lastLoginAt doesn't exist, we'll use updatedAt as a proxy
    const logins = await this.userRepository.count({
      where: { updatedAt: Between(dateRange.startDate, dateRange.endDate) },
    });

    await Promise.all([
      this.recordMetric(
        AnalyticsMetric.USER_REGISTRATIONS,
        newUsers,
        dateRange.startDate,
      ),
      this.recordMetric(
        AnalyticsMetric.ACTIVE_USERS,
        activeUsers,
        dateRange.startDate,
      ),
      this.recordMetric(
        AnalyticsMetric.USER_LOGINS,
        logins,
        dateRange.startDate,
      ),
    ]);
  }

  private async calculateProjectMetrics(dateRange: DateRange): Promise<void> {
    const submissions = await this.projectRepository.count({
      where: { createdAt: Between(dateRange.startDate, dateRange.endDate) },
    });

    const approvals = await this.projectRepository.count({
      where: {
        approvalStatus: ApprovalStatus.APPROVED,
        updatedAt: Between(dateRange.startDate, dateRange.endDate),
      },
    });

    const views = await this.projectViewRepository.count({
      where: { viewedAt: Between(dateRange.startDate, dateRange.endDate) },
    });

    await Promise.all([
      this.recordMetric(
        AnalyticsMetric.PROJECT_SUBMISSIONS,
        submissions,
        dateRange.startDate,
      ),
      this.recordMetric(
        AnalyticsMetric.PROJECT_APPROVALS,
        approvals,
        dateRange.startDate,
      ),
      this.recordMetric(
        AnalyticsMetric.PROJECT_VIEWS,
        views,
        dateRange.startDate,
      ),
    ]);
  }

  private async calculateMilestoneMetrics(dateRange: DateRange): Promise<void> {
    const completions = await this.milestoneRepository.count({
      where: {
        status: MilestoneStatus.COMPLETED,
        updatedAt: Between(dateRange.startDate, dateRange.endDate),
      },
    });

    await this.recordMetric(
      AnalyticsMetric.MILESTONE_COMPLETIONS,
      completions,
      dateRange.startDate,
    );
  }

  private async calculateAIMetrics(dateRange: DateRange): Promise<void> {
    const queries = await this.messageRepository.count({
      where: { createdAt: Between(dateRange.startDate, dateRange.endDate) },
    });

    await this.recordMetric(
      AnalyticsMetric.AI_QUERIES,
      queries,
      dateRange.startDate,
    );
  }

  private async calculateSystemMetrics(dateRange: DateRange): Promise<void> {
    // These would typically come from monitoring systems
    // For now, we'll record mock values
    await Promise.all([
      this.recordMetric(
        AnalyticsMetric.SYSTEM_UPTIME,
        99.9,
        dateRange.startDate,
      ),
      this.recordMetric(
        AnalyticsMetric.API_RESPONSE_TIME,
        150,
        dateRange.startDate,
      ),
      this.recordMetric(AnalyticsMetric.ERROR_RATE, 0.1, dateRange.startDate),
    ]);
  }
}
