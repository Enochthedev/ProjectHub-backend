import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { MonitoringService } from './monitoring.service';
import { Public } from '../common/decorators';

@ApiTags('Health & Monitoring')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly monitoringService: MonitoringService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'General health check',
    description:
      'Returns the overall health status of the application including database connectivity and environment configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check successful',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: { type: 'object' },
        error: { type: 'object' },
        details: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable - health check failed',
  })
  async check() {
    return this.healthService.checkHealth();
  }

  @Get('ready')
  @Public()
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Checks if the application is ready to serve traffic (database migrations, critical services)',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is ready to serve traffic',
  })
  @ApiResponse({
    status: 503,
    description:
      'Application is not ready (pending migrations, missing services)',
  })
  async ready() {
    return this.healthService.checkReadiness();
  }

  @Get('live')
  @Public()
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Checks if the application is alive and responsive (memory usage, uptime)',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive and responsive',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not responsive or has critical issues',
  })
  async live() {
    return this.healthService.checkLiveness();
  }

  @Get('metrics')
  @Public()
  @ApiOperation({
    summary: 'Application metrics',
    description:
      'Returns authentication, performance, and system metrics for monitoring dashboards',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        authentication: {
          type: 'object',
          properties: {
            totalLogins: { type: 'number' },
            successfulLogins: { type: 'number' },
            failedLogins: { type: 'number' },
            registrations: { type: 'number' },
            tokenRefreshes: { type: 'number' },
            passwordResets: { type: 'number' },
            emailVerifications: { type: 'number' },
          },
        },
        performance: {
          type: 'object',
          properties: {
            averageResponseTime: { type: 'number' },
            slowRequests: { type: 'number' },
            errorRate: { type: 'number' },
            requestsPerMinute: { type: 'number' },
            activeUsers: { type: 'number' },
          },
        },
        system: {
          type: 'object',
          properties: {
            memoryUsage: { type: 'object' },
            cpuUsage: { type: 'number' },
            uptime: { type: 'number' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async metrics() {
    return this.monitoringService.getAllMetrics();
  }

  @Get('metrics/auth')
  @Public()
  @ApiOperation({
    summary: 'Authentication metrics',
    description: 'Returns detailed authentication-related metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication metrics retrieved successfully',
  })
  async authMetrics() {
    return {
      authentication: this.monitoringService.getAuthMetrics(),
      timestamp: new Date(),
    };
  }

  @Get('metrics/performance')
  @Public()
  @ApiOperation({
    summary: 'Performance metrics',
    description:
      'Returns application performance metrics including response times and error rates',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
  })
  async performanceMetrics() {
    return {
      performance: this.monitoringService.getPerformanceMetrics(),
      timestamp: new Date(),
    };
  }

  @Get('metrics/system')
  @Public()
  @ApiOperation({
    summary: 'System metrics',
    description:
      'Returns system-level metrics including memory usage, CPU usage, and uptime',
  })
  @ApiResponse({
    status: 200,
    description: 'System metrics retrieved successfully',
  })
  async systemMetrics() {
    return {
      system: this.monitoringService.getSystemMetrics(),
      timestamp: new Date(),
    };
  }
}
