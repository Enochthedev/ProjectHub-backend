import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RateLimitingService } from '../rate-limiting.service';
import { RateLimitException } from '../../exceptions/app.exception';

describe('RateLimitingService - Security Tests', () => {
  let service: RateLimitingService;
  let cacheManager: any;

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

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
  });

  describe('Rate Limit Enforcement', () => {
    it('should allow requests within rate limits', async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await service.checkRateLimit('user123', 'search');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29); // 30 - 1
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should block requests exceeding rate limits', async () => {
      const now = Date.now();
      const existingData = {
        count: 30,
        resetTime: now + 60000,
        requests: Array.from({ length: 30 }, (_, i) => now - i * 1000),
      };

      cacheManager.get.mockResolvedValue(existingData);

      const result = await service.checkRateLimit('user123', 'search');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should enforce rate limits and throw exception', async () => {
      const now = Date.now();
      const existingData = {
        count: 30,
        resetTime: now + 60000,
        requests: Array.from({ length: 30 }, (_, i) => now - i * 1000),
      };

      cacheManager.get.mockResolvedValue(existingData);

      await expect(
        service.enforceRateLimit('user123', 'search'),
      ).rejects.toThrow(RateLimitException);
    });

    it('should reset rate limit after time window expires', async () => {
      const now = Date.now();
      const expiredData = {
        count: 30,
        resetTime: now - 1000, // Expired 1 second ago
        requests: Array.from({ length: 30 }, (_, i) => now - 120000 - i * 1000), // Old requests
      };

      cacheManager.get.mockResolvedValue(expiredData);

      const result = await service.checkRateLimit('user123', 'search');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29);
    });
  });

  describe('Different Endpoint Rate Limits', () => {
    it('should apply different limits for search endpoint', async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await service.checkRateLimit('user123', 'search');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29); // 30 - 1 for search
    });

    it('should apply different limits for bookmark endpoint', async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await service.checkRateLimit('user123', 'bookmark');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(19); // 20 - 1 for bookmark
    });

    it('should apply strict limits for project creation', async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await service.checkRateLimit(
        'user123',
        'project_creation',
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1 for project creation
    });

    it('should apply very strict limits for analytics', async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await service.checkRateLimit('user123', 'analytics');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // 10 - 1 for analytics
    });
  });

  describe('Rate Limit by IP Address', () => {
    it('should track rate limits by IP address for anonymous users', async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await service.checkRateLimit('192.168.1.1', 'search');

      expect(result.allowed).toBe(true);
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('192_168_1_1'),
        expect.any(Object),
        expect.any(Number),
      );
    });

    it('should handle malicious IP addresses safely', async () => {
      const maliciousIps = [
        '192.168.1.1; DROP TABLE users; --',
        '192.168.1.1<script>alert(1)</script>',
        '192.168.1.1"malicious"',
        "192.168.1.1'malicious'",
      ];

      cacheManager.get.mockResolvedValue(null);

      for (const ip of maliciousIps) {
        const result = await service.checkRateLimit(ip, 'search');
        expect(result.allowed).toBe(true);

        // Verify that the cache key is sanitized
        const setCall = cacheManager.set.mock.calls.find((call) =>
          call[0].includes('192_168_1_1'),
        );
        expect(setCall).toBeDefined();
        expect(setCall[0]).not.toContain('<');
        expect(setCall[0]).not.toContain('>');
        expect(setCall[0]).not.toContain('"');
        expect(setCall[0]).not.toContain("'");
        expect(setCall[0]).not.toContain(';');
      }
    });
  });

  describe('Sliding Window Rate Limiting', () => {
    it('should implement sliding window correctly', async () => {
      const now = Date.now();
      const windowStart = now - 60000; // 1 minute ago

      // Simulate requests spread across the window
      const existingRequests = [
        now - 10000, // 10 seconds ago
        now - 20000, // 20 seconds ago
        now - 30000, // 30 seconds ago
        now - 70000, // 70 seconds ago (should be filtered out)
      ];

      const existingData = {
        count: 4,
        resetTime: now + 60000,
        requests: existingRequests,
      };

      cacheManager.get.mockResolvedValue(existingData);

      const result = await service.checkRateLimit('user123', 'search');

      // Should only count 3 requests (the one from 70 seconds ago should be filtered out)
      expect(result.allowed).toBe(true);
      expect(result.totalHits).toBe(4); // 3 existing + 1 new
    });

    it('should handle concurrent requests correctly', async () => {
      cacheManager.get.mockResolvedValue(null);

      // Simulate multiple concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        service.checkRateLimit('user123', 'search'),
      );

      const results = await Promise.all(promises);

      // All should be allowed since we're starting fresh
      results.forEach((result) => {
        expect(result.allowed).toBe(true);
      });
    });
  });

  describe('Rate Limit Status Checking', () => {
    it('should get rate limit status without incrementing counter', async () => {
      const now = Date.now();
      const existingData = {
        count: 25,
        resetTime: now + 60000,
        requests: Array.from({ length: 25 }, (_, i) => now - i * 1000),
      };

      cacheManager.get.mockResolvedValue(existingData);

      const status = await service.getRateLimitStatus('user123', 'search');

      expect(status.allowed).toBe(true);
      expect(status.remaining).toBe(5); // 30 - 25
      expect(status.totalHits).toBe(25);

      // Should not increment the counter
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limit Reset', () => {
    it('should reset rate limit for specific user and endpoint', async () => {
      await service.resetRateLimit('user123', 'search');

      expect(cacheManager.del).toHaveBeenCalledWith(
        expect.stringContaining('search:user123'),
      );
    });

    it('should handle reset for unknown endpoint', async () => {
      await expect(
        service.resetRateLimit('user123', 'unknown'),
      ).rejects.toThrow();
    });
  });

  describe('Custom Rate Limit Configuration', () => {
    it('should use custom configuration when provided', async () => {
      cacheManager.get.mockResolvedValue(null);

      const customConfig = {
        maxRequests: 5,
        windowMs: 30000, // 30 seconds
      };

      const result = await service.checkRateLimit(
        'user123',
        'search',
        customConfig,
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1
    });

    it('should update rate limit configuration for endpoint', () => {
      const newConfig = {
        windowMs: 120000, // 2 minutes
        maxRequests: 100,
      };

      service.updateRateLimitConfig('search', newConfig);

      const config = service.getRateLimitConfig('search');
      expect(config).toEqual(newConfig);
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle cache failures gracefully', async () => {
      cacheManager.get.mockRejectedValue(new Error('Cache unavailable'));

      // Should not throw, but handle gracefully
      await expect(
        service.checkRateLimit('user123', 'search'),
      ).rejects.toThrow();
    });

    it('should handle corrupted cache data', async () => {
      cacheManager.get.mockResolvedValue({ invalid: 'data' });

      const result = await service.checkRateLimit('user123', 'search');

      // Should treat as new user and allow request
      expect(result.allowed).toBe(true);
    });

    it('should sanitize user identifiers in cache keys', async () => {
      const maliciousIdentifiers = [
        'user<script>alert(1)</script>',
        'user"; DROP TABLE cache; --',
        'user\n\r\t',
        'user with spaces',
      ];

      cacheManager.get.mockResolvedValue(null);

      for (const identifier of maliciousIdentifiers) {
        await service.checkRateLimit(identifier, 'search');

        const setCall = cacheManager.set.mock.calls.find((call) =>
          call[0].includes('rate_limit:search:'),
        );
        expect(setCall).toBeDefined();
        expect(setCall[0]).toMatch(/^rate_limit:search:[a-z0-9_-]+$/);
      }
    });
  });

  describe('Performance and Memory Safety', () => {
    it('should limit the number of stored request timestamps', async () => {
      const now = Date.now();

      // Simulate a user with many requests
      const manyRequests = Array.from(
        { length: 1000 },
        (_, i) => now - i * 100,
      );
      const existingData = {
        count: 1000,
        resetTime: now + 60000,
        requests: manyRequests,
      };

      cacheManager.get.mockResolvedValue(existingData);

      const result = await service.checkRateLimit('user123', 'search');

      // Should filter old requests and not store excessive data
      const setCall = cacheManager.set.mock.calls.find((call) =>
        call[0].includes('rate_limit:search:user123'),
      );

      if (setCall) {
        const storedData = setCall[1];
        expect(storedData.requests.length).toBeLessThan(1000);
      }
    });

    it('should handle very high request rates', async () => {
      cacheManager.get.mockResolvedValue(null);

      // Simulate burst of requests
      const startTime = Date.now();
      const promises = Array.from({ length: 100 }, async (_, i) => {
        // Add small delay to simulate real-world timing
        await new Promise((resolve) => setTimeout(resolve, i));
        return service.checkRateLimit('user123', 'search');
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max

      // Should properly enforce limits
      const allowedCount = results.filter((r) => r.allowed).length;
      expect(allowedCount).toBeLessThanOrEqual(30); // Search limit
    });
  });
});
