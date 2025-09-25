import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource } from 'typeorm';
import {
  AIServiceConfig,
  AIServiceType,
  AIModelType,
} from '../entities/ai-service-config.entity';
import { AIApiUsage } from '../entities/ai-api-usage.entity';
import { AdminAuditService } from './admin-audit.service';
import { HuggingFaceService } from './hugging-face.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { AIRateLimiterService } from './ai-rate-limiter.service';
import {
  CreateAIServiceConfigDto,
  UpdateAIServiceConfigDto,
  AIServiceConfigResponseDto,
  AIServiceStatusDto,
  AIServicePerformanceDto,
  BulkAIConfigOperationDto,
  AIConfigFiltersDto,
} from '../dto/admin/ai-config.dto';

export interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  errors: string[];
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
  }>;
}

export interface PaginatedAIConfigsDto {
  configs: AIServiceConfigResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AdminAIConfigService {
  private readonly logger = new Logger(AdminAIConfigService.name);

  constructor(
    @InjectRepository(AIServiceConfig)
    private readonly configRepository: Repository<AIServiceConfig>,
    @InjectRepository(AIApiUsage)
    private readonly usageRepository: Repository<AIApiUsage>,
    private readonly dataSource: DataSource,
    private readonly auditService: AdminAuditService,
    private readonly huggingFaceService: HuggingFaceService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly rateLimiterService: AIRateLimiterService,
  ) {}

  /**
   * Get all AI service configurations with filtering and pagination
   */
  async getConfigurations(
    filters: AIConfigFiltersDto,
  ): Promise<PaginatedAIConfigsDto> {
    const queryBuilder = this.configRepository
      .createQueryBuilder('config')
      .leftJoinAndSelect('config.createdBy', 'createdBy')
      .leftJoinAndSelect('config.updatedBy', 'updatedBy');

    // Apply filters
    if (filters.serviceType) {
      queryBuilder.andWhere('config.serviceType = :serviceType', {
        serviceType: filters.serviceType,
      });
    }

    if (filters.modelType) {
      queryBuilder.andWhere('config.modelType = :modelType', {
        modelType: filters.modelType,
      });
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('config.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(config.name ILIKE :search OR config.description ILIKE :search OR config.model ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('config.tags && :tags', { tags: filters.tags });
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);
    queryBuilder.orderBy('config.createdAt', 'DESC');

    const [configs, total] = await queryBuilder.getManyAndCount();

    return {
      configs: configs.map((config) => this.mapToResponseDto(config)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get AI service configuration by ID
   */
  async getConfigurationById(id: string): Promise<AIServiceConfigResponseDto> {
    const config = await this.configRepository.findOne({
      where: { id },
      relations: ['createdBy', 'updatedBy'],
    });

    if (!config) {
      throw new NotFoundException(
        `AI service configuration with ID ${id} not found`,
      );
    }

    return this.mapToResponseDto(config);
  }

  /**
   * Create new AI service configuration
   */
  async createConfiguration(
    createDto: CreateAIServiceConfigDto,
    adminId: string,
  ): Promise<AIServiceConfigResponseDto> {
    // Check if name already exists
    const existingConfig = await this.configRepository.findOne({
      where: { name: createDto.name },
    });

    if (existingConfig) {
      throw new ConflictException(
        `AI service configuration with name '${createDto.name}' already exists`,
      );
    }

    // Validate configuration
    await this.validateConfiguration(createDto);

    const config = this.configRepository.create({
      ...createDto,
      createdById: adminId,
      updatedById: adminId,
      version: 1,
    });

    const savedConfig = await this.configRepository.save(config);

    // Log the creation
    await this.auditService.logAdminAction(
      adminId,
      'create',
      'ai_service_config',
      savedConfig.id,
      null,
      savedConfig,
    );

    this.logger.log(
      `AI service configuration '${savedConfig.name}' created by admin ${adminId}`,
    );

    return this.getConfigurationById(savedConfig.id);
  }

  /**
   * Update AI service configuration
   */
  async updateConfiguration(
    id: string,
    updateDto: UpdateAIServiceConfigDto,
    adminId: string,
  ): Promise<AIServiceConfigResponseDto> {
    const config = await this.configRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(
        `AI service configuration with ID ${id} not found`,
      );
    }

    // Check for name conflicts if name is being updated
    if (updateDto.name && updateDto.name !== config.name) {
      const existingConfig = await this.configRepository.findOne({
        where: { name: updateDto.name },
      });

      if (existingConfig) {
        throw new ConflictException(
          `AI service configuration with name '${updateDto.name}' already exists`,
        );
      }
    }

    const oldValues = { ...config };

    // Validate updated configuration
    const mergedConfig = {
      ...config,
      ...updateDto,
      apiEndpoint:
        updateDto.apiEndpoint !== undefined
          ? updateDto.apiEndpoint
          : config.apiEndpoint || undefined,
      apiKey:
        updateDto.apiKey !== undefined
          ? updateDto.apiKey
          : config.apiKey || undefined,
      description:
        updateDto.description !== undefined
          ? updateDto.description
          : config.description || undefined,
    };
    await this.validateConfiguration(mergedConfig);

    // Update configuration
    Object.assign(config, updateDto);
    config.updatedById = adminId;
    config.incrementVersion();

    const savedConfig = await this.configRepository.save(config);

    // Log the update
    await this.auditService.logAdminAction(
      adminId,
      'update',
      'ai_service_config',
      savedConfig.id,
      oldValues,
      savedConfig,
    );

    this.logger.log(
      `AI service configuration '${savedConfig.name}' updated by admin ${adminId}`,
    );

    return this.getConfigurationById(savedConfig.id);
  }

  /**
   * Delete AI service configuration
   */
  async deleteConfiguration(id: string, adminId: string): Promise<void> {
    const config = await this.configRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(
        `AI service configuration with ID ${id} not found`,
      );
    }

    // Check if configuration is in use
    const usageCount = await this.usageRepository.count({
      where: { model: config.model },
    });

    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete AI service configuration '${config.name}' as it has usage history. Consider deactivating instead.`,
      );
    }

    await this.configRepository.remove(config);

    // Log the deletion
    await this.auditService.logAdminAction(
      adminId,
      'delete',
      'ai_service_config',
      id,
      config,
      null,
    );

    this.logger.log(
      `AI service configuration '${config.name}' deleted by admin ${adminId}`,
    );
  }

  /**
   * Bulk operations on AI service configurations
   */
  async bulkOperation(
    operationDto: BulkAIConfigOperationDto,
    adminId: string,
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
      results: [],
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const configId of operationDto.configIds) {
        try {
          const config = await queryRunner.manager.findOne(AIServiceConfig, {
            where: { id: configId },
          });

          if (!config) {
            result.failureCount++;
            result.errors.push(`Configuration ${configId} not found`);
            result.results.push({
              id: configId,
              success: false,
              error: 'Configuration not found',
            });
            continue;
          }

          const oldValues = { ...config };

          switch (operationDto.operation) {
            case 'activate':
              config.isActive = true;
              break;
            case 'deactivate':
              config.isActive = false;
              break;
            case 'delete':
              // Check if configuration is in use
              const usageCount = await this.usageRepository.count({
                where: { model: config.model },
              });

              if (usageCount > 0) {
                throw new Error('Configuration has usage history');
              }

              await queryRunner.manager.remove(config);
              break;
          }

          if (operationDto.operation !== 'delete') {
            config.updatedById = adminId;
            config.incrementVersion();
            await queryRunner.manager.save(config);
          }

          // Log the operation
          await this.auditService.logAdminAction(
            adminId,
            operationDto.operation,
            'ai_service_config',
            configId,
            oldValues,
            operationDto.operation === 'delete' ? null : config,
          );

          result.successCount++;
          result.results.push({
            id: configId,
            success: true,
          });
        } catch (error) {
          result.failureCount++;
          result.errors.push(
            `Failed to ${operationDto.operation} ${configId}: ${error.message}`,
          );
          result.results.push({
            id: configId,
            success: false,
            error: error.message,
          });
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    this.logger.log(
      `Bulk ${operationDto.operation} completed by admin ${adminId}: ${result.successCount} successful, ${result.failureCount} failed`,
    );

    return result;
  }

  /**
   * Get AI service status and health information
   */
  async getServiceStatus(id: string): Promise<AIServiceStatusDto> {
    const config = await this.configRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(
        `AI service configuration with ID ${id} not found`,
      );
    }

    // Get health status
    let isHealthy = false;
    let lastHealthCheck = new Date();

    try {
      if (config.serviceType === AIServiceType.HUGGING_FACE) {
        isHealthy = await this.huggingFaceService.healthCheck();
      }
    } catch (error) {
      this.logger.warn(
        `Health check failed for service ${config.name}: ${error.message}`,
      );
    }

    // Get circuit breaker status
    const circuitBreakerStatus = this.circuitBreakerService.getStatus(
      `${config.serviceType}-${config.modelType}`,
    );

    // Get rate limit status
    const rateLimitStatus = await this.rateLimiterService.checkRateLimit();

    // Get performance metrics
    const performanceMetrics = await this.getPerformanceMetrics(
      config.model,
      24,
    ); // Last 24 hours

    return {
      id: config.id,
      name: config.name,
      isHealthy,
      lastHealthCheck,
      circuitBreakerState: circuitBreakerStatus?.state || 'unknown',
      rateLimitStatus: {
        remaining: rateLimitStatus.remainingRequests,
        resetTime: rateLimitStatus.resetTime,
        monthlyUsage: rateLimitStatus.monthlyUsage,
        monthlyLimit: rateLimitStatus.monthlyLimit,
      },
      performanceMetrics: {
        averageResponseTime: performanceMetrics.averageResponseTime,
        successRate: performanceMetrics.successRate,
        totalRequests: performanceMetrics.totalRequests,
        errorRate: performanceMetrics.errorRate,
      },
    };
  }

  /**
   * Get detailed performance metrics for an AI service
   */
  async getServicePerformance(
    id: string,
    hoursBack: number = 24,
  ): Promise<AIServicePerformanceDto> {
    const config = await this.configRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(
        `AI service configuration with ID ${id} not found`,
      );
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hoursBack * 60 * 60 * 1000);

    // Get usage data
    const usageData = await this.usageRepository
      .createQueryBuilder('usage')
      .where('usage.model = :model', { model: config.model })
      .andWhere('usage.createdAt >= :startTime', { startTime })
      .andWhere('usage.createdAt <= :endTime', { endTime })
      .getMany();

    // Calculate metrics
    const totalRequests = usageData.length;
    const successfulRequests = usageData.filter((u) => u.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate =
      totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    const errorRate =
      totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;

    const responseTimes = usageData
      .map((u) => u.responseTimeMs)
      .sort((a, b) => a - b);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length
        : 0;
    const medianResponseTime =
      responseTimes.length > 0
        ? responseTimes[Math.floor(responseTimes.length / 2)]
        : 0;
    const p95ResponseTime =
      responseTimes.length > 0
        ? responseTimes[Math.floor(responseTimes.length * 0.95)]
        : 0;
    const p99ResponseTime =
      responseTimes.length > 0
        ? responseTimes[Math.floor(responseTimes.length * 0.99)]
        : 0;

    const totalTokensUsed = usageData.reduce((sum, u) => sum + u.tokensUsed, 0);
    const averageTokensPerRequest =
      totalRequests > 0 ? totalTokensUsed / totalRequests : 0;

    // Error breakdown
    const errorBreakdown = this.calculateErrorBreakdown(
      usageData.filter((u) => !u.success),
    );

    // Hourly stats
    const hourlyStats = this.calculateHourlyStats(
      usageData,
      startTime,
      endTime,
    );

    return {
      serviceId: config.id,
      serviceName: config.name,
      timeRange: { start: startTime, end: endTime },
      metrics: {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        medianResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        errorRate,
        successRate,
        totalTokensUsed,
        averageTokensPerRequest,
      },
      errorBreakdown,
      hourlyStats,
    };
  }

  /**
   * Test AI service configuration
   */
  async testConfiguration(
    id: string,
    adminId: string,
  ): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
    details?: any;
  }> {
    const config = await this.configRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(
        `AI service configuration with ID ${id} not found`,
      );
    }

    const startTime = Date.now();
    let success = false;
    let error: string | undefined;
    let details: any;

    try {
      if (config.serviceType === AIServiceType.HUGGING_FACE) {
        if (config.modelType === AIModelType.EMBEDDING) {
          const result = await this.huggingFaceService.generateEmbeddings([
            'test embedding',
          ]);
          details = { embeddingLength: result[0]?.length };
        } else if (config.modelType === AIModelType.QA) {
          const result = await this.huggingFaceService.questionAnswering({
            question: 'What is this?',
            context: 'This is a test for the AI service configuration.',
          });
          details = { answer: result.answer, score: result.score };
        }
      }
      success = true;
    } catch (err) {
      error = err.message;
    }

    const responseTime = Date.now() - startTime;

    // Log the test
    await this.auditService.logAdminAction(
      adminId,
      'test',
      'ai_service_config',
      config.id,
      null,
      { success, responseTime, error, details },
    );

    return {
      success,
      responseTime,
      error,
      details,
    };
  }

  /**
   * Validate AI service configuration
   */
  private async validateConfiguration(
    config: Partial<CreateAIServiceConfigDto | UpdateAIServiceConfigDto>,
  ): Promise<void> {
    // Validate rate limits
    if (config.rateLimits) {
      const { rateLimits } = config;
      if (rateLimits.requestsPerMinute > rateLimits.requestsPerHour) {
        throw new BadRequestException(
          'Requests per minute cannot exceed requests per hour',
        );
      }
      if (rateLimits.requestsPerHour > rateLimits.requestsPerDay) {
        throw new BadRequestException(
          'Requests per hour cannot exceed requests per day',
        );
      }
      if (rateLimits.requestsPerDay > rateLimits.monthlyLimit) {
        throw new BadRequestException(
          'Requests per day cannot exceed monthly limit',
        );
      }
    }

    // Validate model parameters
    if (config.modelParameters) {
      const { modelParameters } = config;
      if (
        modelParameters.temperature !== undefined &&
        (modelParameters.temperature < 0 || modelParameters.temperature > 2)
      ) {
        throw new BadRequestException('Temperature must be between 0 and 2');
      }
      if (
        modelParameters.topP !== undefined &&
        (modelParameters.topP < 0 || modelParameters.topP > 1)
      ) {
        throw new BadRequestException('Top P must be between 0 and 1');
      }
      if (
        modelParameters.confidenceThreshold !== undefined &&
        (modelParameters.confidenceThreshold < 0 ||
          modelParameters.confidenceThreshold > 1)
      ) {
        throw new BadRequestException(
          'Confidence threshold must be between 0 and 1',
        );
      }
    }

    // Validate circuit breaker configuration
    if (config.circuitBreaker) {
      const { circuitBreaker } = config;
      if (circuitBreaker.failureThreshold < 1) {
        throw new BadRequestException('Failure threshold must be at least 1');
      }
      if (circuitBreaker.recoveryTimeout < 1000) {
        throw new BadRequestException(
          'Recovery timeout must be at least 1000ms',
        );
      }
      if (circuitBreaker.halfOpenMaxCalls < 1) {
        throw new BadRequestException('Half-open max calls must be at least 1');
      }
    }
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(
    config: AIServiceConfig,
  ): AIServiceConfigResponseDto {
    return {
      id: config.id,
      name: config.name,
      serviceType: config.serviceType,
      modelType: config.modelType,
      model: config.model,
      apiEndpoint: config.apiEndpoint || undefined,
      timeout: config.timeout,
      rateLimits: config.rateLimits,
      modelParameters: config.modelParameters,
      fallbackBehavior: config.fallbackBehavior,
      circuitBreaker: config.circuitBreaker,
      description: config.description || undefined,
      isActive: config.isActive,
      tags: config.tags,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      createdBy: config.createdBy?.id || config.createdById,
      updatedBy: config.updatedBy?.id || config.updatedById,
    };
  }

  /**
   * Get basic performance metrics
   */
  private async getPerformanceMetrics(
    model: string,
    hoursBack: number,
  ): Promise<{
    averageResponseTime: number;
    successRate: number;
    totalRequests: number;
    errorRate: number;
  }> {
    const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const usageData = await this.usageRepository
      .createQueryBuilder('usage')
      .where('usage.model = :model', { model })
      .andWhere('usage.createdAt >= :startTime', { startTime })
      .getMany();

    const totalRequests = usageData.length;
    const successfulRequests = usageData.filter((u) => u.success).length;
    const successRate =
      totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
    const errorRate = 100 - successRate;
    const averageResponseTime =
      totalRequests > 0
        ? usageData.reduce((sum, u) => sum + u.responseTimeMs, 0) /
          totalRequests
        : 0;

    return {
      averageResponseTime,
      successRate,
      totalRequests,
      errorRate,
    };
  }

  /**
   * Calculate error breakdown
   */
  private calculateErrorBreakdown(failedUsage: AIApiUsage[]): Array<{
    errorType: string;
    count: number;
    percentage: number;
  }> {
    const errorCounts = new Map<string, number>();
    const totalErrors = failedUsage.length;

    failedUsage.forEach((usage) => {
      const errorType = usage.errorMessage || 'Unknown Error';
      errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
    });

    return Array.from(errorCounts.entries()).map(([errorType, count]) => ({
      errorType,
      count,
      percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0,
    }));
  }

  /**
   * Calculate hourly statistics
   */
  private calculateHourlyStats(
    usageData: AIApiUsage[],
    startTime: Date,
    endTime: Date,
  ): Array<{
    hour: Date;
    requests: number;
    successRate: number;
    averageResponseTime: number;
  }> {
    const hourlyStats = new Map<string, AIApiUsage[]>();

    // Group usage data by hour
    usageData.forEach((usage) => {
      const hour = new Date(usage.createdAt);
      hour.setMinutes(0, 0, 0);
      const hourKey = hour.toISOString();

      if (!hourlyStats.has(hourKey)) {
        hourlyStats.set(hourKey, []);
      }
      hourlyStats.get(hourKey)!.push(usage);
    });

    // Calculate stats for each hour
    const stats: Array<{
      hour: Date;
      requests: number;
      successRate: number;
      averageResponseTime: number;
    }> = [];

    // Fill in all hours in the range, even if no data
    const currentHour = new Date(startTime);
    currentHour.setMinutes(0, 0, 0);

    while (currentHour <= endTime) {
      const hourKey = currentHour.toISOString();
      const hourData = hourlyStats.get(hourKey) || [];

      const requests = hourData.length;
      const successfulRequests = hourData.filter((u) => u.success).length;
      const successRate =
        requests > 0 ? (successfulRequests / requests) * 100 : 0;
      const averageResponseTime =
        requests > 0
          ? hourData.reduce((sum, u) => sum + u.responseTimeMs, 0) / requests
          : 0;

      stats.push({
        hour: new Date(currentHour),
        requests,
        successRate,
        averageResponseTime,
      });

      currentHour.setHours(currentHour.getHours() + 1);
    }

    return stats;
  }
}
