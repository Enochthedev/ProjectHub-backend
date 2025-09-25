import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationFeedback } from '../entities/recommendation-feedback.entity';
import { ProjectBookmark } from '../entities/project-bookmark.entity';
import { ProjectView } from '../entities/project-view.entity';
import { Recommendation } from '../entities/recommendation.entity';
import { FeedbackType } from '../common/enums/feedback-type.enum';

export interface ImplicitFeedbackData {
  studentId: string;
  projectId: string;
  action: 'bookmark' | 'view' | 'dismiss';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface FeedbackAggregation {
  totalFeedback: number;
  positiveCount: number;
  negativeCount: number;
  averageRating: number;
  bookmarkCount: number;
  viewCount: number;
  dismissalCount: number;
  feedbackByType: Record<FeedbackType, number>;
}

export interface FeedbackPattern {
  studentId: string;
  preferredSpecializations: string[];
  dislikedSpecializations: string[];
  skillPreferences: string[];
  difficultyPreference: string;
  averageRating: number;
  feedbackCount: number;
}

@Injectable()
export class FeedbackLearningService {
  private readonly logger = new Logger(FeedbackLearningService.name);

  constructor(
    @InjectRepository(RecommendationFeedback)
    private readonly feedbackRepository: Repository<RecommendationFeedback>,
    @InjectRepository(ProjectBookmark)
    private readonly bookmarkRepository: Repository<ProjectBookmark>,
    @InjectRepository(ProjectView)
    private readonly viewRepository: Repository<ProjectView>,
    @InjectRepository(Recommendation)
    private readonly recommendationRepository: Repository<Recommendation>,
  ) {}

  /**
   * Track implicit feedback from user actions
   */
  async trackImplicitFeedback(data: ImplicitFeedbackData): Promise<void> {
    try {
      // Find the most recent recommendation that includes this project
      const recommendation = await this.findRecommendationForProject(
        data.studentId,
        data.projectId,
      );

      if (!recommendation) {
        this.logger.debug(
          `No recommendation found for implicit feedback: ${data.studentId} -> ${data.projectId}`,
        );
        return;
      }

      // Create implicit feedback entry
      const feedbackType = this.mapActionToFeedbackType(data.action);

      const feedback = this.feedbackRepository.create({
        recommendationId: recommendation.id,
        projectId: data.projectId,
        feedbackType,
        rating: this.getImplicitRating(data.action),
        comment: `Implicit feedback from ${data.action}`,
      });

      await this.feedbackRepository.save(feedback);

      this.logger.debug(
        `Tracked implicit feedback: ${data.action} for project ${data.projectId} by student ${data.studentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to track implicit feedback for ${data.studentId} -> ${data.projectId}:`,
        error,
      );
    }
  }

  /**
   * Aggregate feedback for a specific project
   */
  async aggregateProjectFeedback(
    projectId: string,
  ): Promise<FeedbackAggregation> {
    try {
      // Get all feedback for this project
      const feedback = await this.feedbackRepository
        .createQueryBuilder('feedback')
        .innerJoin('feedback.recommendation', 'recommendation')
        .where('feedback.projectId = :projectId', { projectId })
        .getMany();

      // Get bookmark count
      const bookmarkCount = await this.bookmarkRepository.count({
        where: { projectId },
      });

      // Get view count
      const viewCount = await this.viewRepository.count({
        where: { projectId },
      });

      // Calculate aggregations
      const totalFeedback = feedback.length;
      const positiveCount = feedback.filter(
        (f) =>
          [FeedbackType.LIKE, FeedbackType.BOOKMARK].includes(f.feedbackType) ||
          (f.feedbackType === FeedbackType.RATING && (f.rating || 0) >= 4),
      ).length;

      const negativeCount = feedback.filter(
        (f) =>
          f.feedbackType === FeedbackType.DISLIKE ||
          (f.feedbackType === FeedbackType.RATING && (f.rating || 0) < 3),
      ).length;

      const ratings = feedback
        .filter((f) => f.rating !== null)
        .map((f) => f.rating!);

      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
          : 0;

      const dismissalCount = feedback.filter(
        (f) =>
          f.feedbackType === FeedbackType.VIEW &&
          f.comment?.includes('dismiss'),
      ).length;

      // Count by feedback type
      const feedbackByType = Object.values(FeedbackType).reduce(
        (acc, type) => {
          acc[type] = feedback.filter((f) => f.feedbackType === type).length;
          return acc;
        },
        {} as Record<FeedbackType, number>,
      );

      return {
        totalFeedback,
        positiveCount,
        negativeCount,
        averageRating,
        bookmarkCount,
        viewCount,
        dismissalCount,
        feedbackByType,
      };
    } catch (error) {
      this.logger.error(
        `Failed to aggregate feedback for project ${projectId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Analyze feedback patterns for a student
   */
  async analyzeStudentFeedbackPatterns(
    studentId: string,
  ): Promise<FeedbackPattern> {
    try {
      // Get all feedback from this student
      const feedback = await this.feedbackRepository
        .createQueryBuilder('feedback')
        .innerJoin('feedback.recommendation', 'recommendation')
        .innerJoin('recommendation.student', 'student')
        .where('student.id = :studentId', { studentId })
        .getMany();

      if (feedback.length === 0) {
        return {
          studentId,
          preferredSpecializations: [],
          dislikedSpecializations: [],
          skillPreferences: [],
          difficultyPreference: 'intermediate',
          averageRating: 0,
          feedbackCount: 0,
        };
      }

      // Get recommendations with project details for analysis
      const recommendations = await this.recommendationRepository
        .createQueryBuilder('rec')
        .where('rec.studentId = :studentId', { studentId })
        .getMany();

      // Analyze preferences based on positive feedback
      const positiveFeedback = feedback.filter(
        (f) =>
          [FeedbackType.LIKE, FeedbackType.BOOKMARK].includes(f.feedbackType) ||
          (f.feedbackType === FeedbackType.RATING && (f.rating || 0) >= 4),
      );

      const negativeFeedback = feedback.filter(
        (f) =>
          f.feedbackType === FeedbackType.DISLIKE ||
          (f.feedbackType === FeedbackType.RATING && (f.rating || 0) < 3),
      );

      // Extract specializations from project suggestions
      const preferredSpecializations = this.extractSpecializationPreferences(
        positiveFeedback,
        recommendations,
      );

      const dislikedSpecializations = this.extractSpecializationPreferences(
        negativeFeedback,
        recommendations,
      );

      // Calculate average rating
      const ratings = feedback
        .filter((f) => f.rating !== null)
        .map((f) => f.rating!);

      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
          : 0;

      return {
        studentId,
        preferredSpecializations,
        dislikedSpecializations,
        skillPreferences: [], // Could be enhanced with more detailed analysis
        difficultyPreference: 'intermediate', // Could be enhanced with difficulty analysis
        averageRating,
        feedbackCount: feedback.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to analyze feedback patterns for student ${studentId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get feedback-based recommendation adjustments for a student
   */
  async getRecommendationAdjustments(studentId: string): Promise<{
    boostSpecializations: string[];
    penalizeSpecializations: string[];
    preferredDifficulty: string;
    scoreAdjustment: number;
  }> {
    try {
      const patterns = await this.analyzeStudentFeedbackPatterns(studentId);

      // Determine score adjustments based on feedback patterns
      let scoreAdjustment = 0;
      if (patterns.averageRating > 4) {
        scoreAdjustment = 0.1; // Boost for highly satisfied users
      } else if (patterns.averageRating < 2) {
        scoreAdjustment = -0.1; // Penalty for dissatisfied users
      }

      return {
        boostSpecializations: patterns.preferredSpecializations,
        penalizeSpecializations: patterns.dislikedSpecializations,
        preferredDifficulty: patterns.difficultyPreference,
        scoreAdjustment,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get recommendation adjustments for student ${studentId}:`,
        error,
      );
      return {
        boostSpecializations: [],
        penalizeSpecializations: [],
        preferredDifficulty: 'intermediate',
        scoreAdjustment: 0,
      };
    }
  }

  /**
   * Find the most recent recommendation that includes a specific project
   */
  private async findRecommendationForProject(
    studentId: string,
    projectId: string,
  ): Promise<Recommendation | null> {
    const recommendations = await this.recommendationRepository
      .createQueryBuilder('rec')
      .where('rec.studentId = :studentId', { studentId })
      .orderBy('rec.createdAt', 'DESC')
      .limit(5) // Check last 5 recommendations
      .getMany();

    for (const recommendation of recommendations) {
      const projectSuggestions = recommendation.projectSuggestions || [];
      if (projectSuggestions.some((p: any) => p.projectId === projectId)) {
        return recommendation;
      }
    }

    return null;
  }

  /**
   * Map user action to feedback type
   */
  private mapActionToFeedbackType(action: string): FeedbackType {
    switch (action) {
      case 'bookmark':
        return FeedbackType.BOOKMARK;
      case 'view':
        return FeedbackType.VIEW;
      case 'dismiss':
        return FeedbackType.DISLIKE;
      default:
        return FeedbackType.VIEW;
    }
  }

  /**
   * Get implicit rating based on action
   */
  private getImplicitRating(action: string): number | null {
    switch (action) {
      case 'bookmark':
        return 5.0; // Bookmarking indicates high interest
      case 'view':
        return 3.0; // Viewing indicates moderate interest
      case 'dismiss':
        return 1.0; // Dismissing indicates low interest
      default:
        return null;
    }
  }

  /**
   * Extract specialization preferences from feedback and recommendations
   */
  private extractSpecializationPreferences(
    feedback: RecommendationFeedback[],
    recommendations: Recommendation[],
  ): string[] {
    const specializationCounts = new Map<string, number>();

    for (const fb of feedback) {
      // Find the recommendation and project for this feedback
      const recommendation = recommendations.find(
        (r) => r.id === fb.recommendationId,
      );
      if (recommendation) {
        const project = recommendation.projectSuggestions?.find(
          (p: any) => p.projectId === fb.projectId,
        );
        if (project && project.specialization) {
          const count = specializationCounts.get(project.specialization) || 0;
          specializationCounts.set(project.specialization, count + 1);
        }
      }
    }

    // Return specializations sorted by preference count
    return Array.from(specializationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([specialization]) => specialization)
      .slice(0, 3); // Top 3 preferred specializations
  }
}
