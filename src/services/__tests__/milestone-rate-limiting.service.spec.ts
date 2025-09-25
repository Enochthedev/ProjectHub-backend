import { Test, TestingModule } from '@nestjs/testing';
import { MilestoneRateLimitingService } from '../milestone-rate-limiting.service';
import { RateLimitingService } from '../../common/services/rate-limiting.service';
import { MilestoneRateLimitException } from '../../common/exceptions/milestone.exception';

describe('MilestoneRateLimitingService', () => {
  let service: MilestoneRateLimitingService;
  let rateLimitingService: jest.Mocked<RateLimitingService>;

  const mockUserId = 'user-123';
  const mockProjectId = 'project-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneRateLimitingService,
        {
          provide: RateLimitingService,
          useValue: {
            checkRateLimit: jest.fn(),
            enforceRateLimit: jest.fn(),
            resetRateLimit: jest.fn(),
            updateRateLimitConfig: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MilestoneRateLimitingService>(
      MilestoneRateLimitingService,
    );
    rateLimitingService = module.get(RateLimitingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkMilestoneRateLimit', () => {
    it('should check rate limit for milestone operations', async () => {
      const mockResult = {
        allowed: true,
        remaining: 5,
        resetTime: Date.now() + 60000,
        totalHits: 1,
      };

      rateLimitingService.checkRateLimit.mockResolvedValue(mockResult);

      const result = await service.checkMilestoneRateLimit(
        mockUserId,
        'milestone_creation',
      );

      expect(result).toEqual({
        ...mockResult,
        endpoint: 'milestone_creation',
      });

      expect(rateLimitingService.checkRateLimit).toHaveBeenCalledWith(
        `milestone_${mockUserId}_milestone_creation`,
        'milestone_creation',
        expect.objectContaining({
          windowMs: 60 * 60 * 1000,
          maxRequests: 10,
        }),
      );
    });

    it('should handle rate limiting service errors gracefully', async () => {
      rateLimitingService.checkRateLimit.mockRejectedValue(
        new Error('Rate limiting service error'),
      );

      const result = await service.checkMilestoneRateLimit(
        mockUserId,
        'milestone_creation',
      );

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.endpoint).toBe('milestone_creation');
    });

    it('should use custom configuration when provided', async () => {
      const customConfig = {
        windowMs: 30 * 1000,
        maxRequests: 5,
      };

      const mockResult = {
        allowed: true,
        remaining: 3,
        resetTime: Date.now() + 30000,
        totalHits: 2,
      };

      rateLimitingService.checkRateLimit.mockResolvedValue(mockResult);

      await service.checkMilestoneRateLimit(
        mockUserId,
        'milestone_creation',
        customConfig,
      );

      expect(rateLimitingService.checkRateLimit).toHaveBeenCalledWith(
        expect.any(String),
        'milestone_creation',
        expect.objectContaining(customConfig),
      );
    });
  });

  describe('enforceMilestoneRateLimit', () => {
    it('should allow operation when within rate limits', async () => {
      const mockResult = {
        allowed: true,
        remaining: 5,
        resetTime: Date.now() + 60000,
        totalHits: 1,
      };

      rateLimitingService.checkRateLimit.mockResolvedValue(mockResult);

      await expect(
        service.enforceMilestoneRateLimit(mockUserId, 'milestone_creation'),
      ).resolves.not.toThrow();
    });

    it('should throw exception when rate limit is exceeded', async () => {
      const mockResult = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        totalHits: 10,
      };

      rateLimitingService.checkRateLimit.mockResolvedValue(mockResult);

      await expect(
        service.enforceMilestoneRateLimit(mockUserId, 'milestone_creation'),
      ).rejects.toThrow(MilestoneRateLimitException);
    });

    it('should include retry after time in exception', async () => {
      const resetTime = Date.now() + 60000;
      const mockResult = {
        allowed: false,
        remaining: 0,
        resetTime,
        totalHits: 10,
      };

      rateLimitingService.checkRateLimit.mockResolvedValue(mockResult);

      try {
        await service.enforceMilestoneRateLimit(
          mockUserId,
          'milestone_creation',
        );
      } catch (error) {
        expect(error).toBeInstanceOf(MilestoneRateLimitException);
        expect(error.message).toContain('Try again in');
        expect(error.message).toContain('seconds');
      }
    });
  });

  describe('checkProjectRateLimit', () => {
    it('should check project-specific rate limits', async () => {
      const mockResult = {
        allowed: true,
        remaining: 8,
        resetTime: Date.now() + 60000,
        totalHits: 2,
      };

      rateLimitingService.checkRateLimit.mockResolvedValue(mockResult);

      const result = await service.checkProjectRateLimit(
        mockUserId,
        mockProjectId,
        'milestone_creation',
      );

      expect(result).toEqual({
        ...mockResult,
        endpoint: 'project_milestone_creation',
      });

      expect(rateLimitingService.checkRateLimit).toHaveBeenCalledWith(
        `project_${mockUserId}_${mockProjectId}_milestone_creation`,
        'project_milestone_creation',
        expect.any(Object),
      );
    });

    it('should handle project rate limiting errors', async () => {
      rateLimitingService.checkRateLimit.mockRejectedValue(
        new Error('Project rate limiting error'),
      );

      const result = await service.checkProjectRateLimit(
        mockUserId,
        mockProjectId,
        'milestone_creation',
      );

      expect(result.allowed).toBe(false);
      expect(result.endpoint).toBe('project_milestone_creation');
    });
  });

  describe('enforceProjectRateLimit', () => {
    it('should allow project operations within limits', async () => {
      const mockResult = {
        allowed: true,
        remaining: 5,
        resetTime: Date.now() + 60000,
        totalHits: 1,
      };

      rateLimitingService.checkRateLimit.mockResolvedValue(mockResult);

      await expect(
        service.enforceProjectRateLimit(
          mockUserId,
          mockProjectId,
          'milestone_creation',
        ),
      ).resolves.not.toThrow();
    });

    it('should throw exception for project rate limit exceeded', async () => {
      const mockResult = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        totalHits: 10,
      };

      rateLimitingService.checkRateLimit.mockResolvedValue(mockResult);

      await expect(
        service.enforceProjectRateLimit(
          mockUserId,
          mockProjectId,
          'milestone_creation',
        ),
      ).rejects.toThrow(MilestoneRateLimitException);
    });
  });

  describe('getBulkRateLimitStatus', () => {
    it('should return status for multiple operations', async () => {
      const operations = [
        'milestone_creation',
        'milestone_update',
        'milestone_deletion',
      ];

      rateLimitingService.checkRateLimit
        .mockResolvedValueOnce({
          allowed: true,
          remaining: 5,
          resetTime: Date.now() + 60000,
          totalHits: 1,
        })
        .mockResolvedValueOnce({
          allowed: true,
          remaining: 15,
          resetTime: Date.now() + 60000,
          totalHits: 5,
        })
        .mockResolvedValueOnce({
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 60000,
          totalHits: 5,
        });

      const results = await service.getBulkRateLimitStatus(
        mockUserId,
        operations,
      );

      expect(Object.keys(results)).toHaveLength(3);
      expect(results['milestone_creation'].allowed).toBe(true);
      expect(results['milestone_update'].allowed).toBe(true);
      expect(results['milestone_deletion'].allowed).toBe(false);
    });

    it('should handle errors in bulk status check', async () => {
      const operations = ['milestone_creation', 'milestone_update'];

      rateLimitingService.checkRateLimit
        .mockResolvedValueOnce({
          allowed: true,
          remaining: 5,
          resetTime: Date.now() + 60000,
          totalHits: 1,
        })
        .mockRejectedValueOnce(new Error('Service error'));

      const results = await service.getBulkRateLimitStatus(
        mockUserId,
        operations,
      );

      expect(results['milestone_creation'].allowed).toBe(true);
      expect(results['milestone_update'].allowed).toBe(false);
    });
  });

  describe('resetMilestoneRateLimit', () => {
    it('should reset rate limit for specific operation', async () => {
      rateLimitingService.resetRateLimit.mockResolvedValue();

      await service.resetMilestoneRateLimit(mockUserId, 'milestone_creation');

      expect(rateLimitingService.resetRateLimit).toHaveBeenCalledWith(
        `milestone_${mockUserId}_milestone_creation`,
        'milestone_creation',
      );
    });

    it('should handle reset errors gracefully', async () => {
      rateLimitingService.resetRateLimit.mockRejectedValue(
        new Error('Reset failed'),
      );

      await expect(
        service.resetMilestoneRateLimit(mockUserId, 'milestone_creation'),
      ).resolves.not.toThrow();
    });
  });

  describe('getMilestoneRateLimitConfig', () => {
    it('should return configuration for known operations', () => {
      const config = service.getMilestoneRateLimitConfig('milestone_creation');

      expect(config).toEqual({
        windowMs: 60 * 60 * 1000,
        maxRequests: 10,
      });
    });

    it('should return default configuration for unknown operations', () => {
      const config = service.getMilestoneRateLimitConfig('unknown_operation');

      expect(config).toEqual({
        windowMs: 60 * 1000,
        maxRequests: 20,
      });
    });

    it('should merge custom configuration', () => {
      const customConfig = { maxRequests: 5 };
      const config = service.getMilestoneRateLimitConfig(
        'milestone_creation',
        customConfig,
      );

      expect(config).toEqual({
        windowMs: 60 * 60 * 1000,
        maxRequests: 5,
      });
    });
  });

  describe('updateMilestoneRateLimitConfig', () => {
    it('should update configuration for operation', () => {
      const newConfig = {
        windowMs: 30 * 1000,
        maxRequests: 15,
      };

      service.updateMilestoneRateLimitConfig('milestone_creation', newConfig);

      const config = service.getMilestoneRateLimitConfig('milestone_creation');
      expect(config).toEqual(newConfig);
    });
  });

  describe('getUserRateLimitStatus', () => {
    it('should return comprehensive user rate limit status', async () => {
      // Mock responses for different operations
      rateLimitingService.checkRateLimit
        .mockResolvedValueOnce({
          allowed: true,
          remaining: 5,
          resetTime: Date.now() + 60000,
          totalHits: 1,
        })
        .mockResolvedValueOnce({
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + 30000,
          totalHits: 20,
        })
        .mockResolvedValue({
          allowed: true,
          remaining: 10,
          resetTime: Date.now() + 45000,
          totalHits: 5,
        });

      const status = await service.getUserRateLimitStatus(mockUserId);

      expect(status.user).toBe(mockUserId);
      expect(status.overallStatus).toBe('limited'); // Because one operation is not allowed
      expect(status.operations).toBeDefined();
      expect(typeof status.nextResetTime).toBe('number');
    });

    it('should determine warning status correctly', async () => {
      // Mock responses where some operations have low remaining counts
      rateLimitingService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 2, // Low remaining count
        resetTime: Date.now() + 60000,
        totalHits: 8,
      });

      const status = await service.getUserRateLimitStatus(mockUserId);

      expect(status.overallStatus).toBe('warning');
    });

    it('should determine healthy status correctly', async () => {
      // Mock responses where all operations are healthy
      rateLimitingService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 15,
        resetTime: Date.now() + 60000,
        totalHits: 5,
      });

      const status = await service.getUserRateLimitStatus(mockUserId);

      expect(status.overallStatus).toBe('healthy');
    });
  });

  describe('Rate Limit Configurations', () => {
    it('should have appropriate configurations for different operations', () => {
      const creationConfig =
        service.getMilestoneRateLimitConfig('milestone_creation');
      const updateConfig =
        service.getMilestoneRateLimitConfig('milestone_update');
      const deletionConfig =
        service.getMilestoneRateLimitConfig('milestone_deletion');

      // Creation should be more restrictive than updates
      expect(creationConfig.maxRequests).toBeLessThan(updateConfig.maxRequests);

      // Deletion should be most restrictive
      expect(deletionConfig.maxRequests).toBeLessThan(
        creationConfig.maxRequests,
      );

      // Creation and deletion should have longer windows
      expect(creationConfig.windowMs).toBeGreaterThan(updateConfig.windowMs);
      expect(deletionConfig.windowMs).toBeGreaterThan(updateConfig.windowMs);
    });

    it('should have bulk operations with strict limits', () => {
      const bulkConfig = service.getMilestoneRateLimitConfig('bulk_operations');

      expect(bulkConfig.maxRequests).toBeLessThanOrEqual(2);
      expect(bulkConfig.windowMs).toBeGreaterThanOrEqual(60 * 60 * 1000);
    });
  });

  describe('Decorator Creation', () => {
    it('should create rate limit decorator', () => {
      const decorator =
        service.createMilestoneRateLimitDecorator('milestone_creation');

      expect(typeof decorator).toBe('function');
    });

    it('should create decorator with custom config', () => {
      const customConfig = { maxRequests: 5 };
      const decorator = service.createMilestoneRateLimitDecorator(
        'milestone_creation',
        customConfig,
      );

      expect(typeof decorator).toBe('function');
    });
  });
});
