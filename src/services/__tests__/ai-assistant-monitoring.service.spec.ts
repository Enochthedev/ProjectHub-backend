import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AIAssistantMonitoringService,
  AlertRule,
  HealthCheckResult,
} from '../ai-assistant-monitoring.service';
import {
  AIAssistantErrorRecoveryService,
  ServiceHealthStatus,
} from '../ai-assistant-error-recovery.service';

describe('AIAssistantMonitoringService', () => {
  let service: AIAssistantMonitoringService;
  let errorRecoveryService: jest.Mocked<AIAssistantErrorRecoveryService>;
  let configService: jest.Mocked<ConfigService>;

  const mockHealthyService: ServiceHealthStatus = {
    serviceName: 'test-service',
    isHealthy: true,
    errorCount: 0,
    consecutiveFailures: 0,
    averageResponseTime: 100,
    circuitBreakerOpen: false,
  };

  const mockUnhealthyService: ServiceHealthStatus = {
    serviceName: 'unhealthy-service',
    isHealthy: false,
    errorCount: 10,
    consecutiveFailures: 5,
    averageResponseTime: 5000,
    circuitBreakerOpen: false,
    lastError: new Error('Service error'),
    lastFailureAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIAssistantMonitoringService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                'monitoring.healthCheckInterval': 60000,
                'monitoring.metricsRetentionDays': 7,
                'monitoring.alertCooldownMinutes': 15,
                'monitoring.performanceHistoryLimit': 1000,
                'monitoring.errorHistoryLimit': 500,
              };
              return config[key];
            }),
          },
        },
        {
          provide: AIAssistantErrorRecoveryService,
          useValue: {
            getServiceHealth: jest.fn(),
            getAllServiceHealth: jest.fn(),
            getRecoveryRecommendations: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AIAssistantMonitoringService>(
      AIAssistantMonitoringService,
    );
    errorRecoveryService = module.get(AIAssistantErrorRecoveryService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('performHealthCheck', () => {
    it('should perform health check for healthy service', async () => {
      errorRecoveryService.getServiceHealth.mockReturnValue(mockHealthyService);

      const result = await service.performHealthCheck('test-service');

      expect(result.serviceName).toBe('test-service');
      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.details.consecutiveFailures).toBe(0);
      expect(result.details.circuitBreakerOpen).toBe(false);
    });

    it('should perform health check for unhealthy service', async () => {
      errorRecoveryService.getServiceHealth.mockReturnValue(
        mockUnhealthyService,
      );

      const result = await service.performHealthCheck('unhealthy-service');

      expect(result.serviceName).toBe('unhealthy-service');
      expect(result.status).toBe('critical');
      expect(result.details.consecutiveFailures).toBe(5);
      expect(result.details.lastError).toBe('Service error');
    });

    it('should handle health check errors gracefully', async () => {
      errorRecoveryService.getServiceHealth.mockImplementation(() => {
        throw new Error('Health check failed');
      });

      const result = await service.performHealthCheck('error-service');

      expect(result.serviceName).toBe('error-service');
      expect(result.status).toBe('critical');
      expect(result.details.lastError).toBe('Health check failed');
    });

    it('should determine correct health status based on service state', async () => {
      // Test degraded status
      const degradedService = { ...mockHealthyService, consecutiveFailures: 1 };
      errorRecoveryService.getServiceHealth.mockReturnValue(degradedService);

      let result = await service.performHealthCheck('test-service');
      expect(result.status).toBe('degraded');

      // Test unhealthy status
      const unhealthyService = {
        ...mockHealthyService,
        consecutiveFailures: 3,
      };
      errorRecoveryService.getServiceHealth.mockReturnValue(unhealthyService);

      result = await service.performHealthCheck('test-service');
      expect(result.status).toBe('unhealthy');

      // Test critical status (circuit breaker open)
      const criticalService = {
        ...mockHealthyService,
        circuitBreakerOpen: true,
      };
      errorRecoveryService.getServiceHealth.mockReturnValue(criticalService);

      result = await service.performHealthCheck('test-service');
      expect(result.status).toBe('critical');
    });
  });

  describe('performAllHealthChecks', () => {
    it('should perform health checks for all services', async () => {
      errorRecoveryService.getAllServiceHealth.mockReturnValue([
        mockHealthyService,
        mockUnhealthyService,
      ]);

      errorRecoveryService.getServiceHealth
        .mockReturnValueOnce(mockHealthyService)
        .mockReturnValueOnce(mockUnhealthyService);

      const results = await service.performAllHealthChecks();

      expect(results).toHaveLength(2);
      expect(results[0].serviceName).toBe('test-service');
      expect(results[1].serviceName).toBe('unhealthy-service');
    });

    it('should handle individual service check failures', async () => {
      errorRecoveryService.getAllServiceHealth.mockReturnValue([
        mockHealthyService,
        { ...mockHealthyService, serviceName: 'error-service' },
      ]);

      errorRecoveryService.getServiceHealth
        .mockReturnValueOnce(mockHealthyService)
        .mockImplementationOnce(() => {
          throw new Error('Service check failed');
        });

      const results = await service.performAllHealthChecks();

      expect(results).toHaveLength(2); // Both checks return results, even if one fails
      expect(results[0].serviceName).toBe('test-service');
      expect(results[1].serviceName).toBe('error-service');
      expect(results[1].status).toBe('critical');
    });
  });

  describe('metrics management', () => {
    it('should track service metrics correctly', async () => {
      errorRecoveryService.getServiceHealth.mockReturnValue(mockHealthyService);

      // Perform multiple health checks to build metrics
      await service.performHealthCheck('test-service');
      await service.performHealthCheck('test-service');

      const metrics = service.getServiceMetrics('test-service');

      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.uptime).toBe(100);
    });

    it('should calculate error rate correctly', async () => {
      // First successful check
      errorRecoveryService.getServiceHealth.mockReturnValueOnce(
        mockHealthyService,
      );
      await service.performHealthCheck('test-service');

      // Then failed check
      errorRecoveryService.getServiceHealth.mockImplementationOnce(() => {
        throw new Error('Service failed');
      });
      await service.performHealthCheck('test-service');

      const metrics = service.getServiceMetrics('test-service');

      expect(metrics.totalRequests).toBe(2);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.errorRate).toBe(0.5);
      expect(metrics.uptime).toBe(50);
    });
  });

  describe('diagnostic information', () => {
    it('should provide comprehensive diagnostic info', async () => {
      errorRecoveryService.getServiceHealth.mockReturnValue(mockHealthyService);
      errorRecoveryService.getRecoveryRecommendations.mockReturnValue([
        'Service appears healthy',
      ]);

      const diagnostics = await service.getDiagnosticInfo('test-service');

      expect(diagnostics.serviceName).toBe('test-service');
      expect(diagnostics.status).toBe('healthy');
      expect(diagnostics.metrics).toBeDefined();
      expect(diagnostics.recentErrors).toBeDefined();
      expect(diagnostics.performanceHistory).toBeDefined();
      expect(diagnostics.recommendations).toContain('Service appears healthy');
    });
  });

  describe('alert rule management', () => {
    it('should create alert rule', () => {
      const ruleData = {
        name: 'Test Alert',
        condition: {
          type: 'error_rate' as const,
          threshold: 0.1,
          comparison: 'greater_than' as const,
        },
        severity: 'high' as const,
        enabled: true,
        cooldownMinutes: 15,
      };

      const rule = service.createAlertRule(ruleData);

      expect(rule.id).toBeDefined();
      expect(rule.name).toBe('Test Alert');
      expect(rule.condition.type).toBe('error_rate');
      expect(rule.severity).toBe('high');
    });

    it('should update alert rule', () => {
      const rule = service.createAlertRule({
        name: 'Test Alert',
        condition: {
          type: 'error_rate',
          threshold: 0.1,
          comparison: 'greater_than',
        },
        severity: 'high',
        enabled: true,
        cooldownMinutes: 15,
      });

      const updatedRule = service.updateAlertRule(rule.id, {
        severity: 'critical',
        cooldownMinutes: 30,
      });

      expect(updatedRule).toBeDefined();
      expect(updatedRule!.severity).toBe('critical');
      expect(updatedRule!.cooldownMinutes).toBe(30);
      expect(updatedRule!.name).toBe('Test Alert'); // Unchanged
    });

    it('should delete alert rule', () => {
      const rule = service.createAlertRule({
        name: 'Test Alert',
        condition: {
          type: 'error_rate',
          threshold: 0.1,
          comparison: 'greater_than',
        },
        severity: 'high',
        enabled: true,
        cooldownMinutes: 15,
      });

      const deleted = service.deleteAlertRule(rule.id);
      expect(deleted).toBe(true);

      const rules = service.getAlertRules();
      expect(rules.find((r) => r.id === rule.id)).toBeUndefined();
    });

    it('should get all alert rules including defaults', () => {
      const rules = service.getAlertRules();

      // Should have default rules
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some((r) => r.name === 'High Error Rate')).toBe(true);
      expect(rules.some((r) => r.name === 'Circuit Breaker Open')).toBe(true);
    });
  });

  describe('alert management', () => {
    it('should get active and all alerts', () => {
      const activeAlerts = service.getActiveAlerts();
      const allAlerts = service.getAllAlerts();

      expect(Array.isArray(activeAlerts)).toBe(true);
      expect(Array.isArray(allAlerts)).toBe(true);
    });

    it('should resolve alert', async () => {
      // Create a condition that will trigger an alert
      const rule = service.createAlertRule({
        name: 'Test Alert',
        condition: {
          type: 'consecutive_failures',
          threshold: 1,
          comparison: 'greater_than',
        },
        severity: 'high',
        enabled: true,
        cooldownMinutes: 0, // No cooldown for test
      });

      // Trigger the alert
      const unhealthyService = {
        ...mockHealthyService,
        consecutiveFailures: 2,
      };
      errorRecoveryService.getServiceHealth.mockReturnValue(unhealthyService);

      await service.performHealthCheck('test-service');

      const activeAlerts = service.getActiveAlerts();
      expect(activeAlerts.length).toBeGreaterThan(0);

      const alertId = activeAlerts[0].id;
      const resolved = service.resolveAlert(alertId);

      expect(resolved).toBe(true);

      const updatedActiveAlerts = service.getActiveAlerts();
      expect(updatedActiveAlerts.find((a) => a.id === alertId)).toBeUndefined();
    });
  });

  describe('alert condition evaluation', () => {
    beforeEach(() => {
      // Clear default rules to avoid interference
      const rules = service.getAlertRules();
      rules.forEach((rule) => service.deleteAlertRule(rule.id));
    });

    it('should trigger alert for high error rate', async () => {
      const rule = service.createAlertRule({
        name: 'High Error Rate Test',
        condition: {
          type: 'error_rate',
          threshold: 0.5,
          comparison: 'greater_than',
        },
        severity: 'high',
        enabled: true,
        cooldownMinutes: 0,
      });

      // Generate some failures to increase error rate
      errorRecoveryService.getServiceHealth.mockImplementation(() => {
        throw new Error('Service failed');
      });

      await service.performHealthCheck('test-service');
      await service.performHealthCheck('test-service');

      const activeAlerts = service.getActiveAlerts();
      expect(activeAlerts.some((a) => a.ruleId === rule.id)).toBe(true);
    });

    it('should trigger alert for circuit breaker open', async () => {
      const rule = service.createAlertRule({
        name: 'Circuit Breaker Test',
        condition: {
          type: 'circuit_breaker',
          threshold: 1,
          comparison: 'equals',
        },
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 0,
      });

      const serviceWithOpenCircuit = {
        ...mockHealthyService,
        circuitBreakerOpen: true,
      };
      errorRecoveryService.getServiceHealth.mockReturnValue(
        serviceWithOpenCircuit,
      );

      await service.performHealthCheck('test-service');

      const activeAlerts = service.getActiveAlerts();
      expect(activeAlerts.some((a) => a.ruleId === rule.id)).toBe(true);
    });

    it('should respect alert cooldown period', async () => {
      const rule = service.createAlertRule({
        name: 'Cooldown Test',
        condition: {
          type: 'consecutive_failures',
          threshold: 1,
          comparison: 'greater_than',
        },
        severity: 'high',
        enabled: true,
        cooldownMinutes: 60, // 1 hour cooldown
      });

      const unhealthyService = {
        ...mockHealthyService,
        consecutiveFailures: 2,
      };
      errorRecoveryService.getServiceHealth.mockReturnValue(unhealthyService);

      // First trigger
      await service.performHealthCheck('test-service');
      const firstAlerts = service.getActiveAlerts();
      const initialCount = firstAlerts.length;

      // Second trigger (should be blocked by cooldown)
      await service.performHealthCheck('test-service');
      const secondAlerts = service.getActiveAlerts();

      expect(secondAlerts.length).toBe(initialCount); // No new alerts
    });

    it('should not trigger disabled alert rules', async () => {
      const rule = service.createAlertRule({
        name: 'Disabled Rule Test',
        condition: {
          type: 'consecutive_failures',
          threshold: 1,
          comparison: 'greater_than',
        },
        severity: 'high',
        enabled: false, // Disabled
        cooldownMinutes: 0,
      });

      const unhealthyService = {
        ...mockHealthyService,
        consecutiveFailures: 2,
      };
      errorRecoveryService.getServiceHealth.mockReturnValue(unhealthyService);

      await service.performHealthCheck('test-service');

      const activeAlerts = service.getActiveAlerts();
      expect(activeAlerts.some((a) => a.ruleId === rule.id)).toBe(false);
    });
  });

  describe('configuration management', () => {
    it('should get configuration', () => {
      const config = service.getConfiguration();

      expect(config.healthCheckInterval).toBe(60000);
      expect(config.metricsRetentionDays).toBe(7);
      expect(config.alertCooldownMinutes).toBe(15);
    });

    it('should update configuration', () => {
      const updates = {
        healthCheckInterval: 30000,
        metricsRetentionDays: 14,
      };

      service.updateConfiguration(updates);
      const config = service.getConfiguration();

      expect(config.healthCheckInterval).toBe(30000);
      expect(config.metricsRetentionDays).toBe(14);
      expect(config.alertCooldownMinutes).toBe(15); // Unchanged
    });
  });
});
