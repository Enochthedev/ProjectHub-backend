import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AdminAIConfigService } from '../admin-ai-config.service';
import {
  AIServiceConfig,
  AIServiceType,
  AIModelType,
} from '../../entities/ai-service-config.entity';
import { AIApiUsage } from '../../entities/ai-api-usage.entity';
import { AdminAuditService } from '../admin-audit.service';
import { HuggingFaceService } from '../hugging-face.service';
import { CircuitBreakerService } from '../circuit-breaker.service';
import { AIRateLimiterService } from '../ai-rate-limiter.service';
import {
  CreateAIServiceConfigDto,
  UpdateAIServiceConfigDto,
  BulkAIConfigOperationDto,
  AIConfigFiltersDto,
} from '../../dto/admin/ai-config.dto';

describe('AdminAIConfigService', () => {
  let service: AdminAIConfigService;
  let configRepository: jest.Mocked<Repository<AIServiceConfig>>;
  let usageRepository: jest.Mocked<Repository<AIApiUsage>>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;
  let auditService: jest.Mocked<AdminAuditService>;
  let huggingFaceService: jest.Mocked<HuggingFaceService>;
  let circuitBreakerService: jest.Mocked<CircuitBreakerService>;
  let rateLimiterService: jest.Mocked<AIRateLimiterService>;

  const mockConfig: AIServiceConfig = {
    id: 'config-1',
    name: 'Test HuggingFace Config',
    serviceType: AIServiceType.HUGGING_FACE,
    modelType: AIModelType.EMBEDDING,
    model: 'sentence-transformers/all-MiniLM-L6-v2',
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
    modelParameters: {
      temperature: 0.7,
      maxTokens: 512,
      confidenceThreshold: 0.3,
    },
    fallbackBehavior: {
      enabled: true,
      maxRetries: 3,
      retryDelayMs: 1000,
      fallbackMessage: 'AI service temporarily unavailable',
    },
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTimeout: 30000,
      halfOpenMaxCalls: 2,
      monitoringPeriod: 60000,
    },
    description: 'Test configuration',
    isActive: true,
    tags: ['test', 'embedding'],
    version: 1,
    createdBy: null,
    createdById: 'admin-1',
    updatedBy: null,
    updatedById: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    isEnabled: jest.fn().mockReturnValue(true),
    isDisabled: jest.fn().mockReturnValue(false),
    hasTag: jest.fn(),
    addTag: jest.fn(),
    removeTag: jest.fn(),
    getRateLimitForPeriod: jest.fn(),
    isFallbackEnabled: jest.fn().mockReturnValue(true),
    getModelParameter: jest.fn(),
    setModelParameter: jest.fn(),
    getCircuitBreakerThreshold: jest.fn().mockReturnValue(5),
    getRecoveryTimeout: jest.fn().mockReturnValue(30000),
    incrementVersion: jest.fn(),
    toConfigObject: jest.fn(),
  } as any;

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockConfig], 1]),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
      },
    } as any;

    // Mock the manager methods
    (queryRunner.manager.findOne as jest.Mock) = jest.fn();
    (queryRunner.manager.save as jest.Mock) = jest.fn();
    (queryRunner.manager.remove as jest.Mock) = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAIConfigService,
        {
          provide: getRepositoryToken(AIServiceConfig),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AIApiUsage),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(queryRunner),
          },
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
            generateEmbeddings: jest.fn(),
            questionAnswering: jest.fn(),
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

    service = module.get<AdminAIConfigService>(AdminAIConfigService);
    configRepository = module.get(getRepositoryToken(AIServiceConfig));
    usageRepository = module.get(getRepositoryToken(AIApiUsage));
    dataSource = module.get(DataSource);
    auditService = module.get(AdminAuditService);
    huggingFaceService = module.get(HuggingFaceService);
    circuitBreakerService = module.get(CircuitBreakerService);
    rateLimiterService = module.get(AIRateLimiterService);
  });

  describe('getConfigurations', () => {
    it('should return paginated configurations with filters', async () => {
      const filters: AIConfigFiltersDto = {
        serviceType: AIServiceType.HUGGING_FACE,
        page: 1,
        limit: 20,
      };

      const result = await service.getConfigurations(filters);

      expect(result).toEqual({
        configs: expect.any(Array),
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(configRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should apply search filter', async () => {
      const filters: AIConfigFiltersDto = {
        search: 'test',
      };

      await service.getConfigurations(filters);

      const queryBuilder = configRepository.createQueryBuilder();
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%test%' },
      );
    });

    it('should apply tags filter', async () => {
      const filters: AIConfigFiltersDto = {
        tags: ['embedding', 'test'],
      };

      await service.getConfigurations(filters);

      const queryBuilder = configRepository.createQueryBuilder();
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'config.tags && :tags',
        { tags: ['embedding', 'test'] },
      );
    });
  });

  describe('getConfigurationById', () => {
    it('should return configuration by ID', async () => {
      configRepository.findOne.mockResolvedValue(mockConfig);

      const result = await service.getConfigurationById('config-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('config-1');
      expect(configRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'config-1' },
        relations: ['createdBy', 'updatedBy'],
      });
    });

    it('should throw NotFoundException when configuration not found', async () => {
      configRepository.findOne.mockResolvedValue(null);

      await expect(service.getConfigurationById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createConfiguration', () => {
    const createDto: CreateAIServiceConfigDto = {
      name: 'New Config',
      serviceType: AIServiceType.HUGGING_FACE,
      modelType: AIModelType.EMBEDDING,
      model: 'test-model',
      rateLimits: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        monthlyLimit: 100000,
        burstLimit: 10,
      },
      modelParameters: {
        temperature: 0.7,
        maxTokens: 512,
      },
      fallbackBehavior: {
        enabled: true,
        maxRetries: 3,
        retryDelayMs: 1000,
      },
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 30000,
        halfOpenMaxCalls: 2,
        monitoringPeriod: 60000,
      },
    };

    it('should create new configuration successfully', async () => {
      configRepository.findOne.mockResolvedValue(null); // No existing config
      configRepository.create.mockReturnValue(mockConfig);
      configRepository.save.mockResolvedValue(mockConfig);

      const result = await service.createConfiguration(createDto, 'admin-1');

      expect(configRepository.create).toHaveBeenCalledWith({
        ...createDto,
        createdById: 'admin-1',
        updatedById: 'admin-1',
        version: 1,
      });
      expect(configRepository.save).toHaveBeenCalled();
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'create',
        'ai_service_config',
        mockConfig.id,
        null,
        mockConfig,
      );
    });

    it('should throw ConflictException when name already exists', async () => {
      configRepository.findOne.mockResolvedValue(mockConfig);

      await expect(
        service.createConfiguration(createDto, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should validate rate limits', async () => {
      const invalidDto = {
        ...createDto,
        rateLimits: {
          ...createDto.rateLimits,
          requestsPerMinute: 2000, // Higher than hourly limit
        },
      };

      configRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createConfiguration(invalidDto, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate model parameters', async () => {
      const invalidDto = {
        ...createDto,
        modelParameters: {
          temperature: 3, // Invalid temperature
        },
      };

      configRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createConfiguration(invalidDto, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateConfiguration', () => {
    const updateDto: UpdateAIServiceConfigDto = {
      name: 'Updated Config',
      timeout: 20000,
    };

    it('should update configuration successfully', async () => {
      configRepository.findOne.mockResolvedValue(mockConfig);
      configRepository.save.mockResolvedValue(mockConfig);

      const result = await service.updateConfiguration(
        'config-1',
        updateDto,
        'admin-1',
      );

      expect(configRepository.save).toHaveBeenCalled();
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'update',
        'ai_service_config',
        'config-1',
        mockConfig,
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when configuration not found', async () => {
      configRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateConfiguration('nonexistent', updateDto, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check for name conflicts', async () => {
      const existingConfig = { ...mockConfig, id: 'other-config' };
      configRepository.findOne
        .mockResolvedValueOnce(mockConfig) // First call for the config being updated
        .mockResolvedValueOnce(existingConfig); // Second call for name conflict check

      await expect(
        service.updateConfiguration(
          'config-1',
          { name: 'Existing Name' },
          'admin-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteConfiguration', () => {
    it('should delete configuration successfully', async () => {
      configRepository.findOne.mockResolvedValue(mockConfig);
      usageRepository.count.mockResolvedValue(0); // No usage history

      await service.deleteConfiguration('config-1', 'admin-1');

      expect(configRepository.remove).toHaveBeenCalledWith(mockConfig);
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'delete',
        'ai_service_config',
        'config-1',
        mockConfig,
        null,
      );
    });

    it('should throw NotFoundException when configuration not found', async () => {
      configRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteConfiguration('nonexistent', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when configuration has usage history', async () => {
      configRepository.findOne.mockResolvedValue(mockConfig);
      usageRepository.count.mockResolvedValue(10); // Has usage history

      await expect(
        service.deleteConfiguration('config-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('bulkOperation', () => {
    const bulkDto: BulkAIConfigOperationDto = {
      configIds: ['config-1', 'config-2'],
      operation: 'activate',
    };

    it('should perform bulk activation successfully', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(mockConfig);
      (queryRunner.manager.save as jest.Mock).mockResolvedValue(mockConfig);

      const result = await service.bulkOperation(bulkDto, 'admin-1');

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should handle partial failures in bulk operations', async () => {
      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(mockConfig) // First config found
        .mockResolvedValueOnce(null); // Second config not found

      const result = await service.bulkOperation(bulkDto, 'admin-1');

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should rollback transaction on error', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.bulkOperation(bulkDto, 'admin-1')).rejects.toThrow();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('getServiceStatus', () => {
    it('should return service status with health check', async () => {
      configRepository.findOne.mockResolvedValue(mockConfig);
      huggingFaceService.healthCheck.mockResolvedValue(true);
      circuitBreakerService.getStatus.mockReturnValue({
        state: 'CLOSED',
      } as any);
      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remainingRequests: 100,
        resetTime: new Date(),
        monthlyUsage: 1000,
        monthlyLimit: 10000,
      });

      const result = await service.getServiceStatus('config-1');

      expect(result.isHealthy).toBe(true);
      expect(result.circuitBreakerState).toBe('closed');
      expect(result.rateLimitStatus.remaining).toBe(100);
      expect(huggingFaceService.healthCheck).toHaveBeenCalled();
    });

    it('should handle health check failures gracefully', async () => {
      configRepository.findOne.mockResolvedValue(mockConfig);
      huggingFaceService.healthCheck.mockRejectedValue(
        new Error('Health check failed'),
      );
      circuitBreakerService.getStatus.mockReturnValue(undefined as any);
      rateLimiterService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remainingRequests: 100,
        resetTime: new Date(),
        monthlyUsage: 1000,
        monthlyLimit: 10000,
      });

      const result = await service.getServiceStatus('config-1');

      expect(result.isHealthy).toBe(false);
      expect(result.circuitBreakerState).toBe('unknown');
    });
  });

  describe('testConfiguration', () => {
    it('should test embedding configuration successfully', async () => {
      configRepository.findOne.mockResolvedValue(mockConfig);
      huggingFaceService.generateEmbeddings.mockResolvedValue([
        [0.1, 0.2, 0.3],
      ]);

      const result = await service.testConfiguration('config-1', 'admin-1');

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.details.embeddingLength).toBe(3);
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'test',
        'ai_service_config',
        'config-1',
        null,
        expect.objectContaining({ success: true }),
      );
    });

    it('should test QA configuration successfully', async () => {
      const qaConfig = { ...mockConfig, modelType: AIModelType.QA };
      configRepository.findOne.mockResolvedValue(qaConfig);
      huggingFaceService.questionAnswering.mockResolvedValue({
        answer: 'This is a test',
        score: 0.95,
      });

      const result = await service.testConfiguration('config-1', 'admin-1');

      expect(result.success).toBe(true);
      expect(result.details.answer).toBe('This is a test');
      expect(result.details.score).toBe(0.95);
    });

    it('should handle test failures', async () => {
      configRepository.findOne.mockResolvedValue(mockConfig);
      huggingFaceService.generateEmbeddings.mockRejectedValue(
        new Error('API Error'),
      );

      const result = await service.testConfiguration('config-1', 'admin-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });

  describe('getServicePerformance', () => {
    it('should calculate performance metrics correctly', async () => {
      configRepository.findOne.mockResolvedValue(mockConfig);

      const mockUsageData = [
        {
          success: true,
          responseTimeMs: 1000,
          tokensUsed: 100,
          createdAt: new Date(),
          errorMessage: null,
        },
        {
          success: false,
          responseTimeMs: 2000,
          tokensUsed: 0,
          createdAt: new Date(),
          errorMessage: 'Timeout error',
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockUsageData),
      };

      usageRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getServicePerformance('config-1', 24);

      expect(result.metrics.totalRequests).toBe(2);
      expect(result.metrics.successfulRequests).toBe(1);
      expect(result.metrics.failedRequests).toBe(1);
      expect(result.metrics.successRate).toBe(50);
      expect(result.metrics.errorRate).toBe(50);
      expect(result.metrics.averageResponseTime).toBe(1500);
      expect(result.errorBreakdown).toHaveLength(1);
      expect(result.errorBreakdown[0].errorType).toBe('Timeout error');
    });
  });
});
