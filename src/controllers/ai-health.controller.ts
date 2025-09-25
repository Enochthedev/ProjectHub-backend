import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AIMonitoringService } from '../services/ai-monitoring.service';
import { HuggingFaceService } from '../services/hugging-face.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';

@ApiTags('AI Health & Monitoring')
@Controller('ai-health')
export class AIHealthController {
  constructor(
    private readonly aiMonitoringService: AIMonitoringService,
    private readonly huggingFaceService: HuggingFaceService,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Get('status')
  @Public()
  @ApiOperation({
    summary: 'AI service health status',
    description:
      'Returns the current health status of AI services including circuit breaker state and performance metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'AI service health status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        circuitBreakerState: {
          type: 'string',
          enum: ['CLOSED', 'OPEN', 'HALF_OPEN'],
        },
        rateLimitStatus: {
          type: 'string',
          enum: ['ok', 'approaching', 'exceeded'],
        },
        responseTimeStatus: {
          type: 'string',
          enum: ['fast', 'slow', 'timeout'],
        },
        errorRateStatus: { type: 'string', enum: ['low', 'medium', 'high'] },
        lastHealthCheck: { type: 'string', format: 'date-time' },
        issues: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async getHealthStatus() {
    return this.aiMonitoringService.getHealthStatus();
  }

  @Get('metrics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'AI service metrics',
    description:
      'Returns detailed AI service metrics including request counts, response times, and token usage',
  })
  @ApiResponse({
    status: 200,
    description: 'AI service metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalRequests: { type: 'number' },
        successfulRequests: { type: 'number' },
        failedRequests: { type: 'number' },
        averageResponseTime: { type: 'number' },
        totalTokensUsed: { type: 'number' },
        rateLimitHits: { type: 'number' },
        circuitBreakerTrips: { type: 'number' },
        successRate: { type: 'number' },
        requestsPerMinute: { type: 'number' },
        lastRequestTime: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getMetrics() {
    return this.aiMonitoringService.getMetrics();
  }

  @Get('alerts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Active AI service alerts',
    description:
      'Returns all active alerts for AI services including error rates, response times, and rate limits',
  })
  @ApiResponse({
    status: 200,
    description: 'AI service alerts retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        active: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: {
                type: 'string',
                enum: [
                  'error_rate',
                  'response_time',
                  'rate_limit',
                  'circuit_breaker',
                  'token_usage',
                ],
              },
              severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
              },
              message: { type: 'string' },
              details: { type: 'object' },
              timestamp: { type: 'string', format: 'date-time' },
              resolved: { type: 'boolean' },
            },
          },
        },
        total: { type: 'number' },
      },
    },
  })
  async getAlerts() {
    const activeAlerts = this.aiMonitoringService.getActiveAlerts();
    const allAlerts = this.aiMonitoringService.getAllAlerts();

    return {
      active: activeAlerts,
      total: allAlerts.length,
    };
  }

  @Post('alerts/:alertId/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Resolve AI service alert',
    description: 'Manually resolve an active AI service alert',
  })
  @ApiResponse({
    status: 200,
    description: 'Alert resolved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Alert not found or already resolved',
  })
  async resolveAlert(@Param('alertId') alertId: string) {
    const resolved = this.aiMonitoringService.resolveAlert(alertId);

    if (resolved) {
      return {
        success: true,
        message: `Alert ${alertId} resolved successfully`,
      };
    } else {
      return {
        success: false,
        message: `Alert ${alertId} not found or already resolved`,
      };
    }
  }

  @Get('diagnostics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'AI service diagnostics',
    description:
      'Returns comprehensive diagnostic information for troubleshooting AI service issues',
  })
  @ApiResponse({
    status: 200,
    description: 'AI service diagnostics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        metrics: { type: 'object' },
        health: { type: 'object' },
        recentActivity: {
          type: 'object',
          properties: {
            requests: {
              type: 'array',
              items: { type: 'string', format: 'date-time' },
            },
            responseTimes: { type: 'array', items: { type: 'number' } },
            averageRecentResponseTime: { type: 'number' },
          },
        },
        circuitBreakers: { type: 'object' },
        alerts: {
          type: 'object',
          properties: {
            active: { type: 'number' },
            total: { type: 'number' },
          },
        },
        thresholds: { type: 'object' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getDiagnostics() {
    return this.aiMonitoringService.getDiagnosticInfo();
  }

  @Post('circuit-breaker/:serviceName/reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reset circuit breaker',
    description:
      'Manually reset a circuit breaker for the specified AI service',
  })
  @ApiResponse({
    status: 200,
    description: 'Circuit breaker reset successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        serviceName: { type: 'string' },
      },
    },
  })
  async resetCircuitBreaker(@Param('serviceName') serviceName: string) {
    this.circuitBreakerService.reset(serviceName);

    return {
      success: true,
      message: `Circuit breaker for ${serviceName} reset successfully`,
      serviceName,
    };
  }

  @Get('circuit-breakers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Circuit breaker status',
    description: 'Returns the status of all circuit breakers for AI services',
  })
  @ApiResponse({
    status: 200,
    description: 'Circuit breaker statuses retrieved successfully',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          state: { type: 'string', enum: ['CLOSED', 'OPEN', 'HALF_OPEN'] },
          failureCount: { type: 'number' },
          lastFailureTime: { type: 'string', format: 'date-time' },
          nextAttemptTime: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async getCircuitBreakerStatuses() {
    return this.circuitBreakerService.getAllStatuses();
  }

  @Post('health-check')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Manual health check',
    description: 'Trigger a manual health check of AI services',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        healthy: { type: 'boolean' },
        message: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async performHealthCheck() {
    try {
      const healthy = await this.huggingFaceService.healthCheck();

      return {
        success: true,
        healthy,
        message: healthy
          ? 'AI service is healthy'
          : 'AI service health check failed',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        healthy: false,
        message: `Health check failed: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  @Post('metrics/reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reset AI metrics',
    description: 'Reset AI service metrics (for testing or periodic resets)',
  })
  @ApiResponse({
    status: 200,
    description: 'AI metrics reset successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async resetMetrics() {
    this.aiMonitoringService.resetMetrics();

    return {
      success: true,
      message: 'AI service metrics reset successfully',
      timestamp: new Date(),
    };
  }
}
