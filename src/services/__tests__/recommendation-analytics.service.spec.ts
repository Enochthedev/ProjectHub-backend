import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RecommendationAnalyticsService,
  RecommendationQualityMetrics,
  UserSatisfactionAnalysis,
} from '../recommendation-analytics.service';
import { Recommendation } from '../../entities/recommendation.entity';
import { RecommendationFeedback } from '../../entities/recommendation-feedback.entity';
import { ProjectBookmark } from '../../entities/project-bookmark.entity';
import { ProjectView } from '../../entities/project-view.entity';
import { FeedbackType } from '../../common/enums/feedback-type.enum';

describe('RecommendationAnalyticsService', () => {
  let service: RecommendationAnalyticsService;
  let recommendationRepository: jest.Mocked<Repository<Recommendation>>;
  let feedbackRepository: jest.Mocked<Repository<RecommendationFeedback>>;
  let bookmarkRepository: jest.Mocked<Repository<ProjectBookmark>>;
  let viewRepository: jest.Mocked<Repository<ProjectView>>;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getRawMany: jest.fn(),
  };

  const createMockRepository = () => ({
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationAnalyticsService,
        {
          provide: getRepositoryToken(Recommendation),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(RecommendationFeedback),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(ProjectBookmark),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(ProjectView),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<RecommendationAnalyticsService>(
      RecommendationAnalyticsService,
    );
    recommendationRepository = module.get(getRepositoryToken(Recommendation));
    feedbackRepository = module.get(getRepositoryToken(RecommendationFeedback));
    bookmarkRepository = module.get(getRepositoryToken(ProjectBookmark));
    viewRepository = module.get(getRepositoryToken(ProjectView));

    jest.clearAllMocks();
    Object.values(mockQueryBuilder).forEach((mock) => mock.mockReset());
  });

  describe('calculateQualityMetrics', () => {
    it('should calculate quality metrics correctly', async () => {
      const mockRecommendations = [
        { averageSimilarityScore: 0.8 },
        { averageSimilarityScore: 0.7 },
        { averageSimilarityScore: 0.9 },
      ];

      const mockFeedback = [
        { feedbackType: FeedbackType.LIKE, rating: null },
        { feedbackType: FeedbackType.RATING, rating: 4.5 },
        { feedbackType: FeedbackType.DISLIKE, rating: null },
        { feedbackType: FeedbackType.BOOKMARK, rating: null },
      ];

      mockQueryBuilder.getMany
        .mockResolvedValueOnce(mockRecommendations) // recommendations
        .mockResolvedValueOnce(mockFeedback); // feedback

      const result = await service.calculateQualityMetrics();

      expect(result).toEqual({
        totalRecommendations: 3,
        averageSimilarityScore: 0.8, // (0.8 + 0.7 + 0.9) / 3
        feedbackRate: 4 / 3, // 4 feedback / 3 recommendations
        positiveEngagementRate: 0.75, // 3 positive / 4 total feedback
        bookmarkRate: 1 / 3, // 1 bookmark / 3 recommendations
        viewRate: 0, // 0 views / 3 recommendations
        dismissalRate: 1 / 3, // 1 dislike / 3 recommendations
        averageRating: 4.5, // Only one rating
        qualityScore: expect.any(Number),
      });
    });

    it('should handle empty data gracefully', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.calculateQualityMetrics();

      expect(result).toEqual({
        totalRecommendations: 0,
        averageSimilarityScore: 0,
        feedbackRate: 0,
        positiveEngagementRate: 0,
        bookmarkRate: 0,
        viewRate: 0,
        dismissalRate: 0,
        averageRating: 0,
        qualityScore: 0,
      });
    });

    it('should filter by date range when provided', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.calculateQualityMetrics(startDate, endDate);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'rec.createdAt BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    });
  });

  describe('analyzeUserSatisfaction', () => {
    it('should analyze user satisfaction correctly', async () => {
      const mockUserRecommendations = [
        { studentId: 'user1', recommendationCount: '5' },
        { studentId: 'user2', recommendationCount: '3' },
        { studentId: 'user3', recommendationCount: '2' },
      ];

      const mockActiveFeedback = [
        { studentId: 'user1', avgRating: '4.5', feedbackCount: '3' },
        { studentId: 'user2', avgRating: '2.0', feedbackCount: '2' },
      ];

      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce(mockUserRecommendations)
        .mockResolvedValueOnce(mockActiveFeedback);

      // Mock engagement trends
      feedbackRepository.count.mockResolvedValue(0);

      const result = await service.analyzeUserSatisfaction();

      expect(result.totalUsers).toBe(3);
      expect(result.activeUsers).toBe(2);
      expect(result.satisfiedUsers).toBe(1); // user1 with rating >= 4
      expect(result.dissatisfiedUsers).toBe(1); // user2 with rating < 3
      expect(result.averageUserRating).toBe(3.25); // (4.5 + 2.0) / 2
      expect(result.engagementTrends).toHaveLength(30); // 30 days of trends
    });

    it('should handle no active users', async () => {
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([]) // no user recommendations
        .mockResolvedValueOnce([]); // no active feedback

      feedbackRepository.count.mockResolvedValue(0);

      const result = await service.analyzeUserSatisfaction();

      expect(result.totalUsers).toBe(0);
      expect(result.activeUsers).toBe(0);
      expect(result.satisfiedUsers).toBe(0);
      expect(result.dissatisfiedUsers).toBe(0);
      expect(result.averageUserRating).toBe(0);
    });
  });

  describe('generatePerformanceReport', () => {
    it('should generate comprehensive performance report', async () => {
      // Mock quality metrics
      const mockRecommendations = [{ averageSimilarityScore: 0.8 }];
      const mockFeedback = [{ feedbackType: FeedbackType.LIKE, rating: null }];

      mockQueryBuilder.getMany
        .mockResolvedValueOnce(mockRecommendations)
        .mockResolvedValueOnce(mockFeedback);

      // Mock satisfaction analysis
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { studentId: 'user1', recommendationCount: '1' },
        ])
        .mockResolvedValueOnce([
          { studentId: 'user1', avgRating: '4.0', feedbackCount: '1' },
        ])
        .mockResolvedValueOnce([]) // specialization data
        .mockResolvedValueOnce([]); // engagement data

      feedbackRepository.count.mockResolvedValue(0);

      const result = await service.generatePerformanceReport();

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('qualityMetrics');
      expect(result).toHaveProperty('satisfactionAnalysis');
      expect(result).toHaveProperty('topPerformingSpecializations');
      expect(result).toHaveProperty('improvementAreas');
      expect(result).toHaveProperty('recommendations');

      expect(result.period).toBe('All Time');
      expect(Array.isArray(result.improvementAreas)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('quality score calculation', () => {
    it('should calculate quality score with proper weighting', () => {
      // Access private method through any casting
      const calculateQualityScore = (service as any).calculateQualityScore;

      const metrics = {
        averageSimilarityScore: 0.8,
        feedbackRate: 0.5,
        positiveEngagementRate: 0.7,
        averageRating: 4.0,
        dismissalRate: 0.1,
      };

      const qualityScore = calculateQualityScore(metrics);

      expect(qualityScore).toBeGreaterThan(0);
      expect(qualityScore).toBeLessThanOrEqual(1);
      expect(typeof qualityScore).toBe('number');
    });

    it('should penalize high dismissal rates', () => {
      const calculateQualityScore = (service as any).calculateQualityScore;

      const lowDismissalMetrics = {
        averageSimilarityScore: 0.8,
        feedbackRate: 0.5,
        positiveEngagementRate: 0.7,
        averageRating: 4.0,
        dismissalRate: 0.1,
      };

      const highDismissalMetrics = {
        ...lowDismissalMetrics,
        dismissalRate: 0.5,
      };

      const lowDismissalScore = calculateQualityScore(lowDismissalMetrics);
      const highDismissalScore = calculateQualityScore(highDismissalMetrics);

      expect(lowDismissalScore).toBeGreaterThan(highDismissalScore);
    });
  });

  describe('improvement area identification', () => {
    it('should identify areas needing improvement', () => {
      const identifyImprovementAreas = (service as any)
        .identifyImprovementAreas;

      const poorQualityMetrics: RecommendationQualityMetrics = {
        totalRecommendations: 100,
        averageSimilarityScore: 0.5, // Low
        feedbackRate: 0.2, // Low
        positiveEngagementRate: 0.4, // Low
        bookmarkRate: 0.1,
        viewRate: 0.3,
        dismissalRate: 0.4, // High
        averageRating: 2.5, // Low
        qualityScore: 0.3,
      };

      const poorSatisfactionAnalysis: UserSatisfactionAnalysis = {
        totalUsers: 100,
        activeUsers: 20, // Low engagement
        satisfiedUsers: 5,
        dissatisfiedUsers: 15,
        averageUserRating: 2.8, // Low
        engagementTrends: [],
      };

      const areas = identifyImprovementAreas(
        poorQualityMetrics,
        poorSatisfactionAnalysis,
      );

      expect(areas).toContain(
        'Improve semantic matching algorithms to increase similarity scores',
      );
      expect(areas).toContain(
        'Increase user engagement to collect more feedback data',
      );
      expect(areas).toContain(
        'Enhance recommendation relevance to improve user satisfaction',
      );
      expect(areas).toContain(
        'Reduce irrelevant recommendations to decrease dismissal rate',
      );
      expect(areas).toContain(
        'Focus on user experience improvements to increase satisfaction',
      );
    });

    it('should return fewer areas for good metrics', () => {
      const identifyImprovementAreas = (service as any)
        .identifyImprovementAreas;

      const goodQualityMetrics: RecommendationQualityMetrics = {
        totalRecommendations: 100,
        averageSimilarityScore: 0.8,
        feedbackRate: 0.6,
        positiveEngagementRate: 0.8,
        bookmarkRate: 0.4,
        viewRate: 0.7,
        dismissalRate: 0.1,
        averageRating: 4.2,
        qualityScore: 0.8,
      };

      const goodSatisfactionAnalysis: UserSatisfactionAnalysis = {
        totalUsers: 100,
        activeUsers: 60,
        satisfiedUsers: 50,
        dissatisfiedUsers: 10,
        averageUserRating: 4.1,
        engagementTrends: [],
      };

      const areas = identifyImprovementAreas(
        goodQualityMetrics,
        goodSatisfactionAnalysis,
      );

      expect(areas.length).toBeLessThan(3);
    });
  });

  describe('date filtering', () => {
    it('should build correct date filters', () => {
      const buildDateFilter = (service as any).buildDateFilter;

      // Test no dates
      const noDateFilter = buildDateFilter();
      expect(noDateFilter.where).toBe('1=1');

      // Test both dates
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const bothDatesFilter = buildDateFilter(startDate, endDate);
      expect(bothDatesFilter.where).toBe(
        'rec.createdAt BETWEEN :startDate AND :endDate',
      );
      expect(bothDatesFilter.params).toEqual({ startDate, endDate });

      // Test start date only
      const startOnlyFilter = buildDateFilter(startDate);
      expect(startOnlyFilter.where).toBe('rec.createdAt >= :startDate');
      expect(startOnlyFilter.params).toEqual({ startDate });

      // Test end date only
      const endOnlyFilter = buildDateFilter(undefined, endDate);
      expect(endOnlyFilter.where).toBe('rec.createdAt <= :endDate');
      expect(endOnlyFilter.params).toEqual({ endDate });
    });
  });
});
