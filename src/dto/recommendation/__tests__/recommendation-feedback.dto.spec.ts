import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  RecommendationFeedbackDto,
  RecommendationExplanationDto,
  ProjectRecommendationAnalyticsDto,
  SupervisorRecommendationAnalyticsDto,
  SystemRecommendationAnalyticsDto,
  AccuracyTrendDto,
  RecommendationFeedbackSummaryDto,
} from '../recommendation-feedback.dto';
import { FeedbackType } from '../../../common/enums/feedback-type.enum';

describe('RecommendationFeedbackDto', () => {
  describe('RecommendationFeedbackDto', () => {
    it('should validate valid feedback with rating', async () => {
      const dto = plainToClass(RecommendationFeedbackDto, {
        feedbackType: FeedbackType.RATING,
        rating: 4.5,
        comment: 'Great recommendation!',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate feedback without optional fields', async () => {
      const dto = plainToClass(RecommendationFeedbackDto, {
        feedbackType: FeedbackType.LIKE,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid feedback type', async () => {
      const dto = plainToClass(RecommendationFeedbackDto, {
        feedbackType: 'invalid_type' as any,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('feedbackType');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should validate rating range', async () => {
      const validDto = plainToClass(RecommendationFeedbackDto, {
        feedbackType: FeedbackType.RATING,
        rating: 3.0,
      });
      const validErrors = await validate(validDto);
      expect(validErrors).toHaveLength(0);

      const invalidLowDto = plainToClass(RecommendationFeedbackDto, {
        feedbackType: FeedbackType.RATING,
        rating: 0.5,
      });
      const invalidLowErrors = await validate(invalidLowDto);
      expect(invalidLowErrors).toHaveLength(1);
      expect(invalidLowErrors[0].constraints).toHaveProperty('min');

      const invalidHighDto = plainToClass(RecommendationFeedbackDto, {
        feedbackType: FeedbackType.RATING,
        rating: 6.0,
      });
      const invalidHighErrors = await validate(invalidHighDto);
      expect(invalidHighErrors).toHaveLength(1);
      expect(invalidHighErrors[0].constraints).toHaveProperty('max');
    });

    it('should accept boundary rating values', async () => {
      const minDto = plainToClass(RecommendationFeedbackDto, {
        feedbackType: FeedbackType.RATING,
        rating: 1.0,
      });
      const minErrors = await validate(minDto);
      expect(minErrors).toHaveLength(0);

      const maxDto = plainToClass(RecommendationFeedbackDto, {
        feedbackType: FeedbackType.RATING,
        rating: 5.0,
      });
      const maxErrors = await validate(maxDto);
      expect(maxErrors).toHaveLength(0);
    });

    it('should validate all feedback types', async () => {
      const feedbackTypes = [
        FeedbackType.LIKE,
        FeedbackType.DISLIKE,
        FeedbackType.BOOKMARK,
        FeedbackType.VIEW,
        FeedbackType.RATING,
      ];

      for (const type of feedbackTypes) {
        const dto = plainToClass(RecommendationFeedbackDto, {
          feedbackType: type,
        });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('RecommendationExplanationDto', () => {
    const createValidExplanation = () => ({
      projectId: 'project-123',
      explanation:
        'This project matches your interests in AI and machine learning',
      scoreBreakdown: {
        skillsMatch: 0.8,
        interestsMatch: 0.9,
        specializationMatch: 0.7,
        difficultyMatch: 0.6,
        supervisorMatch: 0.8,
        diversityBoost: 0.1,
        totalScore: 0.85,
      },
      matchingElements: {
        skills: ['Python', 'TensorFlow'],
        interests: ['AI', 'Machine Learning'],
        specializations: ['Computer Science'],
        keywords: ['neural networks', 'deep learning'],
      },
      improvementSuggestions: ['Consider adding more web development skills'],
    });

    it('should validate complete explanation', async () => {
      const dto = plainToClass(
        RecommendationExplanationDto,
        createValidExplanation(),
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate minimal explanation', async () => {
      const dto = plainToClass(RecommendationExplanationDto, {
        projectId: 'project-123',
        explanation: 'Basic explanation',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing required fields', async () => {
      const dto = plainToClass(RecommendationExplanationDto, {
        explanation: 'Missing project ID',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'projectId')).toBe(true);
    });
  });

  describe('ProjectRecommendationAnalyticsDto', () => {
    const createValidProjectAnalytics = () => ({
      projectId: 'project-123',
      projectTitle: 'AI Chatbot Project',
      recommendationCount: 150,
      averageSimilarityScore: 0.75,
      positiveFeedbackCount: 45,
      negativeFeedbackCount: 5,
      averageRating: 4.2,
      viewCount: 120,
      conversionRate: 0.3,
      topMatchingSkills: ['Python', 'NLP', 'TensorFlow'],
      topMatchingInterests: ['AI', 'Machine Learning'],
    });

    it('should validate complete project analytics', async () => {
      const dto = plainToClass(
        ProjectRecommendationAnalyticsDto,
        createValidProjectAnalytics(),
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle optional averageRating', async () => {
      const dto = plainToClass(ProjectRecommendationAnalyticsDto, {
        ...createValidProjectAnalytics(),
        averageRating: undefined,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate array fields', async () => {
      const dto = plainToClass(ProjectRecommendationAnalyticsDto, {
        ...createValidProjectAnalytics(),
        topMatchingSkills: ['Skill1', 'Skill2'],
        topMatchingInterests: ['Interest1'],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid array elements', async () => {
      const dto = plainToClass(ProjectRecommendationAnalyticsDto, {
        ...createValidProjectAnalytics(),
        topMatchingSkills: ['Valid', 123, null],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('SupervisorRecommendationAnalyticsDto', () => {
    const createValidSupervisorAnalytics = () => ({
      supervisorId: 'supervisor-123',
      supervisorName: 'Dr. John Smith',
      totalProjects: 10,
      projectsWithRecommendations: 8,
      totalRecommendations: 250,
      averageSimilarityScore: 0.78,
      engagementRate: 0.65,
      topProject: {
        projectId: 'project-123',
        projectTitle: 'Best Project',
        recommendationCount: 50,
        averageSimilarityScore: 0.9,
        positiveFeedbackCount: 20,
        negativeFeedbackCount: 1,
        viewCount: 45,
        conversionRate: 0.4,
        topMatchingSkills: ['Python'],
        topMatchingInterests: ['AI'],
      },
      trendingSkills: ['Python', 'React', 'Node.js'],
      recommendedSpecializations: ['AI', 'Web Development'],
    });

    it('should validate complete supervisor analytics', async () => {
      const dto = plainToClass(
        SupervisorRecommendationAnalyticsDto,
        createValidSupervisorAnalytics(),
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle optional topProject', async () => {
      const dto = plainToClass(SupervisorRecommendationAnalyticsDto, {
        ...createValidSupervisorAnalytics(),
        topProject: undefined,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate nested topProject', async () => {
      const dto = plainToClass(
        SupervisorRecommendationAnalyticsDto,
        createValidSupervisorAnalytics(),
      );
      expect(dto.topProject).toBeInstanceOf(ProjectRecommendationAnalyticsDto);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('SystemRecommendationAnalyticsDto', () => {
    const createValidSystemAnalytics = () => ({
      totalRecommendations: 10000,
      cachedRecommendations: 7500,
      cacheHitRate: 0.75,
      averageGenerationTime: 1250,
      aiApiUsage: 2500,
      fallbackRecommendations: 150,
      aiSuccessRate: 0.94,
      averageUserSatisfaction: 4.3,
      popularSpecializations: ['AI', 'Web Development', 'Mobile'],
      peakUsageHours: [9, 10, 14, 15, 20],
      accuracyTrend: [
        {
          date: new Date('2024-01-01'),
          accuracyScore: 0.85,
          recommendationCount: 100,
        },
        {
          date: new Date('2024-01-02'),
          accuracyScore: 0.87,
          recommendationCount: 120,
        },
      ],
    });

    it('should validate complete system analytics', async () => {
      const dto = plainToClass(
        SystemRecommendationAnalyticsDto,
        createValidSystemAnalytics(),
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate accuracy trend array', async () => {
      const dto = plainToClass(
        SystemRecommendationAnalyticsDto,
        createValidSystemAnalytics(),
      );
      expect(dto.accuracyTrend).toHaveLength(2);
      expect(dto.accuracyTrend[0]).toBeInstanceOf(AccuracyTrendDto);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate peak usage hours array', async () => {
      const dto = plainToClass(SystemRecommendationAnalyticsDto, {
        ...createValidSystemAnalytics(),
        peakUsageHours: [8, 12, 16, 20],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('AccuracyTrendDto', () => {
    it('should validate accuracy trend entry', async () => {
      const dto = plainToClass(AccuracyTrendDto, {
        date: new Date('2024-01-15'),
        accuracyScore: 0.88,
        recommendationCount: 150,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle date transformation', async () => {
      const dto = plainToClass(AccuracyTrendDto, {
        date: '2024-01-15T10:30:00Z',
        accuracyScore: 0.88,
        recommendationCount: 150,
      });
      expect(dto.date).toBeInstanceOf(Date);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('RecommendationFeedbackSummaryDto', () => {
    const createValidFeedbackSummary = () => ({
      totalFeedback: 500,
      feedbackBreakdown: {
        likes: 200,
        dislikes: 25,
        bookmarks: 150,
        views: 100,
        ratings: 25,
      },
      averageRating: 4.1,
      commonThemes: ['good match', 'interesting project', 'too difficult'],
      improvementSuggestions: [
        'Better skill matching',
        'More diverse recommendations',
      ],
    });

    it('should validate complete feedback summary', async () => {
      const dto = plainToClass(
        RecommendationFeedbackSummaryDto,
        createValidFeedbackSummary(),
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle optional fields', async () => {
      const dto = plainToClass(RecommendationFeedbackSummaryDto, {
        totalFeedback: 100,
        commonThemes: ['theme1'],
        improvementSuggestions: ['suggestion1'],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate array fields', async () => {
      const dto = plainToClass(RecommendationFeedbackSummaryDto, {
        ...createValidFeedbackSummary(),
        commonThemes: ['theme1', 'theme2', 'theme3'],
        improvementSuggestions: ['improvement1', 'improvement2'],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('complex validation scenarios', () => {
    it('should handle nested validation errors in supervisor analytics', async () => {
      const dto = plainToClass(SupervisorRecommendationAnalyticsDto, {
        supervisorId: 'supervisor-123',
        supervisorName: 'Dr. Smith',
        totalProjects: 5,
        projectsWithRecommendations: 3,
        totalRecommendations: 100,
        averageSimilarityScore: 0.8,
        engagementRate: 0.6,
        topProject: {
          projectId: 'project-123',
          projectTitle: 'Test Project',
          recommendationCount: 'invalid', // Should be number
          averageSimilarityScore: 0.9,
          positiveFeedbackCount: 10,
          negativeFeedbackCount: 1,
          viewCount: 15,
          conversionRate: 0.5,
          topMatchingSkills: ['Python'],
          topMatchingInterests: ['AI'],
        },
        trendingSkills: ['Python'],
        recommendedSpecializations: ['AI'],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate transformation and nested objects in system analytics', async () => {
      const rawData = {
        totalRecommendations: 1000,
        cachedRecommendations: 750,
        cacheHitRate: 0.75,
        averageGenerationTime: 1000,
        aiApiUsage: 250,
        fallbackRecommendations: 50,
        aiSuccessRate: 0.95,
        averageUserSatisfaction: 4.2,
        popularSpecializations: ['AI', 'Web'],
        peakUsageHours: [9, 14, 20],
        accuracyTrend: [
          {
            date: '2024-01-01T00:00:00Z',
            accuracyScore: 0.85,
            recommendationCount: 50,
          },
        ],
      };

      const dto = plainToClass(SystemRecommendationAnalyticsDto, rawData);
      expect(dto.accuracyTrend[0].date).toBeInstanceOf(Date);
      expect(dto.accuracyTrend[0]).toBeInstanceOf(AccuracyTrendDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
