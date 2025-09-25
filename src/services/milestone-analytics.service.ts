import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Milestone } from '../entities/milestone.entity';
import { MilestoneTemplate } from '../entities/milestone-template.entity';
import { User } from '../entities/user.entity';
import { MilestoneStatus, Priority } from '../common/enums';
import {
  CompletionVelocityDto,
  TrendAnalysisDto,
  CriticalPathAnalysisDto,
  ProgressComparisonDto,
  TemplateBenchmarkDto,
  AnalyticsMetricsDto,
  VelocityTrendDto,
  ProgressPredictionDto,
  MilestoneAnalyticsDto,
} from '../dto/milestone/analytics.dto';
import { MilestoneCacheService } from './milestone-cache.service';

export interface MilestoneAnalyticsServiceInterface {
  calculateCompletionVelocity(
    studentId: string,
    periodDays?: number,
  ): Promise<CompletionVelocityDto>;
  analyzeTrends(
    studentId: string,
    periodDays?: number,
  ): Promise<TrendAnalysisDto>;
  performCriticalPathAnalysis(
    studentId: string,
  ): Promise<CriticalPathAnalysisDto>;
  compareProgressWithTemplate(
    studentId: string,
    templateId?: string,
  ): Promise<ProgressComparisonDto>;
  generateAnalyticsMetrics(studentId: string): Promise<AnalyticsMetricsDto>;
}

@Injectable()
export class MilestoneAnalyticsService
  implements MilestoneAnalyticsServiceInterface
{
  private readonly logger = new Logger(MilestoneAnalyticsService.name);

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(MilestoneTemplate)
    private readonly templateRepository: Repository<MilestoneTemplate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: MilestoneCacheService,
  ) {}

  async calculateCompletionVelocity(
    studentId: string,
    periodDays: number = 90,
  ): Promise<CompletionVelocityDto> {
    this.logger.log(
      `Calculating completion velocity for student ${studentId} over ${periodDays} days`,
    );

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const milestones = await this.milestoneRepository.find({
      where: {
        studentId,
      },
      order: { completedAt: 'ASC' },
    });

    const completedMilestones = milestones.filter(
      (m) =>
        m.status === MilestoneStatus.COMPLETED &&
        m.completedAt &&
        m.completedAt >= startDate &&
        m.completedAt <= endDate,
    );

    // Calculate velocity metrics
    const totalCompleted = completedMilestones.length;
    const totalMilestones = milestones.length;
    const completionRate =
      totalMilestones > 0 ? (totalCompleted / totalMilestones) * 100 : 0;

    // Calculate weekly velocity
    const weeklyVelocity = this.calculateWeeklyVelocity(
      completedMilestones,
      periodDays,
    );

    // Calculate average completion time
    const avgCompletionTime =
      this.calculateAverageCompletionTime(completedMilestones);

    // Generate velocity trend
    const velocityTrend = this.generateVelocityTrend(
      completedMilestones,
      periodDays,
    );

    // Predict future completion
    const prediction = this.predictFutureCompletion(milestones, weeklyVelocity);

    return {
      periodDays,
      totalMilestones,
      completedMilestones: totalCompleted,
      completionRate: Math.round(completionRate * 100) / 100,
      weeklyVelocity: Math.round(weeklyVelocity * 100) / 100,
      averageCompletionTime: Math.round(avgCompletionTime * 100) / 100,
      velocityTrend,
      prediction,
      lastUpdated: new Date().toISOString(),
    };
  }

  async analyzeTrends(
    studentId: string,
    periodDays: number = 90,
  ): Promise<TrendAnalysisDto> {
    this.logger.log(
      `Analyzing trends for student ${studentId} over ${periodDays} days`,
    );

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const milestones = await this.milestoneRepository.find({
      where: {
        studentId,
      },
      relations: ['notes'],
      order: { createdAt: 'ASC' },
    });

    // Analyze completion trends
    const completionTrend = this.analyzeCompletionTrend(milestones, periodDays);

    // Analyze workload trends
    const workloadTrend = this.analyzeWorkloadTrend(milestones, periodDays);

    // Analyze quality trends (based on notes and completion time)
    const qualityTrend = this.analyzeQualityTrend(milestones, periodDays);

    // Analyze priority distribution trends
    const priorityTrend = this.analyzePriorityTrend(milestones, periodDays);

    // Calculate trend indicators
    const trendIndicators = this.calculateTrendIndicators(
      milestones,
      periodDays,
    );

    return {
      periodDays,
      completionTrend,
      workloadTrend,
      qualityTrend,
      priorityTrend,
      trendIndicators,
      insights: this.generateTrendInsights(trendIndicators),
      lastUpdated: new Date().toISOString(),
    };
  }

  async performCriticalPathAnalysis(
    studentId: string,
  ): Promise<CriticalPathAnalysisDto> {
    this.logger.log(
      `Performing critical path analysis for student ${studentId}`,
    );

    const milestones = await this.milestoneRepository.find({
      where: [
        { studentId, status: MilestoneStatus.NOT_STARTED },
        { studentId, status: MilestoneStatus.IN_PROGRESS },
        { studentId, status: MilestoneStatus.BLOCKED },
      ],
      order: { dueDate: 'ASC' },
    });

    // Identify critical milestones (high priority, blocking others, or overdue)
    const criticalMilestones = this.identifyCriticalMilestones(milestones);

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(milestones);

    // Analyze bottlenecks
    const bottlenecks = this.identifyBottlenecks(milestones);

    // Calculate risk factors
    const riskFactors = this.calculateRiskFactors(milestones);

    // Generate recommendations
    const recommendations = this.generateCriticalPathRecommendations(
      criticalMilestones,
      bottlenecks,
      riskFactors,
    );

    return {
      criticalMilestones: criticalMilestones.map((m) => ({
        id: m.id,
        title: m.title,
        dueDate: m.dueDate.toISOString().split('T')[0],
        priority: m.priority,
        status: m.status,
        estimatedHours: m.estimatedHours,
        isOverdue: m.isOverdue(),
        riskLevel: this.calculateMilestoneRiskLevel(m),
        dependencies: [], // Would be calculated based on actual dependency relationships
      })),
      criticalPath,
      bottlenecks,
      riskFactors,
      recommendations,
      totalCriticalHours: criticalMilestones.reduce(
        (sum, m) => sum + m.estimatedHours,
        0,
      ),
      estimatedCompletionDate:
        this.estimateCriticalPathCompletion(criticalPath),
      lastUpdated: new Date().toISOString(),
    };
  }

  async compareProgressWithTemplate(
    studentId: string,
    templateId?: string,
  ): Promise<ProgressComparisonDto> {
    this.logger.log(
      `Comparing progress with template for student ${studentId}`,
    );

    const milestones = await this.milestoneRepository.find({
      where: { studentId },
      order: { dueDate: 'ASC' },
    });

    let template: MilestoneTemplate | null = null;

    if (templateId) {
      template = await this.templateRepository.findOne({
        where: { id: templateId },
      });
    } else {
      // Find the most commonly used template for similar projects
      template = await this.findMostSuitableTemplate(milestones);
    }

    if (!template) {
      throw new Error('No suitable template found for comparison');
    }

    // Calculate current progress metrics
    const currentProgress = this.calculateCurrentProgress(milestones);

    // Calculate expected progress based on template
    const expectedProgress = this.calculateExpectedProgress(
      template,
      milestones,
    );

    // Compare metrics
    const comparison = this.compareProgressMetrics(
      currentProgress,
      expectedProgress,
    );

    // Generate benchmark analysis
    const benchmark = await this.generateTemplateBenchmark(
      template,
      milestones,
    );

    return {
      templateId: template.id,
      templateName: template.name,
      currentProgress,
      expectedProgress,
      comparison,
      benchmark,
      deviations: this.identifyProgressDeviations(comparison),
      recommendations: this.generateProgressRecommendations(comparison),
      lastUpdated: new Date().toISOString(),
    };
  }

  async generateAnalyticsMetrics(
    studentId: string,
  ): Promise<AnalyticsMetricsDto> {
    this.logger.log(
      `Generating comprehensive analytics metrics for student ${studentId}`,
    );

    // Try to get cached analytics first
    const cachedAnalytics =
      await this.cacheService.getCachedAnalytics(studentId);
    if (cachedAnalytics) {
      this.logger.debug(`Returning cached analytics for student ${studentId}`);
      return cachedAnalytics as unknown as AnalyticsMetricsDto;
    }

    const [velocity, trends, criticalPath, comparison] = await Promise.all([
      this.calculateCompletionVelocity(studentId),
      this.analyzeTrends(studentId),
      this.performCriticalPathAnalysis(studentId),
      this.compareProgressWithTemplate(studentId).catch(() => null), // Optional, may fail if no template
    ]);

    const milestones = await this.milestoneRepository.find({
      where: { studentId },
      relations: ['notes'],
    });

    // Calculate overall performance score
    const performanceScore = this.calculatePerformanceScore(
      velocity,
      trends,
      criticalPath,
    );

    // Generate key insights
    const keyInsights = this.generateKeyInsights(
      velocity,
      trends,
      criticalPath,
      comparison,
    );

    // Calculate productivity metrics
    const productivityMetrics = this.calculateProductivityMetrics(milestones);

    const analyticsResult = {
      studentId,
      velocity,
      trends,
      criticalPath,
      comparison,
      performanceScore,
      productivityMetrics,
      keyInsights,
      generatedAt: new Date().toISOString(),
    };

    // Cache the analytics result
    await this.cacheService.setCachedAnalytics(
      studentId,
      analyticsResult as any,
    );

    return analyticsResult;
  }

  // Private helper methods

  private calculateWeeklyVelocity(
    completedMilestones: Milestone[],
    periodDays: number,
  ): number {
    if (completedMilestones.length === 0) return 0;

    const weeks = periodDays / 7;
    return completedMilestones.length / weeks;
  }

  private calculateAverageCompletionTime(
    completedMilestones: Milestone[],
  ): number {
    if (completedMilestones.length === 0) return 0;

    const completionTimes = completedMilestones
      .filter((m) => m.completedAt && m.createdAt)
      .map((m) => {
        const created = new Date(m.createdAt).getTime();
        const completed = new Date(m.completedAt!).getTime();
        return (completed - created) / (1000 * 60 * 60 * 24); // days
      });

    return completionTimes.length > 0
      ? completionTimes.reduce((sum, time) => sum + time, 0) /
          completionTimes.length
      : 0;
  }

  private generateVelocityTrend(
    completedMilestones: Milestone[],
    periodDays: number,
  ): VelocityTrendDto[] {
    const trend: VelocityTrendDto[] = [];
    const weeks = Math.ceil(periodDays / 7);
    const endDate = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      const weekEnd = new Date(endDate);
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      const weeklyCompletions = completedMilestones.filter((m) => {
        const completedAt = new Date(m.completedAt!);
        return completedAt >= weekStart && completedAt <= weekEnd;
      }).length;

      trend.push({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        completedMilestones: weeklyCompletions,
        velocity: weeklyCompletions,
      });
    }

    return trend;
  }

  private predictFutureCompletion(
    milestones: Milestone[],
    weeklyVelocity: number,
  ): ProgressPredictionDto {
    const incompleteMilestones = milestones.filter(
      (m) =>
        m.status !== MilestoneStatus.COMPLETED &&
        m.status !== MilestoneStatus.CANCELLED,
    ).length;

    if (weeklyVelocity === 0) {
      return {
        estimatedWeeksToCompletion: null,
        estimatedCompletionDate: null,
        confidence: 'low',
        assumptions: ['No historical velocity data available'],
      };
    }

    const weeksToCompletion = incompleteMilestones / weeklyVelocity;
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + weeksToCompletion * 7);

    const confidence = this.calculatePredictionConfidence(
      milestones,
      weeklyVelocity,
    );

    return {
      estimatedWeeksToCompletion: Math.round(weeksToCompletion * 100) / 100,
      estimatedCompletionDate: completionDate.toISOString().split('T')[0],
      confidence,
      assumptions: [
        'Current velocity remains constant',
        'No major blockers or scope changes',
        'Based on historical completion patterns',
      ],
    };
  }

  private analyzeCompletionTrend(
    milestones: Milestone[],
    periodDays: number,
  ): any {
    const completedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED,
    );
    const totalMilestones = milestones.length;

    return {
      totalMilestones,
      completedMilestones: completedMilestones.length,
      completionRate:
        totalMilestones > 0
          ? (completedMilestones.length / totalMilestones) * 100
          : 0,
      trend: 'stable', // Would be calculated based on historical data
    };
  }

  private analyzeWorkloadTrend(
    milestones: Milestone[],
    periodDays: number,
  ): any {
    const totalEstimatedHours = milestones.reduce(
      (sum, m) => sum + m.estimatedHours,
      0,
    );
    const totalActualHours = milestones.reduce(
      (sum, m) => sum + m.actualHours,
      0,
    );

    return {
      totalEstimatedHours,
      totalActualHours,
      efficiencyRatio:
        totalEstimatedHours > 0 ? totalActualHours / totalEstimatedHours : 0,
      trend: 'improving', // Would be calculated based on historical data
    };
  }

  private analyzeQualityTrend(
    milestones: Milestone[],
    periodDays: number,
  ): any {
    const milestonesWithNotes = milestones.filter(
      (m) => m.notes && m.notes.length > 0,
    );
    const avgNotesPerMilestone =
      milestones.length > 0
        ? milestonesWithNotes.length / milestones.length
        : 0;

    return {
      avgNotesPerMilestone,
      documentationScore: avgNotesPerMilestone * 20, // Simple scoring
      trend: 'stable',
    };
  }

  private analyzePriorityTrend(
    milestones: Milestone[],
    periodDays: number,
  ): any {
    const priorityDistribution = {
      [Priority.LOW]: milestones.filter((m) => m.priority === Priority.LOW)
        .length,
      [Priority.MEDIUM]: milestones.filter(
        (m) => m.priority === Priority.MEDIUM,
      ).length,
      [Priority.HIGH]: milestones.filter((m) => m.priority === Priority.HIGH)
        .length,
      [Priority.CRITICAL]: milestones.filter(
        (m) => m.priority === Priority.CRITICAL,
      ).length,
    };

    return {
      distribution: priorityDistribution,
      highPriorityRatio:
        milestones.length > 0
          ? (priorityDistribution[Priority.HIGH] +
              priorityDistribution[Priority.CRITICAL]) /
            milestones.length
          : 0,
      trend: 'stable',
    };
  }

  private calculateTrendIndicators(
    milestones: Milestone[],
    periodDays: number,
  ): any {
    const completedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED,
    );
    const overdueMilestones = milestones.filter((m) => m.isOverdue());

    return {
      completionTrend: completedMilestones.length > 0 ? 'positive' : 'neutral',
      qualityTrend: 'stable',
      velocityTrend: 'stable',
      riskTrend: overdueMilestones.length > 0 ? 'increasing' : 'stable',
    };
  }

  private generateTrendInsights(trendIndicators: any): string[] {
    const insights: string[] = [];

    if (trendIndicators.completionTrend === 'positive') {
      insights.push('Milestone completion rate is trending positively');
    }

    if (trendIndicators.riskTrend === 'increasing') {
      insights.push(
        'Risk factors are increasing - consider reviewing overdue milestones',
      );
    }

    return insights;
  }

  private identifyCriticalMilestones(milestones: Milestone[]): Milestone[] {
    return milestones.filter(
      (m) =>
        m.priority === Priority.HIGH ||
        m.priority === Priority.CRITICAL ||
        m.isOverdue() ||
        m.status === MilestoneStatus.BLOCKED,
    );
  }

  private calculateCriticalPath(milestones: Milestone[]): string[] {
    // Simplified critical path - in reality would use proper CPM algorithm
    return milestones
      .filter((m) => m.priority === Priority.CRITICAL)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .map((m) => m.id);
  }

  private identifyBottlenecks(milestones: Milestone[]): any[] {
    const blockedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.BLOCKED,
    );

    return blockedMilestones.map((m) => ({
      milestoneId: m.id,
      title: m.title,
      blockingReason: m.blockingReason,
      daysBlocked: m.updatedAt
        ? Math.floor(
            (Date.now() - m.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
          )
        : 0,
    }));
  }

  private calculateRiskFactors(milestones: Milestone[]): any {
    const overdueMilestones = milestones.filter((m) => m.isOverdue()).length;
    const blockedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.BLOCKED,
    ).length;
    const highPriorityMilestones = milestones.filter(
      (m) => m.priority === Priority.HIGH || m.priority === Priority.CRITICAL,
    ).length;

    return {
      overdueMilestones,
      blockedMilestones,
      highPriorityMilestones,
      riskScore:
        (overdueMilestones * 3 +
          blockedMilestones * 2 +
          highPriorityMilestones * 1) /
        milestones.length,
    };
  }

  private generateCriticalPathRecommendations(
    criticalMilestones: Milestone[],
    bottlenecks: any[],
    riskFactors: any,
  ): string[] {
    const recommendations: string[] = [];

    if (criticalMilestones.length > 0) {
      recommendations.push(
        'Focus on completing critical priority milestones first',
      );
    }

    if (bottlenecks.length > 0) {
      recommendations.push(
        'Address blocked milestones to prevent project delays',
      );
    }

    if (riskFactors.riskScore > 0.5) {
      recommendations.push(
        'Consider revising project timeline due to high risk factors',
      );
    }

    return recommendations;
  }

  private calculateMilestoneRiskLevel(
    milestone: Milestone,
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;

    if (milestone.isOverdue()) riskScore += 3;
    if (milestone.status === MilestoneStatus.BLOCKED) riskScore += 2;
    if (milestone.priority === Priority.CRITICAL) riskScore += 2;
    if (milestone.priority === Priority.HIGH) riskScore += 1;

    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  private estimateCriticalPathCompletion(
    criticalPath: string[],
  ): string | null {
    // Simplified estimation - would use proper scheduling algorithms
    const estimatedDays = criticalPath.length * 14; // Assume 2 weeks per milestone
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + estimatedDays);

    return completionDate.toISOString().split('T')[0];
  }

  private async findMostSuitableTemplate(
    milestones: Milestone[],
  ): Promise<MilestoneTemplate | null> {
    // Find template based on project characteristics
    const templates = await this.templateRepository.find({
      where: { isActive: true },
      order: { usageCount: 'DESC' },
    });

    return templates[0] || null; // Return most used template for now
  }

  private calculateCurrentProgress(milestones: Milestone[]): any {
    const completedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED,
    ).length;
    const totalMilestones = milestones.length;

    return {
      completedMilestones,
      totalMilestones,
      completionRate:
        totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0,
      averageCompletionTime: this.calculateAverageCompletionTime(
        milestones.filter((m) => m.status === MilestoneStatus.COMPLETED),
      ),
    };
  }

  private calculateExpectedProgress(
    template: MilestoneTemplate,
    milestones: Milestone[],
  ): any {
    // Calculate expected progress based on template timeline
    const templateMilestones = template.milestoneItems || [];
    const expectedCompletionRate = 70; // Example expected rate

    return {
      expectedMilestones: templateMilestones.length,
      expectedCompletionRate,
      expectedDuration: template.estimatedDurationWeeks,
    };
  }

  private compareProgressMetrics(current: any, expected: any): any {
    return {
      completionRateDifference:
        current.completionRate - expected.expectedCompletionRate,
      milestoneDifference:
        current.totalMilestones - expected.expectedMilestones,
      performanceRatio:
        expected.expectedCompletionRate > 0
          ? current.completionRate / expected.expectedCompletionRate
          : 0,
    };
  }

  private async generateTemplateBenchmark(
    template: MilestoneTemplate,
    milestones: Milestone[],
  ): Promise<TemplateBenchmarkDto> {
    return {
      templateId: template.id,
      templateName: template.name,
      benchmarkScore: 75, // Would be calculated based on historical data
      comparisonMetrics: {
        completionRate: 70,
        averageVelocity: 1.5,
        qualityScore: 80,
      },
      recommendations: [
        'Follow template milestone sequence',
        'Maintain consistent velocity',
      ],
    };
  }

  private identifyProgressDeviations(comparison: any): any[] {
    const deviations: any[] = [];

    if (Math.abs(comparison.completionRateDifference) > 10) {
      deviations.push({
        type: 'completion_rate',
        severity:
          Math.abs(comparison.completionRateDifference) > 20
            ? 'high'
            : 'medium',
        description: `Completion rate differs by ${comparison.completionRateDifference.toFixed(1)}%`,
      });
    }

    return deviations;
  }

  private generateProgressRecommendations(comparison: any): string[] {
    const recommendations: string[] = [];

    if (comparison.completionRateDifference < -10) {
      recommendations.push('Consider increasing milestone completion velocity');
    }

    if (comparison.performanceRatio < 0.8) {
      recommendations.push('Review project scope and timeline expectations');
    }

    return recommendations;
  }

  private calculatePerformanceScore(
    velocity: CompletionVelocityDto,
    trends: TrendAnalysisDto,
    criticalPath: CriticalPathAnalysisDto,
  ): number {
    let score = 50; // Base score

    // Velocity contribution (0-30 points)
    score += Math.min(velocity.completionRate * 0.3, 30);

    // Risk factor penalty (0-20 points deduction)
    score -= Math.min(criticalPath.riskFactors.riskScore * 20, 20);

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private generateKeyInsights(
    velocity: CompletionVelocityDto,
    trends: TrendAnalysisDto,
    criticalPath: CriticalPathAnalysisDto,
    comparison: ProgressComparisonDto | null,
  ): string[] {
    const insights: string[] = [];

    if (velocity.completionRate > 80) {
      insights.push('Excellent milestone completion rate');
    } else if (velocity.completionRate < 50) {
      insights.push('Milestone completion rate needs improvement');
    }

    if (criticalPath.riskFactors.riskScore > 0.7) {
      insights.push(
        'High risk factors detected - immediate attention required',
      );
    }

    if (velocity.weeklyVelocity > 1.5) {
      insights.push('Strong weekly completion velocity');
    }

    return insights;
  }

  private calculateProductivityMetrics(milestones: Milestone[]): any {
    const totalEstimatedHours = milestones.reduce(
      (sum, m) => sum + m.estimatedHours,
      0,
    );
    const totalActualHours = milestones.reduce(
      (sum, m) => sum + m.actualHours,
      0,
    );
    const completedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED,
    );

    return {
      totalEstimatedHours,
      totalActualHours,
      efficiencyRatio:
        totalEstimatedHours > 0 ? totalActualHours / totalEstimatedHours : 0,
      productivityScore:
        completedMilestones.length > 0
          ? (completedMilestones.length / milestones.length) * 100
          : 0,
      timeAccuracy:
        totalEstimatedHours > 0
          ? Math.abs(1 - totalActualHours / totalEstimatedHours) * 100
          : 0,
    };
  }

  private calculatePredictionConfidence(
    milestones: Milestone[],
    weeklyVelocity: number,
  ): 'low' | 'medium' | 'high' {
    const completedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED,
    ).length;

    if (completedMilestones < 3) return 'low';
    if (completedMilestones < 8) return 'medium';
    return 'high';
  }
}
