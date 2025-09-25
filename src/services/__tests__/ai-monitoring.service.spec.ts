import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AIMonitoringService } from '../ai-monitoring.service';
import {
  CircuitBreakerService,
  CircuitBreakerState,
} from '../circuit-breaker.service';
import { AIApiUsage } from '../../entities/ai-api-usage.entity';

describe('AIMonitoringService', () => {
  let service: AIMonitoringService;
  let aiApiUsageRepository: jest.Mocked<Repository<AIApiUsage>>;
  let circuitBreakerService: jest.Mocked<CircuitBreakerService>;

  beforeEach(async () => {
    const mockAIApiUsageRepository = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      }),
    };

    const mockCircuitBreakerService = {
      getStatus: jest.fn().mockReturnValue({
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
      }),
      getAllStatuses: jest.fn().mockReturnValue({
        'hugging-face-api': {
          state: CircuitBreakerState.CLOSED,
          failureCount: 0,
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIMonitoringService,
        {
          provide: getRepositoryToken(AIApiUsage),
          useValue: mockAIApiUsageRepository,
        },
        {
          provide: CircuitBreakerService,
          useValue: mockCircuitBreakerService,
        },
      ],
    }).compile();

    service = module.get<AIMonitoringService>(AIMonitoringService);
    aiApiUsageRepository = module.get(getRepositoryToken(AIApiUsage));
    circuitBreakerService = module.get(CircuitBreakerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordAPIRequest', () => {
    it('should record successful API request', () => {
      service.recordAPIRequest(
        '/embeddings',
        'sentence-transformers/all-MiniLM-L6-v2',
        100,
        1500,
        true,
        undefined,
        'user-1',
      );

      const metrics = service.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.totalTokensUsed).toBe(100);
      expect(metrics.averageResponseTime).toBe(1500);
      expect(metrics.successRate).toBe(100);
    });

    it('should record failed API request', () => {
      service.recordAPIRequest(
        '/embeddings',
        'sentence-transformers/all-MiniLM-L6-v2',
        0,
        5000,
        false,
        'Rate limit exceeded',
        'user-1',
      );

      const metrics = service.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.successRate).toBe(0);
    });

    it('should calculate average response time correctly', () => {
      service.recordAPIRequest('/embeddings', 'model', 100, 1000, true);
      service.recordAPIRequest('/embeddings', 'model', 100, 2000, true);
      service.recordAPIRequest('/embeddings', 'model', 100, 3000, true);

      const metrics = service.getMetrics();
      expect(metrics.averageResponseTime).toBe(2000);
    });

    it('should update success rate correctly', () => {
      // Record 3 successful and 2 failed requests
      service.recordAPIRequest('/embeddings', 'model', 100, 1000, true);
      service.recordAPIRequest('/embeddings', 'model', 100, 1000, true);
      service.recordAPIRequest('/embeddings', 'model', 100, 1000, true);
      service.recordAPIRequest('/embeddings', 'model', 0, 1000, false);
      service.recordAPIRequest('/embeddings', 'model', 0, 1000, false);

      const metrics = service.getMetrics();
      expect(metrics.totalRequests).toBe(5);
      expect(metrics.successfulRequests).toBe(3);
      expect(metrics.failedRequests).toBe(2);
      expect(metrics.successRate).toBe(60);
    });

    it('should save API usage to database', async () => {
      const mockApiUsage = { id: 'usage-1' };
      aiApiUsageRepository.create.mockReturnValue(mockApiUsage as any);
      aiApiUsageRepository.save.mockResolvedValue(mockApiUsage as any);

      service.recordAPIRequest(
        '/embeddings',
        'test-model',
        150,
        2000,
        true,
        undefined,
        'user-1',
      );

      // Wait for async database operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(aiApiUsageRepository.create).toHaveBeenCalledWith({
        endpoint: '/embeddings',
        model: 'test-model',
        tokensUsed: 150,
        responseTimeMs: 2000,
        success: true,
        errorMessage: undefined,
        userId: 'user-1',
      });
      expect(aiApiUsageRepository.save).toHaveBeenCalledWith(mockApiUsage);
    });
  });

  describe('recordRateLimitHit', () => {
    it('should increment rate limit hits', () => {
      service.recordRateLimitHit();
      service.recordRateLimitHit();

      const metrics = service.getMetrics();
      expect(metrics.rateLimitHits).toBe(2);
    });
  });

  describe('recordCircuitBreakerTrip', () => {
    it('should increment circuit breaker trips and create alert', () => {
      service.recordCircuitBreakerTrip('hugging-face-api');

      const metrics = service.getMetrics();
      const alerts = service.getActiveAlerts();

      expect(metrics.circuitBreakerTrips).toBe(1);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('circuit_breaker');
      expect(alerts[0].severity).toBe('high');
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when all metrics are good', () => {
      // Record some successful requests
      for (let i = 0; i < 10; i++) {
        service.recordAPIRequest('/embeddings', 'model', 100, 1000, true);
      }

      const health = service.getHealthStatus();
      expect(health.status).toBe('healthy');
      expect(health.circuitBreakerState).toBe(CircuitBreakerState.CLOSED);
      expect(health.errorRateStatus).toBe('low');
      expect(health.responseTimeStatus).toBe('fast');
      expect(health.rateLimitStatus).toBe('ok');
    });

    it('should return degraded status when response times are slow', () => {
      // Record requests with slow response times
      for (let i = 0; i < 10; i++) {
        service.recordAPIRequest('/embeddings', 'model', 100, 3000, true);
      }

      const health = service.getHealthStatus();
      expect(health.status).toBe('degraded');
      expect(health.responseTimeStatus).toBe('slow');
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.recommendations.length).toBeGreaterThan(0);
    });

    it('should return unhealthy status when error rate is high', () => {
      // Record mostly failed requests
      for (let i = 0; i < 10; i++) {
        service.recordAPIRequest('/embeddings', 'model', 0, 1000, false);
      }
      service.recordAPIRequest('/embeddings', 'model', 100, 1000, true);

      const health = service.getHealthStatus();
      expect(health.status).toBe('unhealthy');
      expect(health.errorRateStatus).toBe('high');
    });

    it('should return unhealthy status when circuit breaker is open', () => {
      circuitBreakerService.getStatus.mockReturnValue({
        state: CircuitBreakerState.OPEN,
        failureCount: 5,
      });

      const health = service.getHealthStatus();
      expect(health.status).toBe('unhealthy');
      expect(health.circuitBreakerState).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('alerts', () => {
    it('should create error rate alert when threshold exceeded', () => {
      // Record requests with high error rate
      for (let i = 0; i < 8; i++) {
        service.recordAPIRequest('/embeddings', 'model', 0, 1000, false);
      }
      for (let i = 0; i < 2; i++) {
        service.recordAPIRequest('/embeddings', 'model', 100, 1000, true);
      }

      const alerts = service.getActiveAlerts();
      const errorRateAlert = alerts.find(
        (alert) => alert.type === 'error_rate',
      );

      expect(errorRateAlert).toBeDefined();
      expect(errorRateAlert!.severity).toBe('high');
      expect(errorRateAlert!.details.errorRate).toBe(80);
    });

    it('should create response time alert when threshold exceeded', () => {
      // Record requests with very slow response times
      service.recordAPIRequest('/embeddings', 'model', 100, 6000, true);

      const alerts = service.getActiveAlerts();
      const responseTimeAlert = alerts.find(
        (alert) => alert.type === 'response_time',
      );

      expect(responseTimeAlert).toBeDefined();
      expect(responseTimeAlert!.severity).toBe('medium');
    });

    it('should create rate limit alert when threshold exceeded', () => {
      // Record requests with many rate limit hits
      for (let i = 0; i < 10; i++) {
        service.recordAPIRequest('/embeddings', 'model', 100, 1000, true);
        if (i >= 8) {
          service.recordRateLimitHit();
        }
      }

      const alerts = service.getActiveAlerts();
      const rateLimitAlert = alerts.find(
        (alert) => alert.type === 'rate_limit',
      );

      expect(rateLimitAlert).toBeDefined();
      expect(rateLimitAlert!.severity).toBe('high');
    });

    it('should resolve alert', () => {
      service.recordCircuitBreakerTrip('test-service');

      const alerts = service.getActiveAlerts();
      expect(alerts).toHaveLength(1);

      const alertId = alerts[0].id;
      const resolved = service.resolveAlert(alertId);

      expect(resolved).toBe(true);
      expect(service.getActiveAlerts()).toHaveLength(0);

      const allAlerts = service.getAllAlerts();
      expect(allAlerts[0].resolved).toBe(true);
      expect(allAlerts[0].resolvedAt).toBeDefined();
    });

    it('should not resolve non-existent alert', () => {
      const resolved = service.resolveAlert('non-existent-id');
      expect(resolved).toBe(false);
    });

    it('should not create duplicate alerts of same type', () => {
      // Create multiple circuit breaker trips
      service.recordCircuitBreakerTrip('test-service');
      service.recordCircuitBreakerTrip('test-service');
      service.recordCircuitBreakerTrip('test-service');

      const alerts = service.getActiveAlerts();
      const circuitBreakerAlerts = alerts.filter(
        (alert) => alert.type === 'circuit_breaker',
      );

      expect(circuitBreakerAlerts).toHaveLength(1);
    });
  });

  describe('getDiagnosticInfo', () => {
    it('should return comprehensive diagnostic information', () => {
      // Record some activity
      service.recordAPIRequest('/embeddings', 'model', 100, 1500, true);
      service.recordAPIRequest('/embeddings', 'model', 150, 2000, false);
      service.recordRateLimitHit();

      const diagnostics = service.getDiagnosticInfo();

      expect(diagnostics).toHaveProperty('metrics');
      expect(diagnostics).toHaveProperty('health');
      expect(diagnostics).toHaveProperty('recentActivity');
      expect(diagnostics).toHaveProperty('circuitBreakers');
      expect(diagnostics).toHaveProperty('alerts');
      expect(diagnostics).toHaveProperty('thresholds');
      expect(diagnostics).toHaveProperty('timestamp');

      expect(diagnostics.recentActivity.requests).toHaveLength(2);
      expect(diagnostics.recentActivity.responseTimes).toEqual([1500, 2000]);
      expect(diagnostics.recentActivity.averageRecentResponseTime).toBe(1750);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics to initial state', () => {
      // Record some activity
      service.recordAPIRequest('/embeddings', 'model', 100, 1500, true);
      service.recordAPIRequest('/embeddings', 'model', 0, 2000, false);
      service.recordRateLimitHit();
      service.recordCircuitBreakerTrip('test-service');

      // Verify metrics are not zero
      let metrics = service.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.totalTokensUsed).toBe(100);

      // Reset metrics
      service.resetMetrics();

      // Verify metrics are reset
      metrics = service.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
      expect(metrics.totalTokensUsed).toBe(0);
      expect(metrics.rateLimitHits).toBe(0);
      expect(metrics.circuitBreakerTrips).toBe(0);
      expect(metrics.successRate).toBe(100);
      expect(metrics.requestsPerMinute).toBe(0);
    });
  });

  describe('periodic tasks', () => {
    it('should perform health check', async () => {
      const logSpy = jest
        .spyOn(service['logger'], 'debug')
        .mockImplementation();

      await service.performHealthCheck();

      expect(logSpy).toHaveBeenCalledWith('AI service health check passed');
    });

    it('should log warnings for degraded health', async () => {
      const warnSpy = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation();

      // Create conditions for degraded health
      for (let i = 0; i < 10; i++) {
        service.recordAPIRequest('/embeddings', 'model', 100, 3000, true);
      }

      await service.performHealthCheck();

      expect(warnSpy).toHaveBeenCalledWith(
        'AI service health degraded',
        expect.any(Object),
      );
    });

    it('should log errors for unhealthy status', async () => {
      const errorSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      // Create conditions for unhealthy status
      circuitBreakerService.getStatus.mockReturnValue({
        state: CircuitBreakerState.OPEN,
        failureCount: 5,
      });

      await service.performHealthCheck();

      expect(errorSpy).toHaveBeenCalledWith(
        'AI service health check failed',
        expect.any(Object),
      );
    });

    it('should cleanup old metrics', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log').mockImplementation();

      await service.cleanupOldMetrics();

      expect(aiApiUsageRepository.createQueryBuilder).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('Cleaned up 5 old API usage records');
    });
  });

  describe('requests per minute calculation', () => {
    it('should calculate requests per minute correctly', () => {
      // Mock Date.now to control time
      const originalNow = Date.now;
      const baseTime = 1000000000000; // Fixed timestamp
      Date.now = jest.fn(() => baseTime);

      // Record requests at different times
      service.recordAPIRequest('/embeddings', 'model', 100, 1000, true);

      Date.now = jest.fn(() => baseTime + 30000); // 30 seconds later
      service.recordAPIRequest('/embeddings', 'model', 100, 1000, true);

      Date.now = jest.fn(() => baseTime + 90000); // 90 seconds later (outside 1 minute window)
      service.recordAPIRequest('/embeddings', 'model', 100, 1000, true);

      const metrics = service.getMetrics();

      // Should only count the last request (within 1 minute)
      expect(metrics.requestsPerMinute).toBe(1);

      // Restore original Date.now
      Date.now = originalNow;
    });
  });
});
