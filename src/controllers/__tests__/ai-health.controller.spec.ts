import { Test, TestingModule } from '@nestjs/testing';
import { AIHealthController } from '../ai-health.controller';
import { AIMonitoringService } from '../../services/ai-monitoring.service';
import {
  CircuitBreakerService,
  CircuitBreakerState,
} from '../../services/circuit-breaker.service';

describe('AIHealthController', () => {
  let controller: AIHealthController;
  let aiMonitoringService: jest.Mocked<AIMonitoringService>;
  let circuitBreakerService: jest.Mocked<CircuitBreakerService>;

  const mockHealthStatus = {
    status: 'healthy' as const,
    circuitBreakerState: CircuitBreakerState.CLOSED,
    rateLimitStatus: 'ok' as const,
    responseTimeStatus: 'fast' as const,
    errorRateStatus: 'low' as const,
    lastHealthCheck: new Date(),
    issues: [],
    recommendations: [],
  };

  const mockMetrics = {
    totalRequests: 100,
    successfulRequests: 95,
    failedRequests: 5,
    averageResponseTime: 1500,
    totalTokensUsed: 10000,
    rateLimitHits: 2,
    circuitBreakerTrips: 0,
    successRate: 95,
    requestsPerMinute: 10,
  };

  const mockAlert = {
    id: 'alert-1',
    type: 'error_rate' as const,
    severity: 'medium' as const,
    message: 'Error rate is elevated',
    details: { errorRate: 15 },
    timestamp: new Date(),
    resolved: false,
  };

  beforeEach(async () => {
    const mockAIMonitoringService = {
      getHealthStatus: jest.fn().mockReturnValue(mockHealthStatus),
      getMetrics: jest.fn().mockReturnValue(mockMetrics),
      getActiveAlerts: jest.fn().mockReturnValue([mockAlert]),
      getAllAlerts: jest.fn().mockReturnValue([mockAlert]),
      resolveAlert: jest.fn().mockReturnValue(true),
      getDiagnosticInfo: jest.fn().mockReturnValue({
        metrics: mockMetrics,
        health: mockHealthStatus,
        recentActivity: {
          requests: [],
          responseTimes: [],
          averageRecentResponseTime: 0,
        },
        circuitBreakers: {},
        alerts: { active: 1, total: 1 },
        thresholds: {},
        timestamp: new Date(),
      }),
      resetMetrics: jest.fn(),
    };

    const mockCircuitBreakerService = {
      getAllStatuses: jest.fn().mockReturnValue({
        'hugging-face-api': {
          state: CircuitBreakerState.CLOSED,
          failureCount: 0,
        },
      }),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AIHealthController],
      providers: [
        {
          provide: AIMonitoringService,
          useValue: mockAIMonitoringService,
        },
        {
          provide: CircuitBreakerService,
          useValue: mockCircuitBreakerService,
        },
      ],
    }).compile();

    controller = module.get<AIHealthController>(AIHealthController);
    aiMonitoringService = module.get(AIMonitoringService);
    circuitBreakerService = module.get(CircuitBreakerService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealthStatus', () => {
    it('should return AI service health status', () => {
      const result = controller.getHealthStatus();

      expect(result).toEqual({
        status: 'success',
        data: mockHealthStatus,
      });
      expect(aiMonitoringService.getHealthStatus).toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('should return AI service metrics', () => {
      const result = controller.getMetrics();

      expect(result).toEqual({
        status: 'success',
        data: mockMetrics,
      });
      expect(aiMonitoringService.getMetrics).toHaveBeenCalled();
    });
  });

  describe('getActiveAlerts', () => {
    it('should return active alerts', () => {
      const result = controller.getActiveAlerts();

      expect(result).toEqual({
        status: 'success',
        data: [mockAlert],
      });
      expect(aiMonitoringService.getActiveAlerts).toHaveBeenCalled();
    });
  });

  describe('getAllAlerts', () => {
    it('should return all alerts including resolved ones', () => {
      const result = controller.getAllAlerts();

      expect(result).toEqual({
        status: 'success',
        data: [mockAlert],
      });
      expect(aiMonitoringService.getAllAlerts).toHaveBeenCalled();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert successfully', () => {
      const result = controller.resolveAlert('alert-1');

      expect(result).toEqual({
        status: 'success',
        message: 'Alert resolved successfully',
      });
      expect(aiMonitoringService.resolveAlert).toHaveBeenCalledWith('alert-1');
    });

    it('should return error when alert not found', () => {
      aiMonitoringService.resolveAlert.mockReturnValue(false);

      const result = controller.resolveAlert('non-existent-alert');

      expect(result).toEqual({
        status: 'error',
        message: 'Alert not found or already resolved',
      });
    });
  });

  describe('getCircuitBreakerStatuses', () => {
    it('should return circuit breaker statuses', () => {
      const result = controller.getCircuitBreakerStatuses();

      expect(result).toEqual({
        status: 'success',
        data: {
          'hugging-face-api': {
            state: CircuitBreakerState.CLOSED,
            failureCount: 0,
          },
        },
      });
      expect(circuitBreakerService.getAllStatuses).toHaveBeenCalled();
    });
  });

  describe('resetCircuitBreaker', () => {
    it('should reset a circuit breaker', () => {
      const result = controller.resetCircuitBreaker('hugging-face-api');

      expect(result).toEqual({
        status: 'success',
        message: "Circuit breaker 'hugging-face-api' reset successfully",
      });
      expect(circuitBreakerService.reset).toHaveBeenCalledWith(
        'hugging-face-api',
      );
    });
  });

  describe('getDiagnostics', () => {
    it('should return comprehensive diagnostic information', () => {
      const result = controller.getDiagnostics();

      expect(result.status).toBe('success');
      expect(result.data).toHaveProperty('metrics');
      expect(result.data).toHaveProperty('health');
      expect(result.data).toHaveProperty('recentActivity');
      expect(result.data).toHaveProperty('circuitBreakers');
      expect(result.data).toHaveProperty('alerts');
      expect(aiMonitoringService.getDiagnosticInfo).toHaveBeenCalled();
    });
  });

  describe('resetMetrics', () => {
    it('should reset AI service metrics', () => {
      const result = controller.resetMetrics();

      expect(result).toEqual({
        status: 'success',
        message: 'AI service metrics reset successfully',
      });
      expect(aiMonitoringService.resetMetrics).toHaveBeenCalled();
    });
  });

  describe('performHealthCheck', () => {
    it('should perform immediate health check for healthy service', async () => {
      const result = await controller.performHealthCheck();

      expect(result.status).toBe('success');
      expect(result.data).toHaveProperty('health');
      expect(result.data).toHaveProperty('metrics');
      expect(result.data).toHaveProperty('timestamp');
      expect(result.data).toHaveProperty('recommendations');
      expect(result.data.recommendations).toEqual([]);
    });

    it('should provide recommendations for unhealthy service', async () => {
      const unhealthyStatus = {
        ...mockHealthStatus,
        status: 'unhealthy' as const,
        rateLimitStatus: 'exceeded' as const,
        responseTimeStatus: 'slow' as const,
        errorRateStatus: 'high' as const,
      };

      aiMonitoringService.getHealthStatus.mockReturnValue(unhealthyStatus);

      const result = await controller.performHealthCheck();

      expect(result.data.recommendations.length).toBeGreaterThan(0);
      expect(result.data.recommendations).toContain(
        'Immediate attention required - AI service is not functioning properly',
      );
      expect(result.data.recommendations).toContain(
        'Implement request queuing to manage rate limits',
      );
      expect(result.data.recommendations).toContain(
        'Optimize AI model requests or implement request batching',
      );
      expect(result.data.recommendations).toContain(
        'Investigate recent errors and implement better error handling',
      );
    });

    it('should provide recommendations for degraded service', async () => {
      const degradedStatus = {
        ...mockHealthStatus,
        status: 'degraded' as const,
        responseTimeStatus: 'slow' as const,
      };

      aiMonitoringService.getHealthStatus.mockReturnValue(degradedStatus);

      const result = await controller.performHealthCheck();

      expect(result.data.recommendations).toContain(
        'Monitor service closely - performance is below optimal',
      );
      expect(result.data.recommendations).toContain(
        'Optimize AI model requests or implement request batching',
      );
    });

    it('should provide rate limit specific recommendations', async () => {
      const rateLimitStatus = {
        ...mockHealthStatus,
        rateLimitStatus: 'approaching' as const,
      };

      aiMonitoringService.getHealthStatus.mockReturnValue(rateLimitStatus);

      const result = await controller.performHealthCheck();

      expect(result.data.recommendations).toContain(
        'Implement request queuing to manage rate limits',
      );
    });
  });

  describe('health recommendations', () => {
    it('should generate appropriate recommendations based on health status', async () => {
      // Test with various health conditions
      const testCases = [
        {
          health: { ...mockHealthStatus, status: 'healthy' as const },
          expectedRecommendations: 0,
        },
        {
          health: {
            ...mockHealthStatus,
            status: 'unhealthy' as const,
            rateLimitStatus: 'exceeded' as const,
            responseTimeStatus: 'timeout' as const,
            errorRateStatus: 'high' as const,
          },
          expectedRecommendations: 7, // All categories of recommendations
        },
        {
          health: {
            ...mockHealthStatus,
            status: 'degraded' as const,
            responseTimeStatus: 'slow' as const,
          },
          expectedRecommendations: 4, // Degraded + response time recommendations
        },
      ];

      for (const testCase of testCases) {
        aiMonitoringService.getHealthStatus.mockReturnValue(testCase.health);

        const result = await controller.performHealthCheck();

        expect(result.data.recommendations.length).toBe(
          testCase.expectedRecommendations,
        );
      }
    });
  });
});
