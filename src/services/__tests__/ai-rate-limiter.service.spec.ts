import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AIRateLimiterService,
  UsageTrackingData,
} from '../ai-rate-limiter.service';
import { AIApiUsage } from '../../entities/ai-api-usage.entity';

describe('AIRateLimiterService', () => {
  let service: AIRateLimiterService;
  let repository: jest.Mocked<Repository<AIApiUsage>>;
  let configService: jest.Mocked<ConfigService>;
  let mockQueryBuilder: any;

  const mockConfig = {
    'huggingFace.rateLimitPerMinute': 10,
    'huggingFace.rateLimitPerMonth': 30000,
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getCount: jest.fn().mockResolvedValue(0),
    };

    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIRateLimiterService,
        {
          provide: getRepositoryToken(AIApiUsage),
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<AIRateLimiterService>(AIRateLimiterService);
    repository = module.get(getRepositoryToken(AIApiUsage));
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within per-minute limit', async () => {
      const result = await service.checkRateLimit('user123');

      expect(result.allowed).toBe(true);
      expect(result.remainingRequests).toBe(9);
      expect(result.monthlyUsage).toBe(0);
      expect(result.monthlyLimit).toBe(30000);
    });

    it('should deny requests when per-minute limit is exceeded', async () => {
      // Make 10 requests to hit the limit
      for (let i = 0; i < 10; i++) {
        await service.checkRateLimit('user123');
      }

      // 11th request should be denied
      const result = await service.checkRateLimit('user123');

      expect(result.allowed).toBe(false);
      expect(result.remainingRequests).toBe(0);
    });

    it('should deny requests when monthly limit is exceeded', async () => {
      mockQueryBuilder.getCount.mockResolvedValueOnce(30001); // Over monthly limit

      const result = await service.checkRateLimit('user123');

      expect(result.allowed).toBe(false);
      expect(result.monthlyUsage).toBe(30001);
    });

    it('should handle anonymous users', async () => {
      const result = await service.checkRateLimit();

      expect(result.allowed).toBe(true);
      expect(result.remainingRequests).toBe(9);
    });

    it('should reset per-minute counter after time passes', async () => {
      // Make 10 requests to hit the limit
      for (let i = 0; i < 10; i++) {
        await service.checkRateLimit('user123');
      }

      // Mock time passing (simulate next minute)
      const originalDate = Date;
      const mockDate = new Date();
      mockDate.setMinutes(mockDate.getMinutes() + 1);
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = originalDate.now;

      const result = await service.checkRateLimit('user123');

      expect(result.allowed).toBe(true);
      expect(result.remainingRequests).toBe(9);

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('trackUsage', () => {
    it('should successfully track API usage', async () => {
      const mockUsage = { id: 'usage123' };
      repository.create.mockReturnValue(mockUsage as any);
      repository.save.mockResolvedValue(mockUsage as any);

      const usageData: UsageTrackingData = {
        endpoint: '/api/embeddings',
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        tokensUsed: 100,
        responseTimeMs: 500,
        success: true,
        userId: 'user123',
      };

      await service.trackUsage(usageData);

      expect(repository.create).toHaveBeenCalledWith({
        endpoint: '/api/embeddings',
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        tokensUsed: 100,
        responseTimeMs: 500,
        success: true,
        errorMessage: undefined,
        userId: 'user123',
      });
      expect(repository.save).toHaveBeenCalledWith(mockUsage);
    });

    it('should track failed API usage with error message', async () => {
      const mockUsage = { id: 'usage123' };
      repository.create.mockReturnValue(mockUsage as any);
      repository.save.mockResolvedValue(mockUsage as any);

      const usageData: UsageTrackingData = {
        endpoint: '/api/embeddings',
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        tokensUsed: 0,
        responseTimeMs: 1000,
        success: false,
        errorMessage: 'API timeout',
        userId: 'user123',
      };

      await service.trackUsage(usageData);

      expect(repository.create).toHaveBeenCalledWith({
        endpoint: '/api/embeddings',
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        tokensUsed: 0,
        responseTimeMs: 1000,
        success: false,
        errorMessage: 'API timeout',
        userId: 'user123',
      });
    });

    it('should handle tracking errors gracefully', async () => {
      repository.create.mockReturnValue({} as any);
      repository.save.mockRejectedValue(new Error('Database error'));

      const usageData: UsageTrackingData = {
        endpoint: '/api/embeddings',
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        tokensUsed: 100,
        responseTimeMs: 500,
        success: true,
      };

      // Should not throw error
      await expect(service.trackUsage(usageData)).resolves.toBeUndefined();
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics for a user', async () => {
      const mockUsages = [
        { tokensUsed: 100, responseTimeMs: 500, success: true },
        { tokensUsed: 150, responseTimeMs: 600, success: true },
        { tokensUsed: 75, responseTimeMs: 400, success: false },
      ];

      mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([mockUsages, 3]);

      const stats = await service.getUsageStats('user123');

      expect(stats).toEqual({
        totalRequests: 3,
        successfulRequests: 2,
        failedRequests: 1,
        totalTokens: 325,
        averageResponseTime: 500,
        successRate: 66.66666666666666,
      });
    });

    it('should return zero stats when no usage data exists', async () => {
      const stats = await service.getUsageStats('user123');

      expect(stats).toEqual({
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalTokens: 0,
        averageResponseTime: 0,
        successRate: 0,
      });
    });

    it('should filter by date range when provided', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await service.getUsageStats('user123', startDate, endDate);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'usage.createdAt >= :startDate',
        { startDate },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'usage.createdAt <= :endDate',
        { endDate },
      );
    });

    it('should get global stats when no userId provided', async () => {
      await service.getUsageStats();

      expect(mockQueryBuilder.where).not.toHaveBeenCalledWith(
        'usage.userId = :userId',
        expect.any(Object),
      );
    });
  });
});
