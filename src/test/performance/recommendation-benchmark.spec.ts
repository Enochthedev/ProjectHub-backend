import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationBenchmarkService } from './recommendation-benchmark.service';
import { PerformanceAnalyzerService } from './performance-analyzer.service';
import { RecommendationService } from '../../services/recommendation/recommendation.service';
import { FallbackRecommendationService } from '../../services/recommendation/fallback-recommendation.service';
import {
  User,
  StudentProfile,
  Project,
  Recommendation,
  RecommendationFeedback,
  AIApiUsage,
} from '../../entities';
import { RecommendationFixtures } from '../fixtures';
import { FeedbackType } from '../../common/enums';

describe('RecommendationBenchmarkService', () => {
  let service: RecommendationBenchmarkService;
  let analyzerService: PerformanceAnalyzerService;
  let userRepository: Repository<User>;
  let recommendationRepository: Repository<Recommendation>;
  let feedbackRepository: Repository<RecommendationFeedback>;
  let apiUsageRepository: Repository<AIApiUsage>;
  let recommendationService: RecommendationService;

  const mockUserRepository = {
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockRecommendationRepository = {
    find: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockFeedbackRepository = {
    find: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockApiUsageRepository = {
    find: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockRecommendationService = {
    generateRecommendations: jest.fn(),
  };

  const mockFallbackService = {
    generateFallbackRecommendations: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationBenchmarkService,
        PerformanceAnalyzerService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(StudentProfile),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Project),
          useValue: { find: jest.fn(), count: jest.fn() },
        },
        {
          provide: getRepositoryToken(Recommendation),
          useValue: mockRecommendationRepository,
        },
        {
          provide: getRepositoryToken(RecommendationFeedback),
          useValue: mockFeedbackRepository,
        },
        {
          provide: getRepositoryToken(AIApiUsage),
          useValue: mockApiUsageRepository,
        },
        {
          provide: RecommendationService,
          useValue: mockRecommendationService,
        },
        {
          provide: FallbackRecommendationService,
          useValue: mockFallbackService,
        },
      ],
    }).compile();

    service = module.get<RecommendationBenchmarkService>(
      RecommendationBenchmarkService,
    );
    analyzerService = module.get<PerformanceAnalyzerService>(
      PerformanceAnalyzerService,
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    recommendationRepository = module.get<Repository<Recommendation>>(
      getRepositoryToken(Recommendation),
    );
    feedbackRepository = module.get<Repository<RecommendationFeedback>>(
      getRepositoryToken(RecommendationFeedback),
    );
    apiUsageRepository = module.get<Repository<AIApiUsage>>(
      getRepositoryToken(AIApiUsage),
    );
    recommendationService = module.get<RecommendationService>(
      RecommendationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('measureAccuracy', () => {
    it('should calculate accuracy metrics correctly', async () => {
      // Mock data setup
      const mockRecommendations = [
        RecommendationFixtures.createTestRecommendation(),
        RecommendationFixtures.createTestRecommendation(),
      ];

      mockRecommendationRepository.find.mockResolvedValue(mockRecommendations);

      const result = await service.measureAccuracy();

      expect(result).toHaveProperty('precisionAtK');
      expect(result).toHaveProperty('recallAtK');
      expect(result).toHaveProperty('f1ScoreAtK');
      expect(result).toHaveProperty('meanAveragePrecision');
      expect(result).toHaveProperty('normalizedDiscountedCumulativeGain');

      // Verify that precision@k values are between 0 and 1
      Object.values(result.precisionAtK).forEach((precision) => {
        expect(precision).toBeGreaterThanOrEqual(0);
        expect(precision).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty recommendation data gracefully', async () => {
      mockRecommendationRepository.find.mockResolvedValue([]);

      const result = await service.measureAccuracy();

      expect(result.meanAveragePrecision).toBeDefined();
      expect(result.precisionAtK).toBeDefined();
    });
  });

  describe('measureRelevance', () => {
    it('should calculate relevance metrics correctly', async () => {
      const mockRecommendations = [
        {
          ...RecommendationFixtures.createTestRecommendation(),
          feedback: [
            RecommendationFixtures.createTestRecommendationFeedback({
              feedbackType: FeedbackType.RATING,
              rating: 4.5,
            }),
          ],
        },
      ];

      const mockFeedback = [
        RecommendationFixtures.createTestRecommendationFeedback({
          feedbackType: FeedbackType.RATING,
          rating: 4.0,
        }),
        RecommendationFixtures.createTestRecommendationFeedback({
          feedbackType: FeedbackType.LIKE,
        }),
      ];

      mockRecommendationRepository.find.mockResolvedValue(mockRecommendations);
      mockFeedbackRepository.find.mockResolvedValue(mockFeedback);
      mockFeedbackRepository.count
        .mockResolvedValueOnce(1) // positive actions
        .mockResolvedValueOnce(2); // total actions

      const result = await service.measureRelevance();

      expect(result).toHaveProperty('averageSimilarityScore');
      expect(result).toHaveProperty('medianSimilarityScore');
      expect(result).toHaveProperty('similarityScoreDistribution');
      expect(result).toHaveProperty('userSatisfactionScore');
      expect(result).toHaveProperty('clickThroughRate');

      expect(result.averageSimilarityScore).toBeGreaterThanOrEqual(0);
      expect(result.averageSimilarityScore).toBeLessThanOrEqual(1);
      expect(result.clickThroughRate).toBe(0.5); // 1/2
    });
  });

  describe('measurePerformance', () => {
    it('should measure performance metrics correctly', async () => {
      const mockStudents = [
        { id: 'student-1', role: 'student', studentProfile: {} },
        { id: 'student-2', role: 'student', studentProfile: {} },
      ];

      const mockRecommendationResult = {
        recommendations: [],
        fromCache: false,
        metadata: { method: 'ai-powered' },
      };

      mockUserRepository.find.mockResolvedValue(mockStudents);
      mockRecommendationService.generateRecommendations.mockResolvedValue(
        mockRecommendationResult,
      );
      mockApiUsageRepository.find.mockResolvedValue([
        RecommendationFixtures.createTestAIApiUsage({ responseTimeMs: 1500 }),
      ]);

      const result = await service.measurePerformance();

      expect(result).toHaveProperty('averageResponseTime');
      expect(result).toHaveProperty('medianResponseTime');
      expect(result).toHaveProperty('p95ResponseTime');
      expect(result).toHaveProperty('p99ResponseTime');
      expect(result).toHaveProperty('throughputPerSecond');
      expect(result).toHaveProperty('cacheHitRate');
      expect(result).toHaveProperty('aiApiUsageRate');
      expect(result).toHaveProperty('errorRate');

      expect(result.errorRate).toBe(0); // No errors in this test
      expect(result.aiApiUsageRate).toBe(1); // All requests used AI
    });

    it('should handle recommendation service errors gracefully', async () => {
      const mockStudents = [
        { id: 'student-1', role: 'student', studentProfile: {} },
      ];

      mockUserRepository.find.mockResolvedValue(mockStudents);
      mockRecommendationService.generateRecommendations.mockRejectedValue(
        new Error('Service error'),
      );
      mockApiUsageRepository.find.mockResolvedValue([]);

      const result = await service.measurePerformance();

      expect(result.errorRate).toBe(1); // 100% error rate
      expect(result.averageResponseTime).toBe(0); // No successful requests
    });
  });

  describe('measureDiversity', () => {
    it('should calculate diversity metrics correctly', async () => {
      const mockRecommendations = [
        {
          ...RecommendationFixtures.createTestRecommendation(),
          projectSuggestions: [
            {
              projectId: 'proj-1',
              specialization: 'AI & ML',
              difficultyLevel: 'advanced',
              supervisor: {
                id: 'sup-1',
                name: 'Supervisor 1',
                specialization: 'AI & ML',
              },
            },
            {
              projectId: 'proj-2',
              specialization: 'Web Development',
              difficultyLevel: 'intermediate',
              supervisor: {
                id: 'sup-2',
                name: 'Supervisor 2',
                specialization: 'Web Development',
              },
            },
          ],
        },
      ];

      mockRecommendationRepository.find.mockResolvedValue(mockRecommendations);
      mockUserRepository.find.mockResolvedValue([]); // For project repository mock

      // Mock the project repository count
      const mockProjectRepository = { count: jest.fn().mockResolvedValue(100) };
      jest
        .spyOn(service as any, 'projectRepository', 'get')
        .mockReturnValue(mockProjectRepository);

      const result = await service.measureDiversity();

      expect(result).toHaveProperty('specializationDiversity');
      expect(result).toHaveProperty('difficultyLevelDiversity');
      expect(result).toHaveProperty('supervisorDiversity');
      expect(result).toHaveProperty('intraListDiversity');
      expect(result).toHaveProperty('catalogCoverage');

      // With 2 different specializations in 2 projects, diversity should be 1.0
      expect(result.specializationDiversity).toBe(1.0);
      expect(result.supervisorDiversity).toBe(1.0);
    });
  });

  describe('runLoadTest', () => {
    it('should execute load test scenarios correctly', async () => {
      const scenarios = [
        { users: 5, duration: 1000 },
        { users: 10, duration: 1000 },
      ];

      const mockStudents = Array.from({ length: 10 }, (_, i) => ({
        id: `student-${i}`,
        role: 'student',
        studentProfile: {},
      }));

      mockUserRepository.find.mockResolvedValue(mockStudents);
      mockRecommendationService.generateRecommendations.mockResolvedValue({
        recommendations: [],
        fromCache: false,
      });

      const results = await service.runLoadTest(scenarios);

      expect(results).toHaveLength(2);
      expect(results[0].concurrentUsers).toBe(5);
      expect(results[1].concurrentUsers).toBe(10);

      results.forEach((result) => {
        expect(result).toHaveProperty('totalRequests');
        expect(result).toHaveProperty('successfulRequests');
        expect(result).toHaveProperty('failedRequests');
        expect(result).toHaveProperty('averageResponseTime');
        expect(result).toHaveProperty('requestsPerSecond');
        expect(result).toHaveProperty('errorRate');
        expect(result).toHaveProperty('memoryUsage');
      });
    });
  });

  describe('runABTest', () => {
    it('should execute A/B test correctly', async () => {
      const controlGroup = ['user-1', 'user-2'];
      const treatmentGroup = ['user-3', 'user-4'];

      // Mock the measureGroupPerformance method
      const mockMetrics = {
        accuracy: { meanAveragePrecision: 0.8 },
        relevance: { userSatisfactionScore: 0.7 },
        performance: { averageResponseTime: 1500, errorRate: 0.05 },
        diversity: { catalogCoverage: 0.6 },
        coverage: { userCoverage: 0.8 },
      };

      jest
        .spyOn(service as any, 'measureGroupPerformance')
        .mockResolvedValueOnce(mockMetrics) // control
        .mockResolvedValueOnce({
          // treatment
          ...mockMetrics,
          accuracy: { meanAveragePrecision: 0.85 },
        });

      const result = await service.runABTest(
        'Test Algorithm Comparison',
        controlGroup,
        treatmentGroup,
        60000,
      );

      expect(result).toHaveProperty('controlMetrics');
      expect(result).toHaveProperty('treatmentMetrics');
      expect(result).toHaveProperty('statisticalSignificance');
      expect(result).toHaveProperty('improvement');

      expect(result.improvement).toBeGreaterThan(0); // Treatment should be better
      expect(result.statisticalSignificance).toBe(true); // 5% improvement should be significant
    });
  });

  describe('generateBenchmarkReport', () => {
    it('should generate comprehensive benchmark report', async () => {
      const mockMetrics = {
        accuracy: {
          precisionAtK: { 5: 0.8 },
          recallAtK: { 5: 0.7 },
          f1ScoreAtK: { 5: 0.75 },
          meanAveragePrecision: 0.8,
          normalizedDiscountedCumulativeGain: { 5: 0.75 },
        },
        relevance: {
          averageSimilarityScore: 0.85,
          userSatisfactionScore: 0.8,
          clickThroughRate: 0.15,
          medianSimilarityScore: 0.8,
          similarityScoreDistribution: {},
        },
        performance: {
          averageResponseTime: 1500,
          p95ResponseTime: 2500,
          throughputPerSecond: 25,
          cacheHitRate: 0.75,
          errorRate: 0.02,
          medianResponseTime: 1200,
          p99ResponseTime: 3000,
          aiApiUsageRate: 0.8,
        },
        diversity: {
          specializationDiversity: 0.8,
          catalogCoverage: 0.6,
          intraListDiversity: 0.7,
          difficultyLevelDiversity: 0.6,
          supervisorDiversity: 0.7,
        },
        coverage: {
          userCoverage: 0.85,
          projectCoverage: 0.6,
          longTailCoverage: 0.3,
          specializationCoverage: 0.9,
        },
      };

      const report = await service.generateBenchmarkReport(mockMetrics);

      expect(report).toContain('Recommendation System Benchmark Report');
      expect(report).toContain('Precision@5: 80.00%');
      expect(report).toContain('Average Response Time: 1500ms');
      expect(report).toContain('Cache Hit Rate: 75.00%');
      expect(report).toContain('User Coverage: 85.00%');
      expect(report).toContain('Recommendations');
    });
  });
});

describe('PerformanceAnalyzerService', () => {
  let service: PerformanceAnalyzerService;
  let apiUsageRepository: Repository<AIApiUsage>;
  let recommendationRepository: Repository<Recommendation>;
  let feedbackRepository: Repository<RecommendationFeedback>;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceAnalyzerService,
        {
          provide: getRepositoryToken(AIApiUsage),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Recommendation),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(RecommendationFeedback),
          useValue: {
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<PerformanceAnalyzerService>(
      PerformanceAnalyzerService,
    );
    apiUsageRepository = module.get<Repository<AIApiUsage>>(
      getRepositoryToken(AIApiUsage),
    );
    recommendationRepository = module.get<Repository<Recommendation>>(
      getRepositoryToken(Recommendation),
    );
    feedbackRepository = module.get<Repository<RecommendationFeedback>>(
      getRepositoryToken(RecommendationFeedback),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzePerformance', () => {
    it('should perform comprehensive performance analysis', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Mock query results
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { date: '2024-01-01', count: '100' },
        { date: '2024-01-02', count: '120' },
      ]);

      mockQueryBuilder.getRawOne.mockResolvedValue({ count: '50' });

      const result = await service.analyzePerformance(startDate, endDate);

      expect(result).toHaveProperty('timeSeriesAnalysis');
      expect(result).toHaveProperty('userBehaviorAnalysis');
      expect(result).toHaveProperty('systemResourceAnalysis');
      expect(result).toHaveProperty('recommendationQualityTrends');
      expect(result).toHaveProperty('bottleneckAnalysis');
    });
  });

  describe('generateOptimizationRecommendations', () => {
    it('should generate optimization recommendations based on analysis', async () => {
      const mockAnalysis = {
        timeSeriesAnalysis: {
          responseTimesTrend: [
            {
              date: '2024-01-01',
              avgResponseTime: 3000,
              p95ResponseTime: 5000,
            },
          ],
          errorRatesTrend: [{ date: '2024-01-01', errorRate: 0.08 }],
          dailyRequestVolume: [],
          hourlyDistribution: [],
        },
        systemResourceAnalysis: {
          cachePerformance: { hitRate: 0.6, missRate: 0.4, evictionRate: 0.1 },
          memoryUsageTrends: [],
          databasePerformance: { avgQueryTime: 100, slowQueries: 2 },
          aiApiUsagePatterns: [],
        },
        recommendationQualityTrends: {
          userSatisfactionTrends: [{ date: '2024-01-01', satisfaction: 0.6 }],
          accuracyOverTime: [],
          diversityTrends: [],
          recommendationFreshness: [],
        },
        bottleneckAnalysis: {
          slowestOperations: [
            {
              operation: '/api/recommendations',
              avgTime: 4000,
              frequency: 100,
            },
          ],
          resourceConstraints: [],
          scalabilityLimits: [],
        },
        userBehaviorAnalysis: {
          engagementPatterns: [],
          feedbackDistribution: [],
          userRetentionMetrics: [],
          clickThroughRates: [],
        },
      };

      const recommendations =
        await service.generateOptimizationRecommendations(mockAnalysis);

      expect(recommendations).toContain(
        'Consider implementing response time optimization - current average exceeds 2 seconds',
      );
      expect(recommendations).toContain(
        'Error rate exceeds 5% - investigate and improve error handling',
      );
      expect(recommendations).toContain(
        'Cache hit rate below 70% - optimize caching strategy',
      );
      expect(recommendations).toContain(
        'User satisfaction below 70% - review recommendation algorithms',
      );
      expect(recommendations).toContain(
        'Optimize /api/recommendations - average response time exceeds 3 seconds',
      );
    });
  });
});
