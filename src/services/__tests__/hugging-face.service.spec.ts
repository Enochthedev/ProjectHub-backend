import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HuggingFaceService } from '../hugging-face.service';
import { AIRateLimiterService } from '../ai-rate-limiter.service';
import { CircuitBreakerService } from '../circuit-breaker.service';
import { AIApiUsage } from '../../entities/ai-api-usage.entity';

// Mock the @huggingface/inference module
jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => ({
    featureExtraction: jest.fn(),
    questionAnswering: jest.fn(),
  })),
}));

describe('HuggingFaceService', () => {
  let service: HuggingFaceService;
  let configService: ConfigService;
  let rateLimiterService: jest.Mocked<AIRateLimiterService>;
  let circuitBreakerService: jest.Mocked<CircuitBreakerService>;
  let mockHfInference: any;

  const mockConfig = {
    'huggingFace.apiKey': 'test-api-key',
    'huggingFace.model': 'sentence-transformers/all-MiniLM-L6-v2',
    'huggingFace.qaModel': 'distilbert-base-cased-distilled-squad',
    'huggingFace.timeout': 15000,
    'huggingFace.maxTokensPerRequest': 512,
    'huggingFace.retryAttempts': 3,
    'huggingFace.retryDelayMs': 1000,
    'huggingFace.qaMaxContextLength': 512,
    'huggingFace.qaMaxAnswerLength': 200,
    'huggingFace.qaConfidenceThreshold': 0.3,
    'huggingFace.rateLimitPerMinute': 10,
    'huggingFace.rateLimitPerMonth': 30000,
  };

  beforeEach(async () => {
    const { HfInference } = require('@huggingface/inference');
    mockHfInference = {
      featureExtraction: jest.fn(),
      questionAnswering: jest.fn(),
    };
    HfInference.mockImplementation(() => mockHfInference);

    const mockRateLimiterService = {
      checkRateLimit: jest.fn(),
      trackUsage: jest.fn(),
    };

    const mockCircuitBreakerService = {
      execute: jest.fn(),
      getStatus: jest.fn(),
    };

    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HuggingFaceService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
        {
          provide: AIRateLimiterService,
          useValue: mockRateLimiterService,
        },
        {
          provide: CircuitBreakerService,
          useValue: mockCircuitBreakerService,
        },
        {
          provide: getRepositoryToken(AIApiUsage),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<HuggingFaceService>(HuggingFaceService);
    configService = module.get<ConfigService>(ConfigService);
    rateLimiterService = module.get(AIRateLimiterService);
    circuitBreakerService = module.get(CircuitBreakerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      expect(service).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith('huggingFace.apiKey');
    });

    it('should throw error when API key is missing', async () => {
      await expect(async () => {
        const mockRateLimiterService = {
          checkRateLimit: jest.fn(),
          trackUsage: jest.fn(),
        };

        const mockCircuitBreakerService = {
          execute: jest.fn(),
          getStatus: jest.fn(),
        };

        const mockRepository = {
          create: jest.fn(),
          save: jest.fn(),
          createQueryBuilder: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            HuggingFaceService,
            {
              provide: ConfigService,
              useValue: {
                get: jest.fn((key: string) => {
                  if (key === 'huggingFace.apiKey') return undefined;
                  return mockConfig[key];
                }),
              },
            },
            {
              provide: AIRateLimiterService,
              useValue: mockRateLimiterService,
            },
            {
              provide: CircuitBreakerService,
              useValue: mockCircuitBreakerService,
            },
            {
              provide: getRepositoryToken(AIApiUsage),
              useValue: mockRepository,
            },
          ],
        }).compile();

        module.get<HuggingFaceService>(HuggingFaceService);
      }).rejects.toThrow('Hugging Face API key is required');
    });
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for valid texts', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      mockHfInference.featureExtraction.mockResolvedValue(mockEmbedding);

      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remainingRequests: 9,
        resetTime: new Date(),
        monthlyUsage: 100,
        monthlyLimit: 30000,
      });

      circuitBreakerService.execute.mockImplementation(
        async (name, fn) => await fn(),
      );

      const texts = ['Hello world', 'Test text'];
      const result = await service.generateEmbeddings(texts);

      expect(result).toEqual([mockEmbedding, mockEmbedding]);
      expect(circuitBreakerService.execute).toHaveBeenCalledTimes(2);
    });

    it('should handle nested array response format', async () => {
      const mockEmbedding = [[0.1, 0.2, 0.3, 0.4, 0.5]];
      mockHfInference.featureExtraction.mockResolvedValue(mockEmbedding);

      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remainingRequests: 9,
        resetTime: new Date(),
        monthlyUsage: 100,
        monthlyLimit: 30000,
      });

      circuitBreakerService.execute.mockImplementation(
        async (name, fn) => await fn(),
      );

      const texts = ['Hello world'];
      const result = await service.generateEmbeddings(texts);

      expect(result).toEqual([[0.1, 0.2, 0.3, 0.4, 0.5]]);
    });

    it('should throw error for empty texts array', async () => {
      await expect(service.generateEmbeddings([])).rejects.toThrow(
        'Texts array cannot be empty',
      );
    });

    it('should throw error for null texts', async () => {
      await expect(service.generateEmbeddings(null as any)).rejects.toThrow(
        'Texts array cannot be empty',
      );
    });

    it('should throw rate limit error when rate limit is exceeded', async () => {
      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remainingRequests: 0,
        resetTime: new Date(),
        monthlyUsage: 30001,
        monthlyLimit: 30000,
      });

      const texts = ['Hello world'];

      await expect(service.generateEmbeddings(texts)).rejects.toThrow();
    });

    it('should handle circuit breaker failures', async () => {
      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remainingRequests: 9,
        resetTime: new Date(),
        monthlyUsage: 100,
        monthlyLimit: 30000,
      });

      circuitBreakerService.execute.mockRejectedValue(
        new Error('Circuit breaker open'),
      );

      const texts = ['Hello world'];

      await expect(service.generateEmbeddings(texts)).rejects.toThrow(
        'Circuit breaker open',
      );
    });
  });

  describe('getModelInfo', () => {
    it('should return model information', () => {
      const modelInfo = service.getModelInfo();

      expect(modelInfo).toEqual({
        name: 'sentence-transformers/all-MiniLM-L6-v2',
        maxTokens: 512,
      });
    });
  });

  describe('healthCheck', () => {
    it('should return true when service is healthy', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      mockHfInference.featureExtraction.mockResolvedValue(mockEmbedding);
      circuitBreakerService.execute.mockImplementation(
        async (name, fn) => await fn(),
      );

      const result = await service.healthCheck();

      expect(result).toBe(true);
      expect(circuitBreakerService.execute).toHaveBeenCalled();
    });

    it('should return false when service is unhealthy', async () => {
      circuitBreakerService.execute.mockRejectedValue(
        new Error('Service unavailable'),
      );

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return rate limit status', async () => {
      const mockStatus = {
        allowed: true,
        remainingRequests: 9,
        resetTime: new Date(),
        monthlyUsage: 100,
        monthlyLimit: 30000,
      };

      rateLimiterService.checkRateLimit.mockResolvedValue(mockStatus);

      const result = await service.getRateLimitStatus('user123');

      expect(result).toEqual({
        remaining: 9,
        resetTime: mockStatus.resetTime,
        monthlyUsage: 100,
        monthlyLimit: 30000,
      });
    });
  });

  describe('getCircuitBreakerStatus', () => {
    it('should return circuit breaker status', () => {
      const mockStatus = {
        state: 'CLOSED',
        failureCount: 0,
      };

      circuitBreakerService.getStatus.mockReturnValue(mockStatus as any);

      const result = service.getCircuitBreakerStatus();

      expect(result).toEqual(mockStatus);
      expect(circuitBreakerService.getStatus).toHaveBeenCalledWith(
        'hugging-face-embeddings',
      );
    });
  });

  describe('questionAnswering', () => {
    it('should process Q&A request successfully', async () => {
      const mockQAResponse = {
        answer: 'This is a test answer',
        score: 0.85,
        start: 10,
        end: 30,
      };

      mockHfInference.questionAnswering.mockResolvedValue(mockQAResponse);

      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remainingRequests: 9,
        resetTime: new Date(),
        monthlyUsage: 100,
        monthlyLimit: 30000,
      });

      circuitBreakerService.execute.mockImplementation(
        async (name, fn) => await fn(),
      );

      const request = {
        question: 'What is this?',
        context: 'This is a test context for the Q&A system.',
      };

      const result = await service.questionAnswering(request);

      expect(result).toEqual({
        answer: 'This is a test answer',
        score: 0.85,
        start: 10,
        end: 30,
      });
      expect(mockHfInference.questionAnswering).toHaveBeenCalledWith({
        model: 'distilbert-base-cased-distilled-squad',
        inputs: {
          question: request.question,
          context: request.context,
        },
      });
    });

    it('should throw error for missing question', async () => {
      const request = {
        question: '',
        context: 'This is a test context.',
      };

      await expect(service.questionAnswering(request)).rejects.toThrow(
        'Question and context are required',
      );
    });

    it('should throw error for missing context', async () => {
      const request = {
        question: 'What is this?',
        context: '',
      };

      await expect(service.questionAnswering(request)).rejects.toThrow(
        'Question and context are required',
      );
    });

    it('should handle rate limit exceeded', async () => {
      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remainingRequests: 0,
        resetTime: new Date(),
        monthlyUsage: 30001,
        monthlyLimit: 30000,
      });

      const request = {
        question: 'What is this?',
        context: 'This is a test context.',
      };

      await expect(service.questionAnswering(request)).rejects.toThrow();
    });

    it('should normalize confidence scores', async () => {
      const mockQAResponse = {
        answer: 'Test answer',
        score: 1.5, // Score above 1
      };

      mockHfInference.questionAnswering.mockResolvedValue(mockQAResponse);

      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remainingRequests: 9,
        resetTime: new Date(),
        monthlyUsage: 100,
        monthlyLimit: 30000,
      });

      circuitBreakerService.execute.mockImplementation(
        async (name, fn) => await fn(),
      );

      const request = {
        question: 'What is this?',
        context: 'This is a test context.',
      };

      const result = await service.questionAnswering(request);

      expect(result.score).toBe(1); // Should be normalized to 1
    });

    it('should handle low confidence responses', async () => {
      const mockQAResponse = {
        answer: 'Uncertain answer',
        score: 0.1, // Below threshold
      };

      mockHfInference.questionAnswering.mockResolvedValue(mockQAResponse);

      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remainingRequests: 9,
        resetTime: new Date(),
        monthlyUsage: 100,
        monthlyLimit: 30000,
      });

      circuitBreakerService.execute.mockImplementation(
        async (name, fn) => await fn(),
      );

      const request = {
        question: 'What is this?',
        context: 'This is a test context.',
      };

      const result = await service.questionAnswering(request);

      expect(result.score).toBe(0.1);
      expect(result.answer).toBe('Uncertain answer');
    });

    it('should truncate long context', async () => {
      const longContext = 'A'.repeat(3000); // Very long context
      const mockQAResponse = {
        answer: 'Test answer',
        score: 0.8,
      };

      mockHfInference.questionAnswering.mockResolvedValue(mockQAResponse);

      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remainingRequests: 9,
        resetTime: new Date(),
        monthlyUsage: 100,
        monthlyLimit: 30000,
      });

      circuitBreakerService.execute.mockImplementation(
        async (name, fn) => await fn(),
      );

      const request = {
        question: 'What is this?',
        context: longContext,
      };

      await service.questionAnswering(request);

      // Verify that the context was truncated
      const callArgs = mockHfInference.questionAnswering.mock.calls[0][0];
      expect(callArgs.inputs.context.length).toBeLessThan(longContext.length);
    });

    it('should handle circuit breaker failures', async () => {
      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remainingRequests: 9,
        resetTime: new Date(),
        monthlyUsage: 100,
        monthlyLimit: 30000,
      });

      circuitBreakerService.execute.mockRejectedValue(
        new Error('Circuit breaker open'),
      );

      const request = {
        question: 'What is this?',
        context: 'This is a test context.',
      };

      await expect(service.questionAnswering(request)).rejects.toThrow(
        'Circuit breaker open',
      );
    });
  });

  describe('getQAModelInfo', () => {
    it('should return Q&A model information', () => {
      const modelInfo = service.getQAModelInfo();

      expect(modelInfo).toEqual({
        name: 'distilbert-base-cased-distilled-squad',
        maxTokens: 512,
        confidenceThreshold: 0.3,
      });
    });
  });

  describe('qaHealthCheck', () => {
    it('should return true when Q&A service is healthy', async () => {
      const mockQAResponse = {
        answer: 'health check test',
        score: 0.9,
      };

      mockHfInference.questionAnswering.mockResolvedValue(mockQAResponse);
      circuitBreakerService.execute.mockImplementation(
        async (name, fn) => await fn(),
      );

      const result = await service.qaHealthCheck();

      expect(result).toBe(true);
      expect(circuitBreakerService.execute).toHaveBeenCalledWith(
        'hugging-face-qa-health-check',
        expect.any(Function),
        expect.objectContaining({
          failureThreshold: 2,
          recoveryTimeout: 15000,
          halfOpenMaxCalls: 1,
        }),
      );
    });

    it('should return false when Q&A service is unhealthy', async () => {
      circuitBreakerService.execute.mockRejectedValue(
        new Error('Q&A service unavailable'),
      );

      const result = await service.qaHealthCheck();

      expect(result).toBe(false);
    });
  });
});
