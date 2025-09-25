import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum MetricType {
  RESPONSE_TIME = 'response_time',
  SUCCESS_RATE = 'success_rate',
  ERROR_RATE = 'error_rate',
  THROUGHPUT = 'throughput',
  TOKEN_USAGE = 'token_usage',
  COST = 'cost',
}

export class AIHealthCheckDto {
  serviceId: string;
  serviceName: string;
  status: HealthStatus;
  lastChecked: Date;
  responseTime: number;
  uptime: number;
  checks: Array<{
    name: string;
    status: HealthStatus;
    message?: string;
    responseTime?: number;
  }>;
  dependencies: Array<{
    name: string;
    status: HealthStatus;
    responseTime?: number;
  }>;
}

export class AIPerformanceMetricsDto {
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
    minResponseTime: number;
    maxResponseTime: number;
    successRate: number;
    errorRate: number;
    throughput: number; // requests per minute
    totalTokensUsed: number;
    averageTokensPerRequest: number;
    totalCost: number;
    averageCostPerRequest: number;
  };
  trends: {
    responseTimeTrend: number; // percentage change
    successRateTrend: number;
    throughputTrend: number;
    errorRateTrend: number;
  };
  breakdown: {
    byEndpoint: Array<{
      endpoint: string;
      requests: number;
      averageResponseTime: number;
      successRate: number;
    }>;
    byModel: Array<{
      model: string;
      requests: number;
      averageResponseTime: number;
      successRate: number;
      tokensUsed: number;
    }>;
    byHour: Array<{
      hour: Date;
      requests: number;
      averageResponseTime: number;
      successRate: number;
    }>;
    byUser: Array<{
      userId: string;
      requests: number;
      averageResponseTime: number;
      successRate: number;
    }>;
  };
}

export class AIErrorAnalysisDto {
  serviceId: string;
  serviceName: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  errorSummary: {
    totalErrors: number;
    errorRate: number;
    mostCommonErrors: Array<{
      errorType: string;
      count: number;
      percentage: number;
      lastOccurrence: Date;
    }>;
  };
  errorBreakdown: {
    byType: Array<{
      errorType: string;
      count: number;
      percentage: number;
      averageResponseTime: number;
    }>;
    byEndpoint: Array<{
      endpoint: string;
      errorCount: number;
      errorRate: number;
    }>;
    byModel: Array<{
      model: string;
      errorCount: number;
      errorRate: number;
    }>;
    byTimeOfDay: Array<{
      hour: number;
      errorCount: number;
      errorRate: number;
    }>;
  };
  recentErrors: Array<{
    timestamp: Date;
    errorType: string;
    errorMessage: string;
    endpoint: string;
    model: string;
    userId?: string;
    responseTime: number;
    stackTrace?: string;
  }>;
}

export class AIAlertDto {
  id: string;
  serviceId: string;
  serviceName: string;
  alertType: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  threshold: number;
  currentValue: number;
  isActive: boolean;
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  metadata: Record<string, any>;
}

export class CreateAIAlertRuleDto {
  @IsString()
  name: string;

  @IsString()
  serviceId: string;

  @IsEnum(MetricType)
  metricType: MetricType;

  @IsString()
  condition: string; // e.g., 'greater_than', 'less_than', 'equals'

  @IsNumber()
  threshold: number;

  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  evaluationWindow?: number; // minutes

  @IsOptional()
  @IsNumber()
  @Min(1)
  cooldownPeriod?: number; // minutes

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notificationChannels?: string[];
}

export class UpdateAIAlertRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsNumber()
  threshold?: number;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  evaluationWindow?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  cooldownPeriod?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notificationChannels?: string[];
}

export class AIAlertRuleResponseDto {
  id: string;
  name: string;
  serviceId: string;
  serviceName: string;
  metricType: MetricType;
  condition: string;
  threshold: number;
  severity: AlertSeverity;
  description?: string;
  evaluationWindow: number;
  cooldownPeriod: number;
  isEnabled: boolean;
  notificationChannels: string[];
  lastTriggered?: Date;
  triggerCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export class AIDiagnosticsDto {
  serviceId: string;
  serviceName: string;
  timestamp: Date;
  overallHealth: HealthStatus;
  diagnostics: {
    connectivity: {
      status: HealthStatus;
      responseTime: number;
      message?: string;
    };
    authentication: {
      status: HealthStatus;
      message?: string;
    };
    rateLimits: {
      status: HealthStatus;
      remaining: number;
      resetTime: Date;
      message?: string;
    };
    circuitBreaker: {
      status: HealthStatus;
      state: string;
      failureCount: number;
      message?: string;
    };
    modelAvailability: {
      status: HealthStatus;
      availableModels: string[];
      unavailableModels: string[];
      message?: string;
    };
    performance: {
      status: HealthStatus;
      averageResponseTime: number;
      successRate: number;
      message?: string;
    };
  };
  recommendations: Array<{
    type: string;
    priority: AlertSeverity;
    title: string;
    description: string;
    actionItems: string[];
  }>;
}

export class AIServiceComparisonDto {
  timeRange: {
    start: Date;
    end: Date;
  };
  services: Array<{
    serviceId: string;
    serviceName: string;
    metrics: {
      totalRequests: number;
      averageResponseTime: number;
      successRate: number;
      errorRate: number;
      totalCost: number;
      tokensUsed: number;
    };
    ranking: {
      responseTimeRank: number;
      successRateRank: number;
      costEfficiencyRank: number;
      reliabilityRank: number;
      overallRank: number;
    };
  }>;
  insights: Array<{
    type: string;
    title: string;
    description: string;
    affectedServices: string[];
  }>;
}

export class AIUsagePatternDto {
  serviceId: string;
  serviceName: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  patterns: {
    peakHours: Array<{
      hour: number;
      averageRequests: number;
      averageResponseTime: number;
    }>;
    weeklyTrends: Array<{
      dayOfWeek: number;
      averageRequests: number;
      averageResponseTime: number;
    }>;
    userBehavior: {
      topUsers: Array<{
        userId: string;
        requestCount: number;
        averageResponseTime: number;
        preferredModels: string[];
      }>;
      newUsers: number;
      returningUsers: number;
      averageSessionDuration: number;
    };
    modelUsage: Array<{
      model: string;
      requestCount: number;
      percentage: number;
      averageResponseTime: number;
      successRate: number;
    }>;
  };
  anomalies: Array<{
    timestamp: Date;
    type: string;
    description: string;
    severity: AlertSeverity;
    metrics: Record<string, number>;
  }>;
}

export class AIMonitoringFiltersDto {
  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(HealthStatus)
  healthStatus?: HealthStatus;

  @IsOptional()
  @IsEnum(AlertSeverity)
  alertSeverity?: AlertSeverity;

  @IsOptional()
  @IsString()
  endpoint?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  userId?: string;

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

export class AIMonitoringDashboardDto {
  overview: {
    totalServices: number;
    healthyServices: number;
    degradedServices: number;
    unhealthyServices: number;
    activeAlerts: number;
    totalRequests24h: number;
    averageResponseTime24h: number;
    successRate24h: number;
    totalCost24h: number;
  };
  serviceHealth: Array<{
    serviceId: string;
    serviceName: string;
    status: HealthStatus;
    responseTime: number;
    successRate: number;
    lastChecked: Date;
  }>;
  recentAlerts: AIAlertDto[];
  performanceTrends: Array<{
    timestamp: Date;
    averageResponseTime: number;
    successRate: number;
    throughput: number;
    errorRate: number;
  }>;
  topErrors: Array<{
    errorType: string;
    count: number;
    services: string[];
    lastOccurrence: Date;
  }>;
  costAnalysis: {
    totalCost24h: number;
    costByService: Array<{
      serviceId: string;
      serviceName: string;
      cost: number;
      percentage: number;
    }>;
    costTrend: Array<{
      date: Date;
      cost: number;
    }>;
  };
}

export class AIPerformanceReportDto {
  reportId: string;
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalServices: number;
    totalRequests: number;
    averageResponseTime: number;
    successRate: number;
    totalCost: number;
    keyInsights: string[];
  };
  servicePerformance: Array<{
    serviceId: string;
    serviceName: string;
    metrics: AIPerformanceMetricsDto['metrics'];
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    recommendations: string[];
  }>;
  trends: {
    responseTime: {
      trend: 'improving' | 'stable' | 'degrading';
      changePercentage: number;
    };
    successRate: {
      trend: 'improving' | 'stable' | 'degrading';
      changePercentage: number;
    };
    cost: {
      trend: 'increasing' | 'stable' | 'decreasing';
      changePercentage: number;
    };
  };
  incidents: Array<{
    timestamp: Date;
    serviceId: string;
    type: string;
    severity: AlertSeverity;
    description: string;
    duration: number;
    impact: string;
  }>;
  recommendations: Array<{
    priority: AlertSeverity;
    category: string;
    title: string;
    description: string;
    expectedImpact: string;
    actionItems: string[];
  }>;
}
