import { Test, TestingModule } from '@nestjs/testing';
import {
  AIAssistantHealthController,
  CreateAlertRuleDto,
} from '../ai-assistant-health.controller';
import {
  AIAssistantMonitoringService,
  HealthCheckResult,
  AlertRule,
} from '../../services/ai-assistant-monitoring.service';
import { AIAssistantErrorRecoveryService } from '../../services/ai-assistant-error-recovery.service';

describe('AIAssistantHealthController', () => {
  let controller: AIAssistantHealthController;
  let monitoringService: jest.Mocked<AIAssistantMonitoringService>;
  let errorRecoveryService: jest.Mocked<AIAssistantErrorRecoveryService>;

  const mockHealthCheckResult: HealthCheckResult = {
    serviceName: 'test-service',
    status: 'healthy',
    responseTime: 100,
    timestamp: new Date(),
    details: {
      consecutiveFailures: 0,
      errorRate: 0,
      averageResponseTime: 100,
      circuitBreakerOpen: false,
    },
  };

  const mockAlertRule: AlertRule = {
    id: 'rule-1',
    name: 'Test Alert Rule',
    condition: {
      type: 'error_rate',
      threshold: 0.1,
      comparison: 'greater_than',
    },
    severity: 'high',
    enabled: true,
    cooldownMinutes: 15,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AIAssistantHealthController],
      providers: [
        {
          provide: AIAssistantMonitoringService,
          useValue: {
            performAllHealthChecks: jest.fn(),
            performHealthCheck: jest.fn(),
            getDiagnosticInfo: jest.fn(),
            getServiceMetrics: jest.fn(),
            getActiveAlerts: jest.fn(),
            getAllAlerts: jest.fn(),
            resolveAlert: jest.fn(),
            getAlertRules: jest.fn(),
            createAlertRule: jest.fn(),
            updateAlertRule: jest.fn(),
            deleteAlertRule: jest.fn(),
            getConfiguration: jest.fn(),
            updateConfiguration: jest.fn(),
          },
        },
        {
          provide: AIAssistantErrorRecoveryService,
          useValue: {
            openCircuitBreaker: jest.fn(),
            closeCircuitBreaker: jest.fn(),
            resetServiceHealth: jest.fn(),
            getServiceHealth: jest.fn(),
            getRecoveryRecommendations: jest.fn(),
            getRetryConfiguration: jest.fn(),
            updateRetryConfiguration: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AIAssistantHealthController>(
      AIAssistantHealthController,
    );
    monitoringService = module.get(AIAssistantMonitoringService);
    errorRecoveryService = module.get(AIAssistantErrorRecoveryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverallHealthStatus', () => {
    it('should return overall health status with healthy services', async () => {
      const healthChecks = [
        { ...mockHealthCheckResult, serviceName: 'service-1' },
        { ...mockHealthCheckResult, serviceName: 'service-2' },
      ];

      monitoringService.performAllHealthChecks.mockResolvedValue(healthChecks);
      monitoringService.getActiveAlerts.mockReturnValue([]);

      const result = await controller.getOverallHealthStatus();

      expect(result.status).toBe('healthy');
      expect(result.services).toBe(2);
      expect(result.healthyServices).toBe(2);
      expect(result.activeAlerts).toBe(0);
      expect(result.checks).toEqual(healthChecks);
    });

    it('should return critical status when services are critical', async () => {
      const healthChecks = [
        { ...mockHealthCheckResult, status: 'critical' as const },
        { ...mockHealthCheckResult, serviceName: 'service-2' },
      ];

      monitoringService.performAllHealthChecks.mockResolvedValue(healthChecks);
      monitoringService.getActiveAlerts.mockReturnValue([]);

      const result = await controller.getOverallHealthStatus();

      expect(result.status).toBe('critical');
      expect(result.healthyServices).toBe(1);
    });

    it('should return degraded status when services are degraded', async () => {
      const healthChecks = [
        { ...mockHealthCheckResult, status: 'degraded' as const },
        { ...mockHealthCheckResult, serviceName: 'service-2' },
      ];

      monitoringService.performAllHealthChecks.mockResolvedValue(healthChecks);
      monitoringService.getActiveAlerts.mockReturnValue([]);

      const result = await controller.getOverallHealthStatus();

      expect(result.status).toBe('degraded');
    });

    it('should include active alerts information', async () => {
      const mockAlerts = [
        { id: 'alert-1', severity: 'critical' },
        { id: 'alert-2', severity: 'high' },
      ];

      monitoringService.performAllHealthChecks.mockResolvedValue([
        mockHealthCheckResult,
      ]);
      monitoringService.getActiveAlerts.mockReturnValue(mockAlerts as any);

      const result = await controller.getOverallHealthStatus();

      expect(result.activeAlerts).toBe(2);
      expect(result.criticalAlerts).toBe(1);
    });
  });

  describe('getAllServiceHealth', () => {
    it('should return health status for all services', async () => {
      const healthChecks = [mockHealthCheckResult];
      monitoringService.performAllHealthChecks.mockResolvedValue(healthChecks);

      const result = await controller.getAllServiceHealth();

      expect(result).toEqual(healthChecks);
      expect(monitoringService.performAllHealthChecks).toHaveBeenCalled();
    });
  });

  describe('getServiceHealth', () => {
    it('should return health status for specific service', async () => {
      monitoringService.performHealthCheck.mockResolvedValue(
        mockHealthCheckResult,
      );

      const result = await controller.getServiceHealth('test-service');

      expect(result).toEqual(mockHealthCheckResult);
      expect(monitoringService.performHealthCheck).toHaveBeenCalledWith(
        'test-service',
      );
    });
  });

  describe('getServiceDiagnostics', () => {
    it('should return diagnostic information for service', async () => {
      const mockDiagnostics = {
        serviceName: 'test-service',
        status: 'healthy' as const,
        uptime: 99.9,
        metrics: {} as any,
        recentErrors: [],
        performanceHistory: [],
        recommendations: ['Service is healthy'],
      };

      monitoringService.getDiagnosticInfo.mockResolvedValue(mockDiagnostics);

      const result = await controller.getServiceDiagnostics('test-service');

      expect(result).toEqual(mockDiagnostics);
      expect(monitoringService.getDiagnosticInfo).toHaveBeenCalledWith(
        'test-service',
      );
    });
  });

  describe('getServiceMetrics', () => {
    it('should return metrics for service', async () => {
      const mockMetrics = {
        totalRequests: 100,
        successfulRequests: 95,
        failedRequests: 5,
        averageResponseTime: 150,
        errorRate: 0.05,
        uptime: 95,
        lastUpdated: new Date(),
      };

      monitoringService.getServiceMetrics.mockReturnValue(mockMetrics);

      const result = await controller.getServiceMetrics('test-service');

      expect(result).toEqual(mockMetrics);
      expect(monitoringService.getServiceMetrics).toHaveBeenCalledWith(
        'test-service',
      );
    });
  });

  describe('circuit breaker management', () => {
    it('should open circuit breaker', async () => {
      const result = await controller.openCircuitBreaker('test-service', 30000);

      expect(result.message).toContain('Circuit breaker opened');
      expect(result.duration).toBe(30000);
      expect(errorRecoveryService.openCircuitBreaker).toHaveBeenCalledWith(
        'test-service',
        30000,
      );
    });

    it('should open circuit breaker with default duration', async () => {
      const result = await controller.openCircuitBreaker('test-service');

      expect(result.duration).toBe(60000);
      expect(errorRecoveryService.openCircuitBreaker).toHaveBeenCalledWith(
        'test-service',
        undefined,
      );
    });

    it('should close circuit breaker', async () => {
      const result = await controller.closeCircuitBreaker('test-service');

      expect(result.message).toContain('Circuit breaker closed');
      expect(errorRecoveryService.closeCircuitBreaker).toHaveBeenCalledWith(
        'test-service',
      );
    });
  });

  describe('resetServiceHealth', () => {
    it('should reset service health', async () => {
      const result = await controller.resetServiceHealth('test-service');

      expect(result.message).toContain('Health status reset');
      expect(errorRecoveryService.resetServiceHealth).toHaveBeenCalledWith(
        'test-service',
      );
    });
  });

  describe('alert management', () => {
    it('should get active alerts only', async () => {
      const mockAlerts = [{ id: 'alert-1' }];
      monitoringService.getActiveAlerts.mockReturnValue(mockAlerts as any);

      const result = await controller.getAlerts('true');

      expect(result).toEqual(mockAlerts);
      expect(monitoringService.getActiveAlerts).toHaveBeenCalled();
      expect(monitoringService.getAllAlerts).not.toHaveBeenCalled();
    });

    it('should get all alerts', async () => {
      const mockAlerts = [{ id: 'alert-1' }, { id: 'alert-2' }];
      monitoringService.getAllAlerts.mockReturnValue(mockAlerts as any);

      const result = await controller.getAlerts('false');

      expect(result).toEqual(mockAlerts);
      expect(monitoringService.getAllAlerts).toHaveBeenCalled();
      expect(monitoringService.getActiveAlerts).not.toHaveBeenCalled();
    });

    it('should resolve alert successfully', async () => {
      monitoringService.resolveAlert.mockReturnValue(true);

      const result = await controller.resolveAlert('alert-1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('resolved successfully');
      expect(monitoringService.resolveAlert).toHaveBeenCalledWith('alert-1');
    });

    it('should handle alert not found', async () => {
      monitoringService.resolveAlert.mockReturnValue(false);

      const result = await controller.resolveAlert('nonexistent-alert');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('alert rule management', () => {
    it('should get all alert rules', async () => {
      const mockRules = [mockAlertRule];
      monitoringService.getAlertRules.mockReturnValue(mockRules);

      const result = await controller.getAlertRules();

      expect(result).toEqual(mockRules);
      expect(monitoringService.getAlertRules).toHaveBeenCalled();
    });

    it('should create alert rule', async () => {
      const createDto: CreateAlertRuleDto = {
        name: 'New Alert Rule',
        condition: {
          type: 'error_rate',
          threshold: 0.2,
          comparison: 'greater_than',
        },
        severity: 'medium',
        enabled: true,
        cooldownMinutes: 10,
      };

      monitoringService.createAlertRule.mockReturnValue(mockAlertRule);

      const result = await controller.createAlertRule(createDto);

      expect(result).toEqual(mockAlertRule);
      expect(monitoringService.createAlertRule).toHaveBeenCalledWith(createDto);
    });

    it('should update alert rule successfully', async () => {
      const updateDto = { severity: 'critical' as const };
      const updatedRule = { ...mockAlertRule, severity: 'critical' as const };

      monitoringService.updateAlertRule.mockReturnValue(updatedRule);

      const result = await controller.updateAlertRule('rule-1', updateDto);

      expect(result.success).toBe(true);
      expect(result.rule).toEqual(updatedRule);
      expect(monitoringService.updateAlertRule).toHaveBeenCalledWith(
        'rule-1',
        updateDto,
      );
    });

    it('should handle alert rule not found on update', async () => {
      monitoringService.updateAlertRule.mockReturnValue(null);

      const result = await controller.updateAlertRule('nonexistent-rule', {});

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should delete alert rule successfully', async () => {
      monitoringService.deleteAlertRule.mockReturnValue(true);

      const result = await controller.deleteAlertRule('rule-1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');
      expect(monitoringService.deleteAlertRule).toHaveBeenCalledWith('rule-1');
    });

    it('should handle alert rule not found on delete', async () => {
      monitoringService.deleteAlertRule.mockReturnValue(false);

      const result = await controller.deleteAlertRule('nonexistent-rule');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('configuration management', () => {
    it('should get configuration', async () => {
      const mockMonitoringConfig = { healthCheckInterval: 60000 };
      const mockErrorRecoveryConfig = { maxAttempts: 3 };

      monitoringService.getConfiguration.mockReturnValue(
        mockMonitoringConfig as any,
      );
      errorRecoveryService.getRetryConfiguration.mockReturnValue(
        mockErrorRecoveryConfig as any,
      );

      const result = await controller.getConfiguration();

      expect(result.monitoring).toEqual(mockMonitoringConfig);
      expect(result.errorRecovery).toEqual(mockErrorRecoveryConfig);
    });

    it('should update monitoring configuration', async () => {
      const updates = { healthCheckInterval: 30000 };
      const updatedConfig = {
        healthCheckInterval: 30000,
        metricsRetentionDays: 7,
      };

      monitoringService.getConfiguration.mockReturnValue(updatedConfig as any);

      const result = await controller.updateMonitoringConfiguration(updates);

      expect(result.success).toBe(true);
      expect(result.configuration).toEqual(updatedConfig);
      expect(monitoringService.updateConfiguration).toHaveBeenCalledWith(
        updates,
      );
    });

    it('should update error recovery configuration', async () => {
      const updates = { maxAttempts: 5 };
      const updatedConfig = { maxAttempts: 5, baseDelayMs: 1000 };

      errorRecoveryService.getRetryConfiguration.mockReturnValue(
        updatedConfig as any,
      );

      const result = await controller.updateErrorRecoveryConfiguration(updates);

      expect(result.success).toBe(true);
      expect(result.configuration).toEqual(updatedConfig);
      expect(
        errorRecoveryService.updateRetryConfiguration,
      ).toHaveBeenCalledWith(updates);
    });
  });

  describe('getRecoveryRecommendations', () => {
    it('should return recovery recommendations', async () => {
      const mockRecommendations = [
        'Check service connectivity',
        'Verify configuration',
      ];
      const mockHealth = { isHealthy: false, errorCount: 5 };

      errorRecoveryService.getRecoveryRecommendations.mockReturnValue(
        mockRecommendations,
      );
      errorRecoveryService.getServiceHealth.mockReturnValue(mockHealth as any);

      const result =
        await controller.getRecoveryRecommendations('test-service');

      expect(result.serviceName).toBe('test-service');
      expect(result.health).toEqual(mockHealth);
      expect(result.recommendations).toEqual(mockRecommendations);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });
});
