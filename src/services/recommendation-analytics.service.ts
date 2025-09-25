import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recommendation } from '../entities/recommendation.entity';
import { RecommendationFeedback } from '../entities/recommendation-feedback.entity';
import { ProjectBookmark } from '../entities/project-bookmark.entity';
import { ProjectView } from '../entities/project-view.entity';
import { FeedbackType } from '../common/enums/feedback-type.enum';

export interface RecommendationQualityMetrics {
  totalRecommendations: number;
  averageSimilarityScore: number;
  feedbackRate: number;
  positiveEngagementRate: number;
  bookmarkRate: number;
  viewRate: number;
  dismissalRate: number;
  averageRating: number;
  qualityScore: number;
}

export interface UserSatisfactionAnalysis {
  totalUsers: number;
  activeUsers: number;
  satisfiedUsers: number;
  dissatisfiedUsers: number;
  averageUserRating: number;
  engagementTrends: EngagementTrend[];
}

export interface EngagementTrend {
  date: string;
  recommendations: number;
  feedback: number;
  bookmarks: number;
  views: number;
  positiveRate: number;
}

export interface RecommendationPerformanceReport {
  period: string;
  qualityMetrics: RecommendationQualityMetrics;
  satisfactionAnalysis: UserSatisfactionAnalysis;
  topPerformingSpecializations: SpecializationPerformance[];
  improvementAreas: string[];
  recommendations: string[];
}

export interface SpecializationPerformance {
  specialization: string;
  recommendationCount: number;
  averageScore: number;
  engagementRate: number;
  satisfactionScore: number;
}

@Injectable()
export class RecommendationAnalyticsService {
  private readonly logger = new Logger(RecommendationAnalyticsService.name);

  constructor(
    @InjectRepository(Recommendation)
    private readonly recommendationRepository: Repository<Recommendation>,
    @InjectRepository(RecommendationFeedback)
    private readonly feedbackRepository: Repository<RecommendationFeedback>,
    @InjectRepository(ProjectBookmark)
    private readonly bookmarkRepository: Repository<ProjectBookmark>,
    @InjectRepository(ProjectView)
    private readonly viewRepository: Repository<ProjectView>,
  ) {}

  /**
   * Calculate overall recommendation quality metrics
   */
  async calculateQualityMetrics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<RecommendationQualityMetrics> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);

      // Get all recommendations in the period
      const recommendations = await this.recommendationRepository
        .createQueryBuilder('rec')
        .where(dateFilter.where, dateFilter.params)
        .getMany();

      if (recommendations.length === 0) {
        return this.getEmptyQualityMetrics();
      }

      // Calculate average similarity score
      const totalScore = recommendations.reduce(
        (sum, rec) => sum + (rec.averageSimilarityScore || 0),
        0,
      );
      const averageSimilarityScore = totalScore / recommendations.length;

      // Get feedback data
      const feedback = await this.feedbackRepository
        .createQueryBuilder('feedback')
        .innerJoin('feedback.recommendation', 'rec')
        .where(dateFilter.where, dateFilter.params)
        .getMany();

      // Calculate engagement rates
      const feedbackRate =
        recommendations.length > 0
          ? feedback.length / recommendations.length
          : 0;

      const positiveFeedback = feedback.filter(
        (f) =>
          [FeedbackType.LIKE, FeedbackType.BOOKMARK].includes(f.feedbackType) ||
          (f.feedbackType === FeedbackType.RATING && (f.rating || 0) >= 4),
      );

      const positiveEngagementRate =
        feedback.length > 0 ? positiveFeedback.length / feedback.length : 0;

      // Calculate specific engagement rates
      const bookmarkFeedback = feedback.filter(
        (f) => f.feedbackType === FeedbackType.BOOKMARK,
      );
      const viewFeedback = feedback.filter(
        (f) => f.feedbackType === FeedbackType.VIEW,
      );
      const dismissalFeedback = feedback.filter(
        (f) => f.feedbackType === FeedbackType.DISLIKE,
      );

      const bookmarkRate =
        recommendations.length > 0
          ? bookmarkFeedback.length / recommendations.length
          : 0;
      const viewRate =
        recommendations.length > 0
          ? viewFeedback.length / recommendations.length
          : 0;
      const dismissalRate =
        recommendations.length > 0
          ? dismissalFeedback.length / recommendations.length
          : 0;

      // Calculate average rating
      const ratings = feedback
        .filter((f) => f.rating !== null)
        .map((f) => f.rating!);
      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
          : 0;

      // Calculate overall quality score (weighted combination)
      const qualityScore = this.calculateQualityScore({
        averageSimilarityScore,
        feedbackRate,
        positiveEngagementRate,
        averageRating,
        dismissalRate,
      });

      return {
        totalRecommendations: recommendations.length,
        averageSimilarityScore,
        feedbackRate,
        positiveEngagementRate,
        bookmarkRate,
        viewRate,
        dismissalRate,
        averageRating,
        qualityScore,
      };
    } catch (error) {
      this.logger.error('Failed to calculate quality metrics:', error);
      throw error;
    }
  }

  /**
   * Analyze user satisfaction patterns
   */
  async analyzeUserSatisfaction(
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserSatisfactionAnalysis> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);

      // Get unique users who received recommendations
      const userRecommendations = await this.recommendationRepository
        .createQueryBuilder('rec')
        .select('rec.studentId')
        .addSelect('COUNT(*)', 'recommendationCount')
        .where(dateFilter.where, dateFilter.params)
        .groupBy('rec.studentId')
        .getRawMany();

      const totalUsers = userRecommendations.length;

      // Get users who provided feedback (active users)
      const activeFeedback = await this.feedbackRepository
        .createQueryBuilder('feedback')
        .select('rec.studentId')
        .addSelect(
          'AVG(CASE WHEN feedback.rating IS NOT NULL THEN feedback.rating ELSE NULL END)',
          'avgRating',
        )
        .addSelect('COUNT(*)', 'feedbackCount')
        .innerJoin('feedback.recommendation', 'rec')
        .where(dateFilter.where, dateFilter.params)
        .groupBy('rec.studentId')
        .getRawMany();

      const activeUsers = activeFeedback.length;

      // Classify users by satisfaction
      const satisfiedUsers = activeFeedback.filter(
        (user) => user.avgRating >= 4 || user.feedbackCount >= 3,
      ).length;

      const dissatisfiedUsers = activeFeedback.filter(
        (user) => user.avgRating < 3 && user.feedbackCount >= 2,
      ).length;

      // Calculate average user rating
      const userRatings = activeFeedback
        .filter((user) => user.avgRating !== null)
        .map((user) => parseFloat(user.avgRating));

      const averageUserRating =
        userRatings.length > 0
          ? userRatings.reduce((sum, rating) => sum + rating, 0) /
            userRatings.length
          : 0;

      // Generate engagement trends (last 30 days)
      const engagementTrends = await this.generateEngagementTrends(
        startDate,
        endDate,
      );

      return {
        totalUsers,
        activeUsers,
        satisfiedUsers,
        dissatisfiedUsers,
        averageUserRating,
        engagementTrends,
      };
    } catch (error) {
      this.logger.error('Failed to analyze user satisfaction:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(
    startDate?: Date,
    endDate?: Date,
  ): Promise<RecommendationPerformanceReport> {
    try {
      const period = this.formatPeriod(startDate, endDate);

      const [qualityMetrics, satisfactionAnalysis, specializationPerformance] =
        await Promise.all([
          this.calculateQualityMetrics(startDate, endDate),
          this.analyzeUserSatisfaction(startDate, endDate),
          this.analyzeSpecializationPerformance(startDate, endDate),
        ]);

      const improvementAreas = this.identifyImprovementAreas(
        qualityMetrics,
        satisfactionAnalysis,
      );
      const recommendations = this.generateRecommendations(
        qualityMetrics,
        satisfactionAnalysis,
      );

      return {
        period,
        qualityMetrics,
        satisfactionAnalysis,
        topPerformingSpecializations: specializationPerformance.slice(0, 5),
        improvementAreas,
        recommendations,
      };
    } catch (error) {
      this.logger.error('Failed to generate performance report:', error);
      throw error;
    }
  }

  /**
   * Analyze performance by specialization
   */
  private async analyzeSpecializationPerformance(
    startDate?: Date,
    endDate?: Date,
  ): Promise<SpecializationPerformance[]> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get recommendation data by specialization
    const specializationData = await this.recommendationRepository
      .createQueryBuilder('rec')
      .select('project.specialization', 'specialization')
      .addSelect('COUNT(*)', 'recommendationCount')
      .addSelect('AVG(rec.averageSimilarityScore)', 'averageScore')
      .innerJoin('rec.projectSuggestions', 'project')
      .where(dateFilter.where, dateFilter.params)
      .groupBy('project.specialization')
      .getRawMany();

    // Get engagement data by specialization
    const engagementData = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .select('project.specialization', 'specialization')
      .addSelect('COUNT(*)', 'engagementCount')
      .addSelect(
        'AVG(CASE WHEN feedback.rating IS NOT NULL THEN feedback.rating ELSE NULL END)',
        'avgRating',
      )
      .innerJoin('feedback.recommendation', 'rec')
      .innerJoin('rec.projectSuggestions', 'project')
      .where('feedback.projectId = project.projectId')
      .andWhere(dateFilter.where, dateFilter.params)
      .groupBy('project.specialization')
      .getRawMany();

    // Combine and calculate performance metrics
    const performanceMap = new Map<string, SpecializationPerformance>();

    specializationData.forEach((spec) => {
      const engagement = engagementData.find(
        (e) => e.specialization === spec.specialization,
      );

      performanceMap.set(spec.specialization, {
        specialization: spec.specialization,
        recommendationCount: parseInt(spec.recommendationCount),
        averageScore: parseFloat(spec.averageScore) || 0,
        engagementRate: engagement
          ? parseInt(engagement.engagementCount) /
            parseInt(spec.recommendationCount)
          : 0,
        satisfactionScore:
          engagement && engagement.avgRating
            ? parseFloat(engagement.avgRating)
            : 0,
      });
    });

    return Array.from(performanceMap.values()).sort(
      (a, b) => b.satisfactionScore - a.satisfactionScore,
    );
  }

  /**
   * Generate engagement trends over time
   */
  private async generateEngagementTrends(
    startDate?: Date,
    endDate?: Date,
  ): Promise<EngagementTrend[]> {
    const trends: EngagementTrend[] = [];
    const days = 30; // Last 30 days

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // Get daily metrics
      const recommendations = await this.recommendationRepository.count({
        where: {
          createdAt: {
            $gte: dayStart,
            $lte: dayEnd,
          } as any,
        },
      });

      const feedback = await this.feedbackRepository.count({
        where: {
          createdAt: {
            $gte: dayStart,
            $lte: dayEnd,
          } as any,
        },
      });

      const bookmarks = await this.feedbackRepository.count({
        where: {
          feedbackType: FeedbackType.BOOKMARK,
          createdAt: {
            $gte: dayStart,
            $lte: dayEnd,
          } as any,
        },
      });

      const views = await this.feedbackRepository.count({
        where: {
          feedbackType: FeedbackType.VIEW,
          createdAt: {
            $gte: dayStart,
            $lte: dayEnd,
          } as any,
        },
      });

      const positiveFeedback = await this.feedbackRepository.count({
        where: {
          feedbackType: FeedbackType.LIKE,
          createdAt: {
            $gte: dayStart,
            $lte: dayEnd,
          } as any,
        },
      });

      const positiveRate =
        feedback > 0 ? (positiveFeedback + bookmarks) / feedback : 0;

      trends.push({
        date: dateStr,
        recommendations,
        feedback,
        bookmarks,
        views,
        positiveRate,
      });
    }

    return trends;
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(metrics: {
    averageSimilarityScore: number;
    feedbackRate: number;
    positiveEngagementRate: number;
    averageRating: number;
    dismissalRate: number;
  }): number {
    // Weighted scoring algorithm
    const weights = {
      similarity: 0.25,
      feedback: 0.2,
      engagement: 0.25,
      rating: 0.2,
      dismissal: 0.1,
    };

    const normalizedSimilarity = Math.min(1, metrics.averageSimilarityScore);
    const normalizedFeedback = Math.min(1, metrics.feedbackRate);
    const normalizedEngagement = metrics.positiveEngagementRate;
    const normalizedRating = metrics.averageRating / 5; // Normalize to 0-1
    const dismissalPenalty = 1 - Math.min(1, metrics.dismissalRate * 2); // Penalty for high dismissal

    const qualityScore =
      normalizedSimilarity * weights.similarity +
      normalizedFeedback * weights.feedback +
      normalizedEngagement * weights.engagement +
      normalizedRating * weights.rating +
      dismissalPenalty * weights.dismissal;

    return Math.round(qualityScore * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Identify areas for improvement
   */
  private identifyImprovementAreas(
    qualityMetrics: RecommendationQualityMetrics,
    satisfactionAnalysis: UserSatisfactionAnalysis,
  ): string[] {
    const areas: string[] = [];

    if (qualityMetrics.averageSimilarityScore < 0.6) {
      areas.push(
        'Improve semantic matching algorithms to increase similarity scores',
      );
    }

    if (qualityMetrics.feedbackRate < 0.3) {
      areas.push('Increase user engagement to collect more feedback data');
    }

    if (qualityMetrics.positiveEngagementRate < 0.6) {
      areas.push(
        'Enhance recommendation relevance to improve user satisfaction',
      );
    }

    if (qualityMetrics.dismissalRate > 0.3) {
      areas.push(
        'Reduce irrelevant recommendations to decrease dismissal rate',
      );
    }

    if (satisfactionAnalysis.averageUserRating < 3.5) {
      areas.push(
        'Focus on user experience improvements to increase satisfaction',
      );
    }

    if (
      satisfactionAnalysis.activeUsers / satisfactionAnalysis.totalUsers <
      0.4
    ) {
      areas.push('Improve user onboarding and engagement strategies');
    }

    return areas;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    qualityMetrics: RecommendationQualityMetrics,
    satisfactionAnalysis: UserSatisfactionAnalysis,
  ): string[] {
    const recommendations: string[] = [];

    if (qualityMetrics.qualityScore > 0.8) {
      recommendations.push(
        'Maintain current high-quality recommendation standards',
      );
    }

    if (qualityMetrics.feedbackRate > 0.5) {
      recommendations.push(
        'Leverage high engagement to implement advanced personalization',
      );
    }

    if (
      satisfactionAnalysis.satisfiedUsers >
      satisfactionAnalysis.dissatisfiedUsers * 3
    ) {
      recommendations.push(
        'Consider expanding recommendation features based on positive user response',
      );
    }

    recommendations.push(
      'Continue monitoring user feedback patterns for continuous improvement',
    );
    recommendations.push(
      'Implement A/B testing for new recommendation algorithms',
    );

    return recommendations;
  }

  /**
   * Build date filter for queries
   */
  private buildDateFilter(
    startDate?: Date,
    endDate?: Date,
  ): { where: string; params: any } {
    if (!startDate && !endDate) {
      return { where: '1=1', params: {} };
    }

    if (startDate && endDate) {
      return {
        where: 'rec.createdAt BETWEEN :startDate AND :endDate',
        params: { startDate, endDate },
      };
    }

    if (startDate) {
      return {
        where: 'rec.createdAt >= :startDate',
        params: { startDate },
      };
    }

    return {
      where: 'rec.createdAt <= :endDate',
      params: { endDate: endDate! },
    };
  }

  /**
   * Format period string for reports
   */
  private formatPeriod(startDate?: Date, endDate?: Date): string {
    if (!startDate && !endDate) {
      return 'All Time';
    }

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    if (startDate && endDate) {
      return `${formatDate(startDate)} to ${formatDate(endDate)}`;
    }

    if (startDate) {
      return `From ${formatDate(startDate)}`;
    }

    return `Until ${formatDate(endDate!)}`;
  }

  /**
   * Get empty quality metrics for cases with no data
   */
  private getEmptyQualityMetrics(): RecommendationQualityMetrics {
    return {
      totalRecommendations: 0,
      averageSimilarityScore: 0,
      feedbackRate: 0,
      positiveEngagementRate: 0,
      bookmarkRate: 0,
      viewRate: 0,
      dismissalRate: 0,
      averageRating: 0,
      qualityScore: 0,
    };
  }
}
