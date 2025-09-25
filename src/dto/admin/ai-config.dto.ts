import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsObject,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AIServiceType {
  HUGGING_FACE = 'hugging_face',
  OPENAI = 'openai',
  CUSTOM = 'custom',
}

export enum AIModelType {
  EMBEDDING = 'embedding',
  QA = 'qa',
  CLASSIFICATION = 'classification',
  GENERATION = 'generation',
}

export class RateLimitConfigDto {
  @IsNumber()
  @Min(1)
  requestsPerMinute: number;

  @IsNumber()
  @Min(1)
  requestsPerHour: number;

  @IsNumber()
  @Min(1)
  requestsPerDay: number;

  @IsNumber()
  @Min(1)
  monthlyLimit: number;

  @IsNumber()
  @Min(0)
  burstLimit: number;
}

export class ModelParametersDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  frequencyPenalty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  presencePenalty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;

  @IsOptional()
  @IsObject()
  customParameters?: Record<string, any>;
}

export class FallbackBehaviorDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsEnum(AIServiceType)
  fallbackService?: AIServiceType;

  @IsOptional()
  @IsString()
  fallbackModel?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxRetries?: number;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  retryDelayMs?: number;

  @IsOptional()
  @IsString()
  fallbackMessage?: string;
}

export class CircuitBreakerConfigDto {
  @IsNumber()
  @Min(1)
  failureThreshold: number;

  @IsNumber()
  @Min(1000)
  recoveryTimeout: number;

  @IsNumber()
  @Min(1)
  halfOpenMaxCalls: number;

  @IsNumber()
  @Min(1000)
  monitoringPeriod: number;
}

export class CreateAIServiceConfigDto {
  @IsString()
  name: string;

  @IsEnum(AIServiceType)
  serviceType: AIServiceType;

  @IsEnum(AIModelType)
  modelType: AIModelType;

  @IsString()
  model: string;

  @IsOptional()
  @IsUrl()
  apiEndpoint?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  timeout?: number;

  @ValidateNested()
  @Type(() => RateLimitConfigDto)
  rateLimits: RateLimitConfigDto;

  @ValidateNested()
  @Type(() => ModelParametersDto)
  modelParameters: ModelParametersDto;

  @ValidateNested()
  @Type(() => FallbackBehaviorDto)
  fallbackBehavior: FallbackBehaviorDto;

  @ValidateNested()
  @Type(() => CircuitBreakerConfigDto)
  circuitBreaker: CircuitBreakerConfigDto;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateAIServiceConfigDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsUrl()
  apiEndpoint?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsNumber()
  @Min(1000)
  timeout?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => RateLimitConfigDto)
  rateLimits?: RateLimitConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ModelParametersDto)
  modelParameters?: ModelParametersDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FallbackBehaviorDto)
  fallbackBehavior?: FallbackBehaviorDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CircuitBreakerConfigDto)
  circuitBreaker?: CircuitBreakerConfigDto;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class AIServiceConfigResponseDto {
  id: string;
  name: string;
  serviceType: AIServiceType;
  modelType: AIModelType;
  model: string;
  apiEndpoint?: string;
  timeout: number;
  rateLimits: RateLimitConfigDto;
  modelParameters: ModelParametersDto;
  fallbackBehavior: FallbackBehaviorDto;
  circuitBreaker: CircuitBreakerConfigDto;
  description?: string;
  isActive: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export class AIServiceStatusDto {
  id: string;
  name: string;
  isHealthy: boolean;
  lastHealthCheck: Date;
  circuitBreakerState: string;
  rateLimitStatus: {
    remaining: number;
    resetTime: Date;
    monthlyUsage: number;
    monthlyLimit: number;
  };
  performanceMetrics: {
    averageResponseTime: number;
    successRate: number;
    totalRequests: number;
    errorRate: number;
  };
}

export class AIServicePerformanceDto {
  serviceId: string;
  serviceName: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    medianResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    errorRate: number;
    successRate: number;
    totalTokensUsed: number;
    averageTokensPerRequest: number;
  };
  errorBreakdown: Array<{
    errorType: string;
    count: number;
    percentage: number;
  }>;
  hourlyStats: Array<{
    hour: Date;
    requests: number;
    successRate: number;
    averageResponseTime: number;
  }>;
}

export class BulkAIConfigOperationDto {
  @IsArray()
  @IsString({ each: true })
  configIds: string[];

  @IsEnum(['activate', 'deactivate', 'delete'])
  operation: 'activate' | 'deactivate' | 'delete';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AIConfigFiltersDto {
  @IsOptional()
  @IsEnum(AIServiceType)
  serviceType?: AIServiceType;

  @IsOptional()
  @IsEnum(AIModelType)
  modelType?: AIModelType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
