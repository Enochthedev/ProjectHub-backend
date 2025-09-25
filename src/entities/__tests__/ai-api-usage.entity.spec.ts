import { AIApiUsage } from '../ai-api-usage.entity';
import { User } from '../user.entity';
import { UserRole } from '../../common/enums/user-role.enum';

describe('AIApiUsage Entity', () => {
  let apiUsage: AIApiUsage;
  let mockUser: User;

  beforeEach(() => {
    // Create mock user
    mockUser = new User();
    mockUser.id = 'test-user-id';
    mockUser.email = 'student@ui.edu.ng';
    mockUser.role = UserRole.STUDENT;

    // Create API usage record
    apiUsage = new AIApiUsage();
    apiUsage.id = 'test-usage-id';
    apiUsage.endpoint = '/api/embeddings';
    apiUsage.model = 'sentence-transformers/all-MiniLM-L6-v2';
    apiUsage.tokensUsed = 150;
    apiUsage.responseTimeMs = 2500;
    apiUsage.success = true;
    apiUsage.errorMessage = null;
    apiUsage.user = mockUser;
    apiUsage.userId = mockUser.id;
    apiUsage.createdAt = new Date('2024-01-01T10:00:00Z');
  });

  describe('Entity Structure', () => {
    it('should create API usage record with all required fields', () => {
      expect(apiUsage.id).toBe('test-usage-id');
      expect(apiUsage.endpoint).toBe('/api/embeddings');
      expect(apiUsage.model).toBe('sentence-transformers/all-MiniLM-L6-v2');
      expect(apiUsage.tokensUsed).toBe(150);
      expect(apiUsage.responseTimeMs).toBe(2500);
      expect(apiUsage.success).toBe(true);
      expect(apiUsage.errorMessage).toBeNull();
    });

    it('should have relationship with User entity', () => {
      expect(apiUsage.user).toBe(mockUser);
      expect(apiUsage.userId).toBe(mockUser.id);
    });

    it('should allow nullable user relationship', () => {
      apiUsage.user = null;
      apiUsage.userId = null;
      expect(apiUsage.user).toBeNull();
      expect(apiUsage.userId).toBeNull();
    });

    it('should allow nullable error message', () => {
      expect(apiUsage.errorMessage).toBeNull();

      apiUsage.errorMessage = 'Rate limit exceeded';
      expect(apiUsage.errorMessage).toBe('Rate limit exceeded');
    });

    it('should have success field defined', () => {
      const newUsage = new AIApiUsage();
      // Note: Default value will be set by TypeORM, not in the entity constructor
      expect(newUsage).toHaveProperty('success');
    });
  });

  describe('Performance Metrics', () => {
    it('should track token usage accurately', () => {
      const tokenCounts = [50, 100, 250, 500, 1000];
      tokenCounts.forEach((count) => {
        apiUsage.tokensUsed = count;
        expect(apiUsage.tokensUsed).toBe(count);
      });
    });

    it('should track response time in milliseconds', () => {
      const responseTimes = [100, 500, 1000, 2500, 5000, 10000];
      responseTimes.forEach((time) => {
        apiUsage.responseTimeMs = time;
        expect(apiUsage.responseTimeMs).toBe(time);
      });
    });

    it('should handle different endpoint types', () => {
      const endpoints = [
        '/api/embeddings',
        '/api/similarity',
        '/api/recommendations',
        '/api/text-processing',
      ];

      endpoints.forEach((endpoint) => {
        apiUsage.endpoint = endpoint;
        expect(apiUsage.endpoint).toBe(endpoint);
      });
    });

    it('should handle different model names', () => {
      const models = [
        'sentence-transformers/all-MiniLM-L6-v2',
        'sentence-transformers/all-mpnet-base-v2',
        'microsoft/DialoGPT-medium',
      ];

      models.forEach((model) => {
        apiUsage.model = model;
        expect(apiUsage.model).toBe(model);
      });
    });
  });

  describe('Helper Methods', () => {
    describe('isSuccessful', () => {
      it('should return true when success is true', () => {
        apiUsage.success = true;
        expect(apiUsage.isSuccessful()).toBe(true);
      });

      it('should return false when success is false', () => {
        apiUsage.success = false;
        expect(apiUsage.isSuccessful()).toBe(false);
      });
    });

    describe('isFailed', () => {
      it('should return false when success is true', () => {
        apiUsage.success = true;
        expect(apiUsage.isFailed()).toBe(false);
      });

      it('should return true when success is false', () => {
        apiUsage.success = false;
        expect(apiUsage.isFailed()).toBe(true);
      });
    });

    describe('isSlowResponse', () => {
      it('should return false for fast responses with default threshold', () => {
        apiUsage.responseTimeMs = 2000;
        expect(apiUsage.isSlowResponse()).toBe(false);
      });

      it('should return true for slow responses with default threshold', () => {
        apiUsage.responseTimeMs = 6000;
        expect(apiUsage.isSlowResponse()).toBe(true);
      });

      it('should use custom threshold when provided', () => {
        apiUsage.responseTimeMs = 3000;
        expect(apiUsage.isSlowResponse(2500)).toBe(true);
        expect(apiUsage.isSlowResponse(3500)).toBe(false);
      });

      it('should handle edge case at threshold boundary', () => {
        apiUsage.responseTimeMs = 5000;
        expect(apiUsage.isSlowResponse(5000)).toBe(false);

        apiUsage.responseTimeMs = 5001;
        expect(apiUsage.isSlowResponse(5000)).toBe(true);
      });
    });

    describe('hasError', () => {
      it('should return false when error message is null', () => {
        apiUsage.errorMessage = null;
        expect(apiUsage.hasError()).toBe(false);
      });

      it('should return false when error message is empty string', () => {
        apiUsage.errorMessage = '';
        expect(apiUsage.hasError()).toBe(false);
      });

      it('should return true when error message has content', () => {
        apiUsage.errorMessage = 'API rate limit exceeded';
        expect(apiUsage.hasError()).toBe(true);
      });

      it('should return true for whitespace-only error messages', () => {
        apiUsage.errorMessage = '   ';
        expect(apiUsage.hasError()).toBe(true);
      });
    });

    describe('getUsageMetrics', () => {
      it('should return complete usage metrics object', () => {
        const metrics = apiUsage.getUsageMetrics();

        expect(metrics).toEqual({
          endpoint: '/api/embeddings',
          model: 'sentence-transformers/all-MiniLM-L6-v2',
          tokensUsed: 150,
          responseTimeMs: 2500,
          success: true,
          timestamp: new Date('2024-01-01T10:00:00Z'),
        });
      });

      it('should include all required fields in metrics', () => {
        const metrics = apiUsage.getUsageMetrics();

        expect(metrics).toHaveProperty('endpoint');
        expect(metrics).toHaveProperty('model');
        expect(metrics).toHaveProperty('tokensUsed');
        expect(metrics).toHaveProperty('responseTimeMs');
        expect(metrics).toHaveProperty('success');
        expect(metrics).toHaveProperty('timestamp');
      });

      it('should reflect current entity state', () => {
        apiUsage.endpoint = '/api/similarity';
        apiUsage.tokensUsed = 300;
        apiUsage.success = false;

        const metrics = apiUsage.getUsageMetrics();

        expect(metrics.endpoint).toBe('/api/similarity');
        expect(metrics.tokensUsed).toBe(300);
        expect(metrics.success).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle failed API calls with error messages', () => {
      apiUsage.success = false;
      apiUsage.errorMessage = 'Connection timeout';

      expect(apiUsage.isFailed()).toBe(true);
      expect(apiUsage.hasError()).toBe(true);
      expect(apiUsage.errorMessage).toBe('Connection timeout');
    });

    it('should handle different types of errors', () => {
      const errorMessages = [
        'Rate limit exceeded',
        'Invalid API key',
        'Model not found',
        'Request timeout',
        'Internal server error',
      ];

      errorMessages.forEach((error) => {
        apiUsage.errorMessage = error;
        apiUsage.success = false;

        expect(apiUsage.hasError()).toBe(true);
        expect(apiUsage.isFailed()).toBe(true);
        expect(apiUsage.errorMessage).toBe(error);
      });
    });
  });

  describe('Analytics Use Cases', () => {
    it('should support rate limiting analytics', () => {
      // Simulate multiple API calls for rate limiting analysis
      const usageRecords = [
        { tokensUsed: 100, responseTimeMs: 1000, success: true },
        { tokensUsed: 150, responseTimeMs: 1200, success: true },
        { tokensUsed: 200, responseTimeMs: 8000, success: false }, // Rate limited
      ];

      usageRecords.forEach((record, index) => {
        const usage = new AIApiUsage();
        usage.tokensUsed = record.tokensUsed;
        usage.responseTimeMs = record.responseTimeMs;
        usage.success = record.success;

        if (index === 2) {
          usage.errorMessage = 'Rate limit exceeded';
          expect(usage.hasError()).toBe(true);
          expect(usage.isSlowResponse()).toBe(true);
        }

        expect(usage.isSuccessful()).toBe(record.success);
      });
    });

    it('should support performance monitoring', () => {
      // Test performance categorization
      const performanceTests = [
        { responseTime: 500, expected: 'fast' },
        { responseTime: 2000, expected: 'normal' },
        { responseTime: 6000, expected: 'slow' },
      ];

      performanceTests.forEach((test) => {
        apiUsage.responseTimeMs = test.responseTime;

        if (test.expected === 'slow') {
          expect(apiUsage.isSlowResponse()).toBe(true);
        } else {
          expect(apiUsage.isSlowResponse()).toBe(false);
        }
      });
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt field', () => {
      expect(apiUsage.createdAt).toEqual(new Date('2024-01-01T10:00:00Z'));
    });

    it('should support timestamp-based queries', () => {
      const timestamp = apiUsage.createdAt;
      expect(timestamp instanceof Date).toBe(true);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });
});
