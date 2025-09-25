import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RateLimitingService } from '../rate-limiting.service';
import { RateLimitException } from '../../exceptions/app.exception';

describe('RateLimitingService', () => {
  let service: RateLimitingService;
  let cacheManager: any;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitingService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<RateLimitingService>(RateLimitingService);
    cacheManager = module.get(CACHE_MANAGER);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow request when no previous data exists', async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await service.checkRateLimit('user123', 'search');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29); // 30 - 1
      expect(result.totalHits).toBe(1);
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should track requests within the window', async () => {
      const now = Date.now();
      const existingData = {
        count: 5,
        resetTime: now + 60000,
        requests: [
          now - 30000,
          now - 20000,
          now - 10000,
          now - 5000,
          now - 1000,
        ],
      };

      cacheManager.get.mockResolvedValue(existingData);

      const result = await service.checkRateLimit('user123', 'search');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(24); // 30 - 5 - 1
      expect(result.totalHits).toBe(6);
    });

    it('should deny request when rate limit is exceeded', async () => {
      const now = Date.now();
      const requests = Array.from({ length: 30 }, (_, i) => now - i * 1000);
      const existingData = {
        count: 30,
        resetTime: now + 60000,
        requests,
      };

      cacheManager.get.mockResolvedValue(existingData);

      const result = await service.checkRateLimit('user123', 'search');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.totalHits).toBe(30);
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should reset count when window expires', async () => {
      const now = Date.now();
      const existingData = {
        count: 30,
        resetTime: now - 1000, // Expired window
        requests: Array.from({ length: 30 }, (_, i) => now - 120000 - i * 1000),
      };

      cacheManager.get.mockResolvedValue(existingData);

      const result = await service.checkRateLimit('user123', 'search');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29);
      expect(result.totalHits).toBe(1);
    });

    it('should filter out old requests outside the window', async () => {
      const now = Date.now();
      const existingData = {
        count: 10,
        resetTime: now + 60000,
        requests: [
          now - 120000, // Outside window
          now - 90000, // Outside window
          now - 30000, // Inside window
          now - 20000, // Inside window
          now - 10000, // Inside window
        ],
      };

      cacheManager.get.mockResolvedValue(existingData);

      const result = await service.checkRateLimit('user123', 'search');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(26); // 30 - 3 - 1
      expect(result.totalHits).toBe(4);
    });

    it('should use custom configuration', async () => {
      cacheManager.get.mockResolvedValue(null);

      const customConfig = {
        windowMs: 30000, // 30 seconds
        maxRequests: 5,
      };

      const result = await service.checkRateLimit(
        'user123',
        'search',
        customConfig,
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1
    });

    it('should throw error for invalid configuration', async () => {
      await expect(
        service.checkRateLimit('user123', 'invalid_endpoint'),
      ).rejects.toThrow('Invalid rate limit configuration');
    });
  });

  describe('enforceRateLimit', () => {
    it('should not throw when rate limit is not exceeded', async () => {
      cacheManager.get.mockResolvedValue(null);

      await expect(
        service.enforceRateLimit('user123', 'search'),
      ).resolves.not.toThrow();
    });

    it('should throw RateLimitException when rate limit is exceeded', async () => {
      const now = Date.now();
      const requests = Array.from({ length: 30 }, (_, i) => now - i * 1000);
      const existingData = {
        count: 30,
        resetTime: now + 60000,
        requests,
      };

      cacheManager.get.mockResolvedValue(existingData);

      await expect(
        service.enforceRateLimit('user123', 'search'),
      ).rejects.toThrow(RateLimitException);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return status without incrementing counter', async () => {
      const now = Date.now();
      const existingData = {
        count: 5,
        resetTime: now + 60000,
        requests: Array.from({ length: 5 }, (_, i) => now - i * 1000),
      };

      cacheManager.get.mockResolvedValue(existingData);

      const result = await service.getRateLimitStatus('user123', 'search');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(25); // 30 - 5
      expect(result.totalHits).toBe(5);
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should return default status when no data exists', async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await service.getRateLimitStatus('user123', 'search');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(30);
      expect(result.totalHits).toBe(0);
    });
  });

  describe('resetRateLimit', () => {
    it('should delete cache entry for the identifier and endpoint', async () => {
      await service.resetRateLimit('user123', 'search');

      expect(cacheManager.del).toHaveBeenCalledWith(
        'rate_limit:search:user123',
      );
    });

    it('should throw error for unknown endpoint', async () => {
      await expect(
        service.resetRateLimit('user123', 'unknown_endpoint'),
      ).rejects.toThrow('Unknown endpoint: unknown_endpoint');
    });
  });

  describe('getRateLimitConfig', () => {
    it('should return configuration for known endpoint', () => {
      const config = service.getRateLimitConfig('search');

      expect(config).toEqual({
        windowMs: 60 * 1000,
        maxRequests: 30,
      });
    });

    it('should return undefined for unknown endpoint', () => {
      const config = service.getRateLimitConfig('unknown');

      expect(config).toBeUndefined();
    });
  });

  describe('updateRateLimitConfig', () => {
    it('should update configuration for endpoint', () => {
      const newConfig = {
        windowMs: 120000,
        maxRequests: 50,
      };

      service.updateRateLimitConfig('search', newConfig);

      const config = service.getRateLimitConfig('search');
      expect(config).toEqual(newConfig);
    });
  });

  describe('endpoint configurations', () => {
    it('should have correct default configurations', () => {
      expect(service.getRateLimitConfig('search')).toEqual({
        windowMs: 60 * 1000,
        maxRequests: 30,
      });

      expect(service.getRateLimitConfig('bookmark')).toEqual({
        windowMs: 60 * 1000,
        maxRequests: 20,
      });

      expect(service.getRateLimitConfig('project_creation')).toEqual({
        windowMs: 60 * 60 * 1000,
        maxRequests: 5,
      });

      expect(service.getRateLimitConfig('project_update')).toEqual({
        windowMs: 60 * 1000,
        maxRequests: 10,
      });

      expect(service.getRateLimitConfig('analytics')).toEqual({
        windowMs: 60 * 1000,
        maxRequests: 10,
      });
    });
  });

  describe('key generation', () => {
    it('should generate consistent keys for same inputs', async () => {
      cacheManager.get.mockResolvedValue(null);

      await service.checkRateLimit('user123', 'search');
      await service.checkRateLimit('user123', 'search');

      expect(cacheManager.get).toHaveBeenCalledWith(
        'rate_limit:search:user123',
      );
      expect(cacheManager.set).toHaveBeenCalledTimes(2);
    });

    it('should sanitize identifiers in keys', async () => {
      cacheManager.get.mockResolvedValue(null);

      await service.checkRateLimit('user@123.com', 'search');

      expect(cacheManager.get).toHaveBeenCalledWith(
        'rate_limit:search:user_123_com',
      );
    });
  });
});
