import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { HuggingFaceService } from '../hugging-face.service';
import { AIRateLimiterService } from '../ai-rate-limiter.service';
import { CircuitBreakerService } from '../circuit-breaker.service';
import { RecommendationService } from '../recommendation.service';
import { FallbackRecommendationService } from '../fallback-recommendation.service';
import { EmbeddingService } from '../embedding.service';
import { SimilarityService } from '../similarity.service';
import { TextProcessingService } from '../text-processing.service';
import { RecommendationCacheService } from '../recommendation-cache.service';
import { FeedbackLearningService } from '../feedback-learning.service';
import { ExplanationService } from '../explanation.service';
import { ProgressiveLoadingService } from '../progressive-loading.service';

import { AIApiUsage } from '../../entities/ai-api-usage.entity';
import { Recommendation } from '../../entities/recommendation.entity';
import { RecommendationFeedback } from '../../entities/recommendation-feedback.entity';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { StudentProfile } from '../../entities/student-profile.entity';

import { ApprovalStatus } from '../../common/enums/approval-status.enum';

// Mock the @huggingface/inference module
jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => ({
    featureExtraction: jest.fn(),
  })),
}));

describe('Recommendation Performance Benchmarks', () => {
  let recommendationService: RecommendationService;
  let fallbackService: FallbackRecommendationService;
  let huggingFaceService: HuggingFaceService;
  let embeddingService: EmbeddingService;
  let similarityService: SimilarityService;
  let cacheService: RecommendationCacheService;

  let mockHfInference: any;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockConfig = {
    'huggingFace.apiKey': 'test-api-key',
    'huggingFace.model': 'sentence-transformers/all-MiniLM-L6-v2',
    'huggingFace.timeout': 10000,
    'huggingFace.maxTokensPerRequest': 512,
    'huggingFace.retryAttempts': 3,
    'huggingFace.retryDelayMs': 1000,
    'huggingFace.rateLimitPerMinute': 10,
    'huggingFace.rateLimitPerMonth': 30000,
  };

  // Generate test data sets of different sizes
  const generateTestProjects = (count: number): Project[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `project${i}`,
      title: `Test Project ${i}`,
      abstract: `This is a test project ${i} with various technologies and requirements. It involves ${i % 2 === 0 ? 'web development' : 'machine learning'} and requires skills in ${i % 3 === 0 ? 'JavaScript' : i % 3 === 1 ? 'Python' : 'Java'}.`,
      specialization:
        i % 3 === 0
          ? 'Web Development & Full Stack'
          : i % 3 === 1
            ? 'Machine Learning & AI'
            : 'Mobile Development',
      difficultyLevel:
        i % 3 === 0 ? 'beginner' : i % 3 === 1 ? 'intermediate' : 'advanced',
      technologyStack:
        i % 2 === 0
          ? ['JavaScript', 'React', 'Node.js']
          : ['Python', 'TensorFlow', 'NumPy'],
      tags: [`tag${i}`, `category${i % 5}`],
      approvalStatus: ApprovalStatus.APPROVED,
      supervisor: {
        id: `supervisor${i % 3}`,
        supervisorProfile: {
          name: `Dr. Supervisor ${i % 3}`,
          specializations: ['Test Specialization'],
        },
      },
    })) as Project[];
  };

  const generateTestStudentProfile = (
    complexity: 'simple' | 'complex',
  ): StudentProfile => {
    if (complexity === 'simple') {
      return {
        id: 'student1',
        skills: ['JavaScript', 'React'],
        interests: ['Web Development'],
        preferredSpecializations: ['Web Development & Full Stack'],
        user: { id: 'user1' },
      } as StudentProfile;
    } else {
      return {
        id: 'student1',
        skills: [
          'JavaScript',
          'React',
          'Node.js',
          'Python',
          'TensorFlow',
          'Machine Learning',
          'Java',
          'Android',
          'Kotlin',
        ],
        interests: [
          'Web Development',
          'Machine Learning',
          'Mobile Development',
          'Data Science',
          'AI',
          'Full Stack',
        ],
        preferredSpecializations: [
          'Web Development & Full Stack',
          'Machine Learning & AI',
          'Mobile Development',
        ],
        user: { id: 'user1' },
      } as StudentProfile;
    }
  };

  beforeEach(async () => {
    const { HfInference } = require('@huggingface/inference');
    mockHfInference = {
      featureExtraction: jest.fn(),
    };
    HfInference.mockImplementation(() => mockHfInference);

    const mockRepositories = {
      aiUsage: {
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
          getCount: jest.fn().mockResolvedValue(0),
        })),
      },
      recommendation: {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
      },
      feedback: {
        create: jest.fn(),
        save: jest.fn(),
      },
      user: {
        findOne: jest.fn(),
      },
      project: {
        createQueryBuilder: jest.fn(() => ({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        })),
      },
      studentProfile: {
        findOne: jest.fn(),
      },
    };

    const mockServices = {
      embedding: {
        generateEmbeddings: jest.fn(),
      },
      similarity: {
        calculateSimilarity: jest.fn(),
        calculateBatchSimilarity: jest.fn(),
      },
      textProcessing: {
        processStudentProfile: jest.fn(),
        processProject: jest.fn(),
      },
      cache: {
        getCachedRecommendations: jest.fn(),
        setCachedRecommendations: jest.fn(),
        invalidateRecommendations: jest.fn(),
      },
      feedbackLearning: {
        getRecommendationAdjustments: jest.fn(),
        trackImplicitFeedback: jest.fn(),
      },
      explanation: {
        generateAccessibleExplanation: jest.fn(),
      },
      progressiveLoading: {
        startRequest: jest.fn(),
        updateProgress: jest.fn(),
        completeRequest: jest.fn(),
        failRequest: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HuggingFaceService,
        AIRateLimiterService,
        CircuitBreakerService,
        RecommendationService,
        FallbackRecommendationService,
        EmbeddingService,
        SimilarityService,
        TextProcessingService,
        RecommendationCacheService,
        FeedbackLearningService,
        ExplanationService,
        ProgressiveLoadingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
        {
          provide: getRepositoryToken(AIApiUsage),
          useValue: mockRepositories.aiUsage,
        },
        {
          provide: getRepositoryToken(Recommendation),
          useValue: mockRepositories.recommendation,
        },
        {
          provide: getRepositoryToken(RecommendationFeedback),
          useValue: mockRepositories.feedback,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepositories.user,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockRepositories.project,
        },
        {
          provide: getRepositoryToken(StudentProfile),
          useValue: mockRepositories.studentProfile,
        },
      ],
    }).compile();

    recommendationService = module.get<RecommendationService>(
      RecommendationService,
    );
    fallbackService = module.get<FallbackRecommendationService>(
      FallbackRecommendationService,
    );
    huggingFaceService = module.get<HuggingFaceService>(HuggingFaceService);
    embeddingService = module.get<EmbeddingService>(EmbeddingService);
    similarityService = module.get<SimilarityService>(SimilarityService);
    cacheService = module.get<RecommendationCacheService>(
      RecommendationCacheService,
    );

    projectRepository = module.get(getRepositoryToken(Project));
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Embedding Generation Performance', () => {
    it('should generate embeddings for small text batches within 2 seconds', async () => {
      const mockEmbedding = Array.from({ length: 384 }, () => Math.random()); // Typical embedding size
      mockHfInference.featureExtraction.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockEmbedding), 100),
          ),
      );

      const texts = Array.from(
        { length: 5 },
        (_, i) => `Test text ${i} for embedding generation`,
      );

      const startTime = Date.now();
      const result = await huggingFaceService.generateEmbeddings(texts);
      const endTime = Date.now();

      expect(result).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle large text batches efficiently', async () => {
      const mockEmbedding = Array.from({ length: 384 }, () => Math.random());
      mockHfInference.featureExtraction.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockEmbedding), 50),
          ),
      );

      const texts = Array.from(
        { length: 20 },
        (_, i) =>
          `This is a longer test text ${i} that contains more content and should test the performance of embedding generation with larger inputs. It includes various technical terms and project descriptions.`,
      );

      const startTime = Date.now();
      const result = await huggingFaceService.generateEmbeddings(texts);
      const endTime = Date.now();

      expect(result).toHaveLength(20);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain performance with concurrent embedding requests', async () => {
      const mockEmbedding = Array.from({ length: 384 }, () => Math.random());
      mockHfInference.featureExtraction.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockEmbedding), 100),
          ),
      );

      const concurrentRequests = 3;
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        huggingFaceService.generateEmbeddings([`Concurrent text ${i}`]),
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(concurrentRequests);
      expect(endTime - startTime).toBeLessThan(3000); // Should handle concurrent requests efficiently
    });
  });

  describe('Similarity Calculation Performance', () => {
    it('should calculate similarity for small datasets quickly', async () => {
      const embedding1 = Array.from({ length: 384 }, () => Math.random());
      const embedding2 = Array.from({ length: 384 }, () => Math.random());

      const startTime = Date.now();
      const result = similarityService.calculateSimilarity(
        embedding1,
        embedding2,
      );
      const endTime = Date.now();

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast for single calculation
    });

    it('should handle batch similarity calculations efficiently', async () => {
      const studentEmbedding = Array.from({ length: 384 }, () => Math.random());
      const projectEmbeddings = Array.from({ length: 100 }, () =>
        Array.from({ length: 384 }, () => Math.random()),
      );

      const startTime = Date.now();
      const result = similarityService.calculateBatchSimilarity(
        studentEmbedding,
        projectEmbeddings,
        {
          normalizeScores: true,
          includeRanking: true,
          maxResults: 10,
        },
      );
      const endTime = Date.now();

      expect(result.similarities).toHaveLength(100);
      expect(result.rankedIndices).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should scale linearly with dataset size', async () => {
      const studentEmbedding = Array.from({ length: 384 }, () => Math.random());

      // Test with different dataset sizes
      const sizes = [10, 50, 100];
      const times: number[] = [];

      for (const size of sizes) {
        const projectEmbeddings = Array.from({ length: size }, () =>
          Array.from({ length: 384 }, () => Math.random()),
        );

        const startTime = Date.now();
        similarityService.calculateBatchSimilarity(
          studentEmbedding,
          projectEmbeddings,
          {
            normalizeScores: true,
            maxResults: 10,
          },
        );
        const endTime = Date.now();

        times.push(endTime - startTime);
      }

      // Performance should scale reasonably (not exponentially)
      expect(times[2]).toBeLessThan(times[0] * 15); // 100 items shouldn't take 15x longer than 10 items
    });
  });

  describe('Fallback Recommendation Performance', () => {
    it('should generate rule-based recommendations quickly for small datasets', async () => {
      const projects = generateTestProjects(10);
      const studentProfile = generateTestStudentProfile('simple');

      const mockQueryBuilder = projectRepository.createQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(projects);

      const startTime = Date.now();
      const result = await fallbackService.generateRuleBasedRecommendations(
        studentProfile,
        { limit: 5 },
      );
      const endTime = Date.now();

      expect(result.recommendations.length).toBeLessThanOrEqual(5);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
      expect(result.metadata.processingTimeMs).toBeLessThan(400);
    });

    it('should handle medium datasets efficiently', async () => {
      const projects = generateTestProjects(100);
      const studentProfile = generateTestStudentProfile('complex');

      const mockQueryBuilder = projectRepository.createQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(projects);

      const startTime = Date.now();
      const result = await fallbackService.generateRuleBasedRecommendations(
        studentProfile,
        { limit: 10 },
      );
      const endTime = Date.now();

      expect(result.recommendations.length).toBeLessThanOrEqual(10);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(result.metadata.projectsAnalyzed).toBe(100);
    });

    it('should maintain performance with large datasets', async () => {
      const projects = generateTestProjects(500);
      const studentProfile = generateTestStudentProfile('complex');

      const mockQueryBuilder = projectRepository.createQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(projects);

      const startTime = Date.now();
      const result = await fallbackService.generateRuleBasedRecommendations(
        studentProfile,
        { limit: 10 },
      );
      const endTime = Date.now();

      expect(result.recommendations.length).toBeLessThanOrEqual(10);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds even for large datasets
      expect(result.metadata.projectsAnalyzed).toBe(500);
    });

    it('should handle concurrent fallback requests efficiently', async () => {
      const projects = generateTestProjects(50);
      const studentProfile = generateTestStudentProfile('simple');

      const mockQueryBuilder = projectRepository.createQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(projects);

      const concurrentRequests = 5;
      const promises = Array.from({ length: concurrentRequests }, () =>
        fallbackService.generateRuleBasedRecommendations(studentProfile, {
          limit: 5,
        }),
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(concurrentRequests);
      expect(endTime - startTime).toBeLessThan(3000); // All requests should complete within 3 seconds

      results.forEach((result) => {
        expect(result.recommendations.length).toBeLessThanOrEqual(5);
        expect(result.metadata.processingTimeMs).toBeLessThan(1000);
      });
    });
  });

  describe('Cache Performance', () => {
    it('should provide instant cache hits', async () => {
      const mockRecommendations = {
        recommendations: [],
        reasoning: 'Cached recommendations',
        averageSimilarityScore: 0.7,
        fromCache: true,
        generatedAt: new Date(),
        metadata: { method: 'cached', processingTimeMs: 0 },
      };

      (cacheService.getCachedRecommendations as jest.Mock).mockResolvedValue(
        mockRecommendations,
      );

      const startTime = Date.now();
      const result = await cacheService.getCachedRecommendations('user123');
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result?.fromCache).toBe(true);
      expect(endTime - startTime).toBeLessThan(50); // Cache hits should be nearly instant
    });

    it('should handle cache misses gracefully', async () => {
      (cacheService.getCachedRecommendations as jest.Mock).mockResolvedValue(
        null,
      );

      const startTime = Date.now();
      const result = await cacheService.getCachedRecommendations('user123');
      const endTime = Date.now();

      expect(result).toBeNull();
      expect(endTime - startTime).toBeLessThan(100); // Cache misses should still be fast
    });

    it('should cache recommendations quickly', async () => {
      const mockRecommendations = {
        recommendations: [],
        reasoning: 'Test recommendations',
        averageSimilarityScore: 0.7,
        fromCache: false,
        generatedAt: new Date(),
        metadata: { method: 'ai', processingTimeMs: 1000 },
      };

      (cacheService.setCachedRecommendations as jest.Mock).mockResolvedValue(
        undefined,
      );

      const startTime = Date.now();
      await cacheService.setCachedRecommendations(
        'user123',
        mockRecommendations,
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200); // Caching should be fast
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should not leak memory during repeated operations', async () => {
      const projects = generateTestProjects(20);
      const studentProfile = generateTestStudentProfile('simple');

      const mockQueryBuilder = projectRepository.createQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(projects);

      // Simulate memory usage tracking
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform multiple operations
      for (let i = 0; i < 10; i++) {
        await fallbackService.generateRuleBasedRecommendations(studentProfile, {
          limit: 5,
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large embedding arrays efficiently', async () => {
      const largeEmbedding = Array.from({ length: 1536 }, () => Math.random()); // Large embedding size
      const projectEmbeddings = Array.from({ length: 50 }, () =>
        Array.from({ length: 1536 }, () => Math.random()),
      );

      const startTime = Date.now();
      const result = similarityService.calculateBatchSimilarity(
        largeEmbedding,
        projectEmbeddings,
        {
          normalizeScores: true,
          maxResults: 10,
        },
      );
      const endTime = Date.now();

      expect(result.similarities).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(2000); // Should handle large embeddings efficiently
    });
  });

  describe('Stress Testing', () => {
    it('should handle high-frequency requests without degradation', async () => {
      const projects = generateTestProjects(30);
      const studentProfile = generateTestStudentProfile('simple');

      const mockQueryBuilder = projectRepository.createQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(projects);

      const requestCount = 20;
      const times: number[] = [];

      // Make sequential requests and measure individual times
      for (let i = 0; i < requestCount; i++) {
        const startTime = Date.now();
        await fallbackService.generateRuleBasedRecommendations(studentProfile, {
          limit: 5,
        });
        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      // Performance should not degrade significantly over time
      const firstHalf = times.slice(0, requestCount / 2);
      const secondHalf = times.slice(requestCount / 2);

      const avgFirstHalf =
        firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
      const avgSecondHalf =
        secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;

      // Second half shouldn't be more than 50% slower than first half
      expect(avgSecondHalf).toBeLessThan(avgFirstHalf * 1.5);
    });

    it('should maintain accuracy under performance pressure', async () => {
      const projects = generateTestProjects(100);
      const studentProfile = generateTestStudentProfile('complex');

      const mockQueryBuilder = projectRepository.createQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(projects);

      // Generate recommendations under time pressure
      const startTime = Date.now();
      const result = await fallbackService.generateRuleBasedRecommendations(
        studentProfile,
        {
          limit: 10,
          minSimilarityScore: 0.3,
        },
      );
      const endTime = Date.now();

      // Should still maintain quality despite performance requirements
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.averageSimilarityScore).toBeGreaterThanOrEqual(0.3);
      expect(endTime - startTime).toBeLessThan(3000);

      // All recommendations should meet quality criteria
      result.recommendations.forEach((rec) => {
        expect(rec.similarityScore).toBeGreaterThanOrEqual(0.3);
        expect(rec.reasoning).toBeTruthy();
        expect(
          rec.matchingSkills.length + rec.matchingInterests.length,
        ).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Regression Detection', () => {
    it('should establish baseline performance metrics', async () => {
      const projects = generateTestProjects(50);
      const studentProfile = generateTestStudentProfile('simple');

      const mockQueryBuilder = projectRepository.createQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(projects);

      const iterations = 5;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await fallbackService.generateRuleBasedRecommendations(studentProfile, {
          limit: 10,
        });
        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      // Establish baseline expectations
      expect(avgTime).toBeLessThan(1500); // Average should be under 1.5 seconds
      expect(maxTime).toBeLessThan(2500); // Max should be under 2.5 seconds
      expect(maxTime - minTime).toBeLessThan(1000); // Variance should be reasonable

      console.log(
        `Performance baseline - Avg: ${avgTime}ms, Min: ${minTime}ms, Max: ${maxTime}ms`,
      );
    });

    it('should detect performance anomalies', async () => {
      const projects = generateTestProjects(25);
      const studentProfile = generateTestStudentProfile('simple');

      const mockQueryBuilder = projectRepository.createQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(projects);

      const measurements: number[] = [];
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await fallbackService.generateRuleBasedRecommendations(studentProfile, {
          limit: 5,
        });
        const endTime = Date.now();
        measurements.push(endTime - startTime);
      }

      // Calculate statistics
      const avg =
        measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
      const variance =
        measurements.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) /
        measurements.length;
      const stdDev = Math.sqrt(variance);

      // No measurement should be more than 3 standard deviations from the mean (outlier detection)
      measurements.forEach((time) => {
        expect(Math.abs(time - avg)).toBeLessThan(3 * stdDev);
      });

      console.log(
        `Performance stats - Avg: ${avg.toFixed(2)}ms, StdDev: ${stdDev.toFixed(2)}ms`,
      );
    });
  });
});
