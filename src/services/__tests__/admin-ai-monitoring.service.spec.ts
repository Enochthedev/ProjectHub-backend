import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AdminAIMonitoringService } from '../admin-ai-monitoring.service';
import {
  AIServiceConfig,
  AIServiceType,
  AIModelType,
} from '../../entities/ai-service-config.entity';
import { AIApiUsage } from '../../entities/ai-api-usage.entity';
import {
  AIAlertRule,
  MetricType,
  AlertSeverity,
  AlertCondition,
} from '../../entities/ai-alert-rule.entity';
import { AIAlert, AlertStatus } from '../../entities/ai-alert.entity';
import { AdminAuditService } from '../admin-audit.service';
import { HuggingFaceService } from '../hugging-face.service';
import { CircuitBreakerService } from '../circuit-breaker.service';
import { AIRateLimiterService } from '../ai-rate-limiter.service';
import {
  CreateAIAlertRuleDto,
  UpdateAIAlertRuleDto,
  AIMonitoringFiltersDto,
  HealthStatus,
} from '../../dto/admin/ai-monitoring.dto';

describe('AdminAIMonitoringService', () => {
  let service: AdminAIMonitoringService;
  let serviceConfigRepository: jest.Mocked<Repository<AIServiceConfig>>;
  let usageRepository: jest.Mocked<Repository<AIApiUsage>>;
  let alertRuleRepository: jest.Mocked<Repository<AIAlertRule>>;
  let alertRepository: jest.Mocked<Repository<AIAlert>>;
  let auditService: jest.Mocked<AdminAuditService>;
  let huggingFaceService: jest.Mocked<HuggingFaceService>;
  let circuitBreakerService: jest.Mocked<CircuitBreakerService>;
  let rateLimiterService: jest.Mocked<AIRateLimiterService>;

  const mockServiceConfig: AIServiceConfig = {
    id: 'service-1',
    name: 'Test AI Service',
    serviceType: AIServiceType.HUGGING_FACE,
    modelType: AIModelType.EMBEDDING,
    model: 'test-model',
    apiEndpoint: null,
    apiKey: null,
    timeout: 15000,
    rateLimits: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      monthlyLimit: 100000,
      burstLimit: 10,
    },
    modelParameters: {},
    fallbackBehavior: { enabled: false },
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTimeout: 30000,
      halfOpenMaxCalls: 2,
      monitoringPeriod: 60000,
    },
    description: 'Test service',
    isActive: true,
    tags: [],
    version: 1,
    createdBy: null,
    createdById: 'admin-1',
    updatedBy: null,
    updatedById: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockUsage: AIApiUsage = {
    id: 'usage-1',
    endpoint: '/embeddings',
    model: 'test-model',
    tokensUsed: 100,
    responseTimeMs: 1000,
    success: true,
    errorMessage: null,
    user: null,
    userId: 'user-1',
    createdAt: new Date(),
  } as any;

  const mockAlertRule: AIAlertRule = {
    id: 'rule-1',
    name: 'High Response Time',
    service: mockServiceConfig,
    serviceId: 'service-1',
    metricType: MetricType.RESPONSE_TIME,
    condition: AlertCondition.GREATER_THAN,
    threshold: 5000,
    severity: AlertSeverity.HIGH,
    description: 'Alert when response time exceeds 5 seconds',
    evaluationWindow: 5,
    cooldownPeriod: 15,
    isEnabled: true,
    notificationChannels: ['email'],
    lastTriggered: null,
    triggerCount: 0,
    metadata: null,
    createdBy: null,
    createdById: 'admin-1',
    updatedBy: null,
    updatedById: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockAlert: AIAlert = {
    id: 'alert-1',
    rule: mockAlertRule,
    ruleId: 'rule-1',
    service: mockServiceConfig,
    serviceId: 'service-1',
    alertType: 'response_time',
    severity: AlertSeverity.HIGH,
    status: AlertStatus.ACTIVE,
    title: 'High Response Time - Test AI Service',
    description: 'Response time exceeded threshold',
    threshold: 5000,
    currentValue: 6000,
    metadata: null,
    triggeredAt: new Date(),
    resolvedAt: null,
    acknowledgedAt: null,
    acknowledgedBy: null,
    acknowledgedById: null,
    resolutionNotes: null,
    occurrenceCount: 1,
    lastOccurrence: new Date(),
    notificationsSent: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockAlert]),
      getManyAndCount: jest.fn().mockResolvedValue([[mockAlert], 1]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAIMonitoringService,
        {
          provide: getRepositoryToken(AIServiceConfig),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AIApiUsage),
          useValue: {
            find: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AIAlertRule),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AIAlert),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: DataSource,
          useValue: {},
        },
        {
          provide: AdminAuditService,
          useValue: {
            logAdminAction: jest.fn(),
          },
        },
        {
          provide: HuggingFaceService,
          useValue: {
            healthCheck: jest.fn(),
          },
        },
        {
          provide: CircuitBreakerService,
          useValue: {
            getStatus: jest.fn(),
          },
        },
        {
          provide: AIRateLimiterService,
          useValue: {
            checkRateLimit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminAIMonitoringService>(AdminAIMonitoringService);
    serviceConfigRepository = module.get(getRepositoryToken(AIServiceConfig));
    usageRepository = module.get(getRepositoryToken(AIApiUsage));
    alertRuleRepository = module.get(getRepositoryToken(AIAlertRule));
    alertRepository = module.get(getRepositoryToken(AIAlert));
    auditService = module.get(AdminAuditService);
    huggingFaceService = module.get(HuggingFaceService);
    circuitBreakerService = module.get(CircuitBreakerService);
    rateLimiterService = module.get(AIRateLimiterService);
  });

  describe('getServicesHealth', () => {
    it('should return health status for all active services', async () => {
      serviceConfigRepository.find.mockResolvedValue([mockServiceConfig]);
      huggingFaceService.healthCheck.mockResolvedValue(true);
      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remainingRequests: 100,
        resetTime: new Date(),
        monthlyUsage: 1000,
        monthlyLimit: 10000,
      });
      circuitBreakerService.getStatus.mockReturnValue({
        state: 'CLOSED',
      } as any);
      usageRepository.find.mockResolvedValue([mockUsage]);

      const result = await service.getServicesHealth();

      expect(result).toHaveLength(1);
      expect(result[0].serviceId).toBe('service-1');
      expect(result[0].status).toBe(HealthStatus.HEALTHY);
      expect(serviceConfigRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('should handle service health check failures', async () => {
      serviceConfigRepository.find.mockResolvedValue([mockServiceConfig]);
      huggingFaceService.healthCheck.mockRejectedValue(
        new Error('Service unavailable'),
      );
      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remainingRequests: 100,
        resetTime: new Date(),
        monthlyUsage: 1000,
        monthlyLimit: 10000,
      });
      circuitBreakerService.getStatus.mockReturnValue({
        state: 'CLOSED',
      } as any);
      usageRepository.find.mockResolvedValue([]);

      const result = await service.getServicesHealth();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(HealthStatus.UNHEALTHY);
      expect(
        result[0].checks.find((c) => c.name === 'Connectivity')?.status,
      ).toBe(HealthStatus.UNHEALTHY);
    });
  });

  describe('getServiceHealth', () => {
    it('should return detailed health check for a service', async () => {
      serviceConfigRepository.findOne.mockResolvedValue(mockServiceConfig);
      huggingFaceService.healthCheck.mockResolvedValue(true);
      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remainingRequests: 100,
        resetTime: new Date(),
        monthlyUsage: 1000,
        monthlyLimit: 10000,
      });
      circuitBreakerService.getStatus.mockReturnValue({
        state: 'CLOSED',
      } as any);
      usageRepository.find.mockResolvedValue([mockUsage]);

      const result = await service.getServiceHealth('service-1');

      expect(result.serviceId).toBe('service-1');
      expect(result.serviceName).toBe('Test AI Service');
      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.checks).toHaveLength(4); // Connectivity, Rate Limits, Circuit Breaker, Performance
    });

    it('should throw NotFoundException for non-existent service', async () => {
      serviceConfigRepository.findOne.mockResolvedValue(null);

      await expect(service.getServiceHealth('nonexistent')).rejects.toThrow(
        'AI service with ID nonexistent not found',
      );
    });

    it('should detect degraded performance', async () => {
      const slowUsage = { ...mockUsage, responseTimeMs: 8000, success: true };
      serviceConfigRepository.findOne.mockResolvedValue(mockServiceConfig);
      huggingFaceService.healthCheck.mockResolvedValue(true);
      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remainingRequests: 5, // Low remaining requests
        resetTime: new Date(),
        monthlyUsage: 1000,
        monthlyLimit: 10000,
      });
      circuitBreakerService.getStatus.mockReturnValue({
        state: 'HALF_OPEN',
      } as any);
      usageRepository.find.mockResolvedValue([slowUsage]);

      const result = await service.getServiceHealth('service-1');

      expect(result.status).toBe(HealthStatus.DEGRADED);
    });
  });

  describe('getServicePerformanceMetrics', () => {
    it('should return performance metrics for a service', async () => {
      serviceConfigRepository.findOne.mockResolvedValue(mockServiceConfig);
      usageRepository.find
        .mockResolvedValueOnce([mockUsage]) // Current period
        .mockResolvedValueOnce([mockUsage]); // Previous period

      const result = await service.getServicePerformanceMetrics(
        'service-1',
        24,
      );

      expect(result.serviceId).toBe('service-1');
      expect(result.serviceName).toBe('Test AI Service');
      expect(result.metrics.totalRequests).toBe(1);
      expect(result.metrics.successRate).toBe(100);
      expect(result.breakdown.byEndpoint).toBeDefined();
      expect(result.breakdown.byModel).toBeDefined();
      expect(result.breakdown.byHour).toBeDefined();
      expect(result.breakdown.byUser).toBeDefined();
    });

    it('should calculate trends correctly', async () => {
      const currentUsage = [mockUsage];
      const previousUsage = [{ ...mockUsage, responseTimeMs: 500 }]; // Faster previous response

      serviceConfigRepository.findOne.mockResolvedValue(mockServiceConfig);
      usageRepository.find
        .mockResolvedValueOnce(currentUsage)
        .mockResolvedValueOnce(previousUsage);

      const result = await service.getServicePerformanceMetrics(
        'service-1',
        24,
      );

      expect(result.trends.responseTimeTrend).toBe(100); // 100% increase (500ms to 1000ms)
    });
  });

  describe('createAlertRule', () => {
    const createDto: CreateAIAlertRuleDto = {
      name: 'Test Alert Rule',
      serviceId: 'service-1',
      metricType: MetricType.RESPONSE_TIME,
      condition: 'greater_than',
      threshold: 5000,
      severity: AlertSeverity.HIGH,
      description: 'Test alert rule',
    };

    it('should create alert rule successfully', async () => {
      serviceConfigRepository.findOne.mockResolvedValue(mockServiceConfig);
      alertRuleRepository.create.mockReturnValue(mockAlertRule);
      alertRuleRepository.save.mockResolvedValue(mockAlertRule);

      const result = await service.createAlertRule(createDto, 'admin-1');

      expect(result.name).toBe('High Response Time');
      expect(result.serviceId).toBe('service-1');
      expect(alertRuleRepository.create).toHaveBeenCalledWith({
        ...createDto,
        condition: 'greater_than',
        createdById: 'admin-1',
        updatedById: 'admin-1',
      });
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'create',
        'ai_alert_rule',
        mockAlertRule.id,
        null,
        mockAlertRule,
      );
    });

    it('should throw NotFoundException for non-existent service', async () => {
      serviceConfigRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createAlertRule(createDto, 'admin-1'),
      ).rejects.toThrow('AI service with ID service-1 not found');
    });
  });

  describe('updateAlertRule', () => {
    const updateDto: UpdateAIAlertRuleDto = {
      name: 'Updated Alert Rule',
      threshold: 6000,
    };

    it('should update alert rule successfully', async () => {
      alertRuleRepository.findOne.mockResolvedValue(mockAlertRule);
      alertRuleRepository.save.mockResolvedValue({
        ...mockAlertRule,
        ...updateDto,
      });

      const result = await service.updateAlertRule(
        'rule-1',
        updateDto,
        'admin-1',
      );

      expect(alertRuleRepository.save).toHaveBeenCalled();
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'update',
        'ai_alert_rule',
        'rule-1',
        mockAlertRule,
        expect.any(Object),
      );
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      alertRuleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateAlertRule('nonexistent', updateDto, 'admin-1'),
      ).rejects.toThrow('AI alert rule with ID nonexistent not found');
    });
  });

  describe('deleteAlertRule', () => {
    it('should delete alert rule successfully', async () => {
      alertRuleRepository.findOne.mockResolvedValue(mockAlertRule);

      await service.deleteAlertRule('rule-1', 'admin-1');

      expect(alertRuleRepository.remove).toHaveBeenCalledWith(mockAlertRule);
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'delete',
        'ai_alert_rule',
        'rule-1',
        mockAlertRule,
        null,
      );
    });

    it('should throw NotFoundException for non-existent rule', async () => {
      alertRuleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteAlertRule('nonexistent', 'admin-1'),
      ).rejects.toThrow('AI alert rule with ID nonexistent not found');
    });
  });

  describe('getActiveAlerts', () => {
    it('should return active alerts with filters', async () => {
      const filters: AIMonitoringFiltersDto = {
        serviceId: 'service-1',
        alertSeverity: AlertSeverity.HIGH,
        limit: 10,
      };

      const result = await service.getActiveAlerts(filters);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('alert-1');
      expect(result[0].isActive).toBe(true);
    });

    it('should return all active alerts when no filters provided', async () => {
      const result = await service.getActiveAlerts();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(AlertSeverity.HIGH);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge alert successfully', async () => {
      const alertWithMethods = {
        ...mockAlert,
        acknowledge: jest.fn(),
      };
      alertRepository.findOne.mockResolvedValue(alertWithMethods);
      alertRepository.save.mockResolvedValue(alertWithMethods);

      const result = await service.acknowledgeAlert(
        'alert-1',
        'admin-1',
        'Investigating issue',
      );

      expect(alertWithMethods.acknowledge).toHaveBeenCalledWith(
        'admin-1',
        'Investigating issue',
      );
      expect(alertRepository.save).toHaveBeenCalledWith(alertWithMethods);
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'acknowledge',
        'ai_alert',
        'alert-1',
        null,
        { acknowledgedBy: 'admin-1', notes: 'Investigating issue' },
      );
    });

    it('should throw NotFoundException for non-existent alert', async () => {
      alertRepository.findOne.mockResolvedValue(null);

      await expect(
        service.acknowledgeAlert('nonexistent', 'admin-1'),
      ).rejects.toThrow('AI alert with ID nonexistent not found');
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert successfully', async () => {
      const alertWithMethods = {
        ...mockAlert,
        resolve: jest.fn(),
      };
      alertRepository.findOne.mockResolvedValue(alertWithMethods);
      alertRepository.save.mockResolvedValue(alertWithMethods);

      const result = await service.resolveAlert(
        'alert-1',
        'admin-1',
        'Issue resolved',
      );

      expect(alertWithMethods.resolve).toHaveBeenCalledWith('Issue resolved');
      expect(alertRepository.save).toHaveBeenCalledWith(alertWithMethods);
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'resolve',
        'ai_alert',
        'alert-1',
        null,
        { resolvedBy: 'admin-1', notes: 'Issue resolved' },
      );
    });
  });

  describe('getMonitoringDashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      serviceConfigRepository.find.mockResolvedValue([mockServiceConfig]);
      huggingFaceService.healthCheck.mockResolvedValue(true);
      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remainingRequests: 100,
        resetTime: new Date(),
        monthlyUsage: 1000,
        monthlyLimit: 10000,
      });
      circuitBreakerService.getStatus.mockReturnValue({
        state: 'CLOSED',
      } as any);
      usageRepository.find.mockResolvedValue([mockUsage]);
      usageRepository.count.mockResolvedValue(100);

      const result = await service.getMonitoringDashboard();

      expect(result.overview.totalServices).toBe(1);
      expect(result.overview.healthyServices).toBe(1);
      expect(result.overview.totalRequests24h).toBe(100);
      expect(result.serviceHealth).toHaveLength(1);
      expect(result.recentAlerts).toHaveLength(1);
    });
  });
});
