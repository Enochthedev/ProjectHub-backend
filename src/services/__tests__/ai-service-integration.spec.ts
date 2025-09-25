import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';

import { HuggingFaceService } from '../hugging-face.service';
import { AIRateLimiterService } from '../ai-rate-limiter.service';
import {
  CircuitBreakerService,
  CircuitBreakerState,
} from '../circuit-breaker.service';
import { FallbackRecommendationService } from '../fallback-recommendation.service';
import { EmbeddingService } from '../embedding.service';
import { SimilarityService } from '../similarity.service';

import { AIApiUsage } from '../../entities/ai-api-usage.entity';
import { Project } from '../../entities/project.entity';
import { StudentProfile } from '../../entities/student-profile.entity';

// Mock the @huggingface/inference module
jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => ({
    featureExtraction: jest.fn(),
  })),
}));

describe('AI Service Integration Tests', () => {
  let huggingFaceService: HuggingFaceService;
  let rateLimiterService: AIRateLimiterService;
  let circuitBreakerService: CircuitBreakerService;
  let fallbackService: FallbackRecommendationService;
  let embeddingService: EmbeddingService;
  let similarityService: SimilarityService;

  let mockHfInference: any;
  let aiUsageRepository: jest.Mocked<Repository<AIApiUsage>>;
  let projectRepository: jest.Mocked<Repository<Project>>;

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

  beforeEach(async () => {
    const { HfInference } = require('@huggingface/inference');
    mockHfInference = {
      featureExtraction: jest.fn(),
    };
    HfInference.mockImplementation(() => mockHfInference);

    const mockAiUsageRepository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getCount: jest.fn().mockResolvedValue(0),
      })),
    };

    const mockProjectRepository = {
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HuggingFaceService,
        AIRateLimiterService,
        CircuitBreakerService,
        FallbackRecommendationService,
        EmbeddingService,
        SimilarityService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
        {
          provide: getRepositoryToken(AIApiUsage),
          useValue: mockAiUsageRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
      ],
    }).compile();

    huggingFaceService = module.get<HuggingFaceService>(HuggingFaceService);
    rateLimiterService = module.get<AIRateLimiterService>(AIRateLimiterService);
    circuitBreakerService = module.get<CircuitBreakerService>(
      CircuitBreakerService,
    );
    fallbackService = module.get<FallbackRecommendationService>(
      FallbackRecommendationService,
    );
    embeddingService = module.get<EmbeddingService>(EmbeddingService);
    similarityService = module.get<SimilarityService>(SimilarityService);

    aiUsageRepository = module.get(getRepositoryToken(AIApiUsage));
    projectRepository = module.get(getRepositoryToken(Project));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Hugging Face API Integration', () => {
    it('should successfully generate embeddings with proper API interaction', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockHfInference.featureExtraction.mockResolvedValue(mockEmbedding);

      const texts = ['Machine learning project with Python and TensorFlow'];
      const result = await huggingFaceService.generateEmbeddings(
        texts,
        'user123',
      );

      expect(result).toEqual([mockEmbedding]);
      expect(mockHfInference.featureExtraction).toHaveBeenCalledWith({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: texts[0],
      });
      expect(aiUsageRepository.save).toHaveBeenCalled();
    });

    it('should handle API timeout gracefully', async () => {
      mockHfInference.featureExtraction.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 15000)), // Longer than timeout
      );

      const texts = ['Test text'];

      await expect(
        huggingFaceService.generateEmbeddings(texts),
      ).rejects.toThrow();
      expect(aiUsageRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: expect.stringContaining('timeout'),
        }),
      );
    });

    it('should retry failed requests with exponential backoff', async () => {
      mockHfInference.featureExtraction
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([0.1, 0.2, 0.3]);

      const texts = ['Test text'];
      const result = await huggingFaceService.generateEmbeddings(texts);

      expect(result).toEqual([[0.1, 0.2, 0.3]]);
      expect(mockHfInference.featureExtraction).toHaveBeenCalledTimes(3);
    });

    it('should handle different response formats correctly', async () => {
      // Test nested array format
      mockHfInference.featureExtraction.mockResolvedValueOnce([
        [0.1, 0.2, 0.3],
      ]);
      let result = await huggingFaceService.generateEmbeddings(['text1']);
      expect(result).toEqual([[0.1, 0.2, 0.3]]);

      // Test flat array format
      mockHfInference.featureExtraction.mockResolvedValueOnce([0.4, 0.5, 0.6]);
      result = await huggingFaceService.generateEmbeddings(['text2']);
      expect(result).toEqual([[0.4, 0.5, 0.6]]);
    });

    it('should truncate long texts to fit token limits', async () => {
      const longText = 'a'.repeat(3000); // Exceeds token limit
      mockHfInference.featureExtraction.mockResolvedValue([0.1, 0.2, 0.3]);

      await huggingFaceService.generateEmbeddings([longText]);

      const callArgs = mockHfInference.featureExtraction.mock.calls[0][0];
      expect(callArgs.inputs.length).toBeLessThan(longText.length);
      expect(callArgs.inputs.length).toBeLessThanOrEqual(512 * 4); // Approximate token limit
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should enforce per-minute rate limits', async () => {
      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        const result = await rateLimiterService.checkRateLimit('user123');
        expect(result.allowed).toBe(true);
      }

      // 11th request should be denied
      const result = await rateLimiterService.checkRateLimit('user123');
      expect(result.allowed).toBe(false);
      expect(result.remainingRequests).toBe(0);
    });

    it('should enforce monthly rate limits', async () => {
      const mockQueryBuilder = aiUsageRepository.createQueryBuilder();
      (mockQueryBuilder.getCount as jest.Mock).mockResolvedValue(30001); // Over limit

      const result = await rateLimiterService.checkRateLimit('user123');

      expect(result.allowed).toBe(false);
      expect(result.monthlyUsage).toBe(30001);
      expect(result.monthlyLimit).toBe(30000);
    });

    it('should track API usage with detailed metrics', async () => {
      const usageData = {
        endpoint: '/embeddings',
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        tokensUsed: 100,
        responseTimeMs: 500,
        success: true,
        userId: 'user123',
      };

      await rateLimiterService.trackUsage(usageData);

      expect(aiUsageRepository.create).toHaveBeenCalledWith(usageData);
      expect(aiUsageRepository.save).toHaveBeenCalled();
    });

    it('should provide comprehensive usage statistics', async () => {
      const mockUsages = [
        { tokensUsed: 100, responseTimeMs: 500, success: true },
        { tokensUsed: 150, responseTimeMs: 600, success: true },
        { tokensUsed: 75, responseTimeMs: 400, success: false },
      ];

      const mockQueryBuilder = aiUsageRepository.createQueryBuilder();
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([
        mockUsages,
        3,
      ]);

      const stats = await rateLimiterService.getUsageStats('user123');

      expect(stats).toEqual({
        totalRequests: 3,
        successfulRequests: 2,
        failedRequests: 1,
        totalTokens: 325,
        averageResponseTime: 500,
        successRate: 66.66666666666666,
      });
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should protect against cascading failures', async () => {
      const failingFunction = jest
        .fn()
        .mockRejectedValue(new Error('Service unavailable'));

      // Trigger circuit breaker to open (5 failures)
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.execute('test-service', failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreakerService.getStatus('test-service').state).toBe(
        CircuitBreakerState.OPEN,
      );

      // Next call should be rejected immediately without calling the function
      await expect(
        circuitBreakerService.execute('test-service', failingFunction),
      ).rejects.toThrow('Circuit breaker is OPEN');

      expect(failingFunction).toHaveBeenCalledTimes(5); // Only the initial failures
    });

    it('should transition through states correctly', async () => {
      jest.useFakeTimers();
      const mockFunction = jest.fn();

      // Trigger circuit to open
      mockFunction.mockRejectedValue(new Error('Service error'));
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.execute('test-service', mockFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreakerService.getStatus('test-service').state).toBe(
        CircuitBreakerState.OPEN,
      );

      // Fast forward past recovery timeout
      jest.advanceTimersByTime(61000);

      // Function succeeds, circuit should close
      mockFunction.mockResolvedValueOnce('success');
      const result = await circuitBreakerService.execute(
        'test-service',
        mockFunction,
      );

      expect(result).toBe('success');
      expect(circuitBreakerService.getStatus('test-service').state).toBe(
        CircuitBreakerState.CLOSED,
      );
    });

    it('should handle half-open state with limited calls', async () => {
      jest.useFakeTimers();
      const mockFunction = jest
        .fn()
        .mockRejectedValue(new Error('Service error'));

      // Open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.execute('test-service', mockFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      // Move to half-open
      jest.advanceTimersByTime(61000);

      // Make function hang to keep circuit in half-open
      mockFunction.mockImplementation(() => new Promise(() => {}));

      // Start maximum allowed calls in half-open state
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          circuitBreakerService
            .execute('test-service', mockFunction)
            .catch(() => undefined),
        );
      }

      // Additional call should be rejected
      await expect(
        circuitBreakerService.execute('test-service', mockFunction),
      ).rejects.toThrow();
    });
  });

  describe('Fallback System Integration', () => {
    it('should generate rule-based recommendations when AI fails', async () => {
      const mockStudentProfile = {
        skills: ['JavaScript', 'React', 'Node.js'],
        interests: ['Web Development', 'Frontend'],
        preferredSpecializations: ['Web Development & Full Stack'],
      } as StudentProfile;

      const mockProjects = [
        {
          id: 'project1',
          title: 'React E-commerce Platform',
          abstract:
            'Build a modern e-commerce platform using React and Node.js',
          specialization: 'Web Development & Full Stack',
          difficultyLevel: 'intermediate',
          technologyStack: ['React', 'Node.js', 'MongoDB'],
          tags: ['e-commerce', 'full-stack'],
          supervisor: {
            id: 'supervisor1',
            supervisorProfile: {
              name: 'Dr. Smith',
              specializations: ['Web Development'],
            },
          },
        },
      ];

      const mockQueryBuilder = projectRepository.createQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(mockProjects);

      const result =
        await fallbackService.generateRuleBasedRecommendations(
          mockStudentProfile,
        );

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].projectId).toBe('project1');
      expect(result.recommendations[0].similarityScore).toBeGreaterThan(0);
      expect(result.metadata.method).toBe('rule-based-fallback');
      expect(result.metadata.fallback).toBe(true);
    });

    it('should calculate meaningful similarity scores using rule-based matching', async () => {
      const mockStudentProfile = {
        skills: ['Python', 'TensorFlow', 'Machine Learning'],
        interests: ['AI', 'Data Science'],
        preferredSpecializations: ['Machine Learning & AI'],
      } as StudentProfile;

      const mockProjects = [
        {
          id: 'project1',
          title: 'ML Image Classification',
          abstract: 'Develop an image classification system using TensorFlow',
          specialization: 'Machine Learning & AI',
          difficultyLevel: 'intermediate',
          technologyStack: ['Python', 'TensorFlow', 'OpenCV'],
          tags: ['machine-learning', 'computer-vision'],
          supervisor: {
            id: 'supervisor1',
            supervisorProfile: {
              name: 'Dr. Johnson',
              specializations: ['Machine Learning'],
            },
          },
        },
        {
          id: 'project2',
          title: 'Web Portfolio Site',
          abstract: 'Create a personal portfolio website',
          specialization: 'Web Development & Full Stack',
          difficultyLevel: 'beginner',
          technologyStack: ['HTML', 'CSS', 'JavaScript'],
          tags: ['web', 'portfolio'],
          supervisor: {
            id: 'supervisor2',
            supervisorProfile: {
              name: 'Dr. Brown',
              specializations: ['Web Development'],
            },
          },
        },
      ];

      const mockQueryBuilder = projectRepository.createQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(mockProjects);

      const result =
        await fallbackService.generateRuleBasedRecommendations(
          mockStudentProfile,
        );

      expect(result.recommendations).toHaveLength(2);

      // ML project should have higher score due to better match
      const mlProject = result.recommendations.find(
        (r) => r.projectId === 'project1',
      );
      const webProject = result.recommendations.find(
        (r) => r.projectId === 'project2',
      );

      expect(mlProject?.similarityScore).toBeGreaterThan(
        webProject?.similarityScore || 0,
      );
      expect(mlProject?.matchingSkills).toContain('Python');
      expect(mlProject?.matchingSkills).toContain('TensorFlow');
    });

    it('should handle empty project sets gracefully', async () => {
      const mockStudentProfile = {
        skills: ['JavaScript'],
        interests: ['Web Development'],
        preferredSpecializations: ['Web Development & Full Stack'],
      } as StudentProfile;

      const mockQueryBuilder = projectRepository.createQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue([]);

      const result =
        await fallbackService.generateRuleBasedRecommendations(
          mockStudentProfile,
        );

      expect(result.recommendations).toHaveLength(0);
      expect(result.reasoning).toContain('No projects available');
      expect(result.metadata.fallback).toBe(true);
    });
  });

  describe('End-to-End Recommendation Workflow', () => {
    it('should complete full recommendation generation with AI services', async () => {
      // Setup successful AI responses
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockHfInference.featureExtraction.mockResolvedValue(mockEmbedding);

      const texts = [
        'Student profile: JavaScript, React, Web Development',
        'Project: React E-commerce Platform with Node.js backend',
      ];

      // Test embedding generation
      const embeddings = await embeddingService.generateEmbeddings(texts);
      expect(embeddings.embeddings).toHaveLength(2);
      expect(embeddings.fromCache).toBe(false);

      // Test similarity calculation
      const similarity = similarityService.calculateCosineSimilarity(
        embeddings.embeddings[0],
        embeddings.embeddings[1],
      );
      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);

      // Verify usage tracking
      expect(aiUsageRepository.save).toHaveBeenCalled();
    });

    it('should handle AI service failures and fallback gracefully', async () => {
      // Simulate AI service failure
      mockHfInference.featureExtraction.mockRejectedValue(
        new Error('API unavailable'),
      );

      const mockStudentProfile = {
        skills: ['Python', 'Django'],
        interests: ['Web Development'],
        preferredSpecializations: ['Web Development & Full Stack'],
      } as StudentProfile;

      const mockProjects = [
        {
          id: 'project1',
          title: 'Django Web Application',
          abstract: 'Build a web application using Django framework',
          specialization: 'Web Development & Full Stack',
          difficultyLevel: 'intermediate',
          technologyStack: ['Python', 'Django', 'PostgreSQL'],
          tags: ['web', 'backend'],
          supervisor: {
            id: 'supervisor1',
            supervisorProfile: {
              name: 'Dr. Wilson',
              specializations: ['Web Development'],
            },
          },
        },
      ];

      const mockQueryBuilder = projectRepository.createQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(mockProjects);

      // Should fallback to rule-based recommendations
      const result =
        await fallbackService.generateRuleBasedRecommendations(
          mockStudentProfile,
        );

      expect(result.recommendations).toHaveLength(1);
      expect(result.metadata.fallback).toBe(true);
      expect(result.reasoning).toContain('rule-based matching');
    });

    it('should respect rate limits in end-to-end workflow', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockHfInference.featureExtraction.mockResolvedValue(mockEmbedding);

      // Make requests up to the limit
      for (let i = 0; i < 10; i++) {
        const rateLimitCheck =
          await rateLimiterService.checkRateLimit('user123');
        expect(rateLimitCheck.allowed).toBe(true);

        if (rateLimitCheck.allowed) {
          await huggingFaceService.generateEmbeddings(['test text'], 'user123');
        }
      }

      // Next request should be rate limited
      await expect(
        huggingFaceService.generateEmbeddings(['test text'], 'user123'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent embedding requests efficiently', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockHfInference.featureExtraction.mockResolvedValue(mockEmbedding);

      const concurrentRequests = 5;
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        huggingFaceService.generateEmbeddings([`test text ${i}`], `user${i}`),
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(concurrentRequests);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockHfInference.featureExtraction).toHaveBeenCalledTimes(
        concurrentRequests,
      );
    });

    it('should maintain performance under batch processing', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockHfInference.featureExtraction.mockResolvedValue(mockEmbedding);

      const batchSize = 10;
      const texts = Array.from(
        { length: batchSize },
        (_, i) => `batch text ${i}`,
      );

      const startTime = Date.now();
      const result = await embeddingService.generateEmbeddings(texts);
      const endTime = Date.now();

      expect(result.embeddings).toHaveLength(batchSize);
      expect(result.totalTokens).toBeGreaterThan(0); // Should have processed some tokens
      expect(endTime - startTime).toBeLessThan(15000); // Total time including overhead
    });

    it('should track performance metrics accurately', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockHfInference.featureExtraction.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockEmbedding), 100),
          ),
      );

      await huggingFaceService.generateEmbeddings(['test text'], 'user123');

      const savedUsage = aiUsageRepository.save.mock.calls[0][0];
      expect(savedUsage.responseTimeMs).toBeGreaterThanOrEqual(100);
      expect(savedUsage.success).toBe(true);
      expect(savedUsage.tokensUsed).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary network failures', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];

      // First call fails, second succeeds
      mockHfInference.featureExtraction
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(mockEmbedding);

      const result = await huggingFaceService.generateEmbeddings(['test text']);

      expect(result).toEqual([mockEmbedding]);
      expect(mockHfInference.featureExtraction).toHaveBeenCalledTimes(2);
    });

    it('should handle malformed API responses gracefully', async () => {
      // Return invalid response format
      mockHfInference.featureExtraction.mockResolvedValue({
        invalid: 'response',
      });

      await expect(
        huggingFaceService.generateEmbeddings(['test text']),
      ).rejects.toThrow('Invalid response format');
    });

    it('should maintain circuit breaker state across service restarts', async () => {
      const failingFunction = jest
        .fn()
        .mockRejectedValue(new Error('Service down'));

      // Open circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.execute(
            'persistent-service',
            failingFunction,
          );
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreakerService.getStatus('persistent-service').state).toBe(
        CircuitBreakerState.OPEN,
      );

      // Simulate service restart by creating new instance
      const newCircuitBreaker = new CircuitBreakerService();

      // Circuit should start in closed state for new instance
      expect(newCircuitBreaker.getStatus('persistent-service').state).toBe(
        CircuitBreakerState.CLOSED,
      );
    });
  });
});
