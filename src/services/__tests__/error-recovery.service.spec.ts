import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ErrorRecoveryService } from '../error-recovery.service';
import { Recommendation } from '../../entities/recommendation.entity';
import { RecommendationResultDto } from '../../dto/recommendation';
import {
  AIServiceException,
  RateLimitExceededException,
  CircuitBreakerOpenException,
  AIModelTimeoutException,
} from '../../common/exceptions/app.exception';

describe('ErrorRecoveryService', () => {
  let service: ErrorRecoveryService;
  let recommendationRepository: jest.Mocked<Repository<Recommendation>>;

  const mockRecommendationResult: RecommendationResultDto = {
    recommendations: [
      {
        projectId: 'project-1',
        title: 'Test Project',
        abstract: 'Test abstract',
        specialization: 'Software Engineering',
        difficultyLevel: 'intermediate' as any,
        similarityScore: 0.8,
        matchingSkills: ['JavaScript'],
        matchingInterests: ['web development'],
        reasoning: 'Good match for your skills',
        supervisor: {
          id: 'supervisor-1',
          name: 'Dr. Test',
          specialization: 'Software Engineering',
        },
      },
    ],
    reasoning: 'These projects match your profile',
    averageSimilarityScore: 0.8,
    fromCache: false,
    generatedAt: new Date(),
    metadata: {
      method: 'ai-powered',
      fallback: false,
      projectsAnalyzed: 10,
      cacheHitRate: 0,
      processingTimeMs: 1000,
    },
  };

  const mockCachedRecommendation: Recommendation = {
    id: 'rec-1',
    studentId: 'student-1',
    projectSuggestions: mockRecommendationResult.recommendations,
    reasoning: 'Cached recommendations',
    averageSimilarityScore: 0.75,
    profileSnapshot: {} as any,
    status: 'active' as any,
    createdAt: new Date(Date.now() - 1800000), // 30 minutes ago
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 1800000), // 30 minutes from now
  } as Recommendation;

  beforeEach(async () => {
    const mockRecommendationRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorRecoveryService,
        {
          provide: getRepositoryToken(Recommendation),
          useValue: mockRecommendationRepository,
        },
      ],
    }).compile();

    service = module.get<ErrorRecoveryService>(ErrorRecoveryService);
    recommendationRepository = module.get(getRepositoryToken(Recommendation));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recoverFromAIError', () => {
    it('should recover using cached results when available', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockCachedRecommendation),
      };
      recommendationRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const error = new AIServiceException('Service unavailable');
      const result = await service.recoverFromAIError(error, 'student-1');

      expect(result.recoveryMethod).toBe('cache');
      expect(result.data).toBeDefined();
      expect(result.originalError).toBe(error);
      expect(result.recoveryMessage).toContain(
        'AI recommendation service is temporarily unavailable',
      );
    });

    it('should use fallback function when cache is not available', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      recommendationRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const fallbackFn = jest.fn().mockResolvedValue(mockRecommendationResult);
      const error = new RateLimitExceededException();

      const result = await service.recoverFromAIError(
        error,
        'student-1',
        fallbackFn,
      );

      expect(result.recoveryMethod).toBe('fallback');
      expect(fallbackFn).toHaveBeenCalled();
      expect(result.recoveryMessage).toContain('rate limit has been reached');
    });

    it('should provide degraded service when all recovery methods fail', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      recommendationRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const fallbackFn = jest
        .fn()
        .mockRejectedValue(new Error('Fallback failed'));
      const error = new CircuitBreakerOpenException('ai-service');

      const result = await service.recoverFromAIError(
        error,
        'student-1',
        fallbackFn,
      );

      expect(result.recoveryMethod).toBe('degraded');
      expect(result.data).toBeDefined();
      expect(
        (result.data as RecommendationResultDto).recommendations,
      ).toHaveLength(0);
    });

    it('should not use cache when disabled in options', async () => {
      const fallbackFn = jest.fn().mockResolvedValue(mockRecommendationResult);
      const error = new AIServiceException('Service error');

      const result = await service.recoverFromAIError(
        error,
        'student-1',
        fallbackFn,
        { useCachedResults: false },
      );

      expect(result.recoveryMethod).toBe('fallback');
      expect(
        recommendationRepository.createQueryBuilder,
      ).not.toHaveBeenCalled();
    });

    it('should not use fallback when disabled in options', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      recommendationRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const fallbackFn = jest.fn().mockResolvedValue(mockRecommendationResult);
      const error = new AIServiceException('Service error');

      const result = await service.recoverFromAIError(
        error,
        'student-1',
        fallbackFn,
        { fallbackToRuleBased: false },
      );

      expect(result.recoveryMethod).toBe('degraded');
      expect(fallbackFn).not.toHaveBeenCalled();
    });

    it('should respect max cache age', async () => {
      const oldRecommendation = {
        ...mockCachedRecommendation,
        createdAt: new Date(Date.now() - 7200000), // 2 hours ago
      };

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(oldRecommendation),
      };
      recommendationRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const fallbackFn = jest.fn().mockResolvedValue(mockRecommendationResult);
      const error = new AIServiceException('Service error');

      const result = await service.recoverFromAIError(
        error,
        'student-1',
        fallbackFn,
        { maxCacheAge: 3600000 }, // 1 hour
      );

      // Should use fallback since cache is too old
      expect(result.recoveryMethod).toBe('fallback');
    });

    it('should add recovery message to result when enabled', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockCachedRecommendation),
      };
      recommendationRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const error = new AIServiceException('Service unavailable');
      const result = await service.recoverFromAIError(
        error,
        'student-1',
        undefined,
        { includeRecoveryMessage: true },
      );

      const data = result.data as RecommendationResultDto;
      expect(data.reasoning).toContain(
        'AI recommendation service is temporarily unavailable',
      );
      expect(data.metadata?.recoveryUsed).toBe(true);
    });

    it('should not add recovery message when disabled', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockCachedRecommendation),
      };
      recommendationRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const error = new AIServiceException('Service unavailable');
      const result = await service.recoverFromAIError(
        error,
        'student-1',
        undefined,
        { includeRecoveryMessage: false },
      );

      expect(result.recoveryMessage).toBeUndefined();
    });
  });

  describe('isRecoverableError', () => {
    it('should identify recoverable AI errors', () => {
      const recoverableErrors = [
        new AIServiceException('Service error'),
        new RateLimitExceededException(),
        new CircuitBreakerOpenException('service'),
        new AIModelTimeoutException('model', 1000),
      ];

      recoverableErrors.forEach((error) => {
        expect(service.isRecoverableError(error)).toBe(true);
      });
    });

    it('should identify non-recoverable errors', () => {
      const nonRecoverableErrors = [
        new Error('Generic error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
      ];

      nonRecoverableErrors.forEach((error) => {
        expect(service.isRecoverableError(error)).toBe(false);
      });
    });
  });

  describe('getRecoverySuggestions', () => {
    it('should provide specific suggestions for rate limit errors', () => {
      const error = new RateLimitExceededException();
      const suggestions = service.getRecoverySuggestions(error);

      expect(suggestions).toContain(
        'Try again in a few minutes when the rate limit resets',
      );
      expect(suggestions).toContain(
        'Browse projects manually using the search and filter options',
      );
    });

    it('should provide specific suggestions for circuit breaker errors', () => {
      const error = new CircuitBreakerOpenException('service');
      const suggestions = service.getRecoverySuggestions(error);

      expect(suggestions).toContain(
        'Wait a few minutes for the service to recover automatically',
      );
      expect(suggestions).toContain(
        'Check our status page for service updates',
      );
    });

    it('should provide specific suggestions for timeout errors', () => {
      const error = new AIModelTimeoutException('model', 1000);
      const suggestions = service.getRecoverySuggestions(error);

      expect(suggestions).toContain(
        'Simplify your profile information and try again',
      );
      expect(suggestions).toContain('Check your internet connection');
    });

    it('should provide specific suggestions for AI service errors', () => {
      const error = new AIServiceException('Service error');
      const suggestions = service.getRecoverySuggestions(error);

      expect(suggestions).toContain('Try again in a few minutes');
      expect(suggestions).toContain(
        'Clear your browser cache and reload the page',
      );
    });

    it('should provide generic suggestions for unknown errors', () => {
      const error = new Error('Unknown error');
      const suggestions = service.getRecoverySuggestions(error);

      expect(suggestions).toContain('Refresh the page and try again');
      expect(suggestions).toContain('Check your internet connection');
    });
  });

  describe('logRecoveryAttempt', () => {
    it('should log recovery attempts', () => {
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      const error = new AIServiceException('Test error');
      service.logRecoveryAttempt(error, 'cache', true, 'student-1');

      expect(logSpy).toHaveBeenCalledWith('Recovery attempt: cache', {
        errorType: 'AIServiceException',
        errorMessage: 'Test error',
        recoveryMethod: 'cache',
        success: true,
        studentId: 'student-1',
        timestamp: expect.any(String),
      });
    });

    it('should log failed recovery attempts', () => {
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      const error = new RateLimitExceededException();
      service.logRecoveryAttempt(error, 'fallback', false);

      expect(logSpy).toHaveBeenCalledWith('Recovery attempt: fallback', {
        errorType: 'RateLimitExceededException',
        errorMessage: 'AI service rate limit exceeded',
        recoveryMethod: 'fallback',
        success: false,
        studentId: undefined,
        timestamp: expect.any(String),
      });
    });
  });

  describe('error message generation', () => {
    it('should generate appropriate messages for different error types', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mkReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      recommendationRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const testCases = [
        {
          error: new AIServiceException('Service error'),
          expectedMessage:
            'AI recommendation service is temporarily unavailable',
        },
        {
          error: new RateLimitExceededException(),
          expectedMessage: 'AI service rate limit has been reached',
        },
        {
          error: new CircuitBreakerOpenException('service'),
          expectedMessage: 'AI service is experiencing issues',
        },
        {
          error: new AIModelTimeoutException('model', 1000),
          expectedMessage: 'AI service request timed out',
        },
      ];

      for (const testCase of testCases) {
        const result = await service.recoverFromAIError(
          testCase.error,
          'student-1',
        );
        expect(result.recoveryMessage).toContain(testCase.expectedMessage);
      }
    });
  });
});
