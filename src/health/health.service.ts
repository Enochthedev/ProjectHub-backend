import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheck,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AIMonitoringService } from '../services/ai-monitoring.service';
import { HuggingFaceService } from '../services/hugging-face.service';

@Injectable()
export class HealthService {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private configService: ConfigService,
    @InjectDataSource()
    private dataSource: DataSource,
    private aiMonitoringService: AIMonitoringService,
    private huggingFaceService: HuggingFaceService,
  ) {}

  @HealthCheck()
  async checkHealth() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.checkDatabaseConnection(),
      () => this.checkEnvironmentVariables(),
      () => this.checkAIServices(),
    ]);
  }

  @HealthCheck()
  async checkReadiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.checkDatabaseMigrations(),
      () => this.checkCriticalServices(),
      () => this.checkAIServicesReadiness(),
    ]);
  }

  @HealthCheck()
  async checkLiveness() {
    return this.health.check([
      () => this.checkMemoryUsage(),
      () => this.checkUptime(),
    ]);
  }

  private async checkDatabaseConnection(): Promise<HealthIndicatorResult> {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        database_connection: {
          status: 'up',
          message: 'Database connection is healthy',
        },
      };
    } catch (error) {
      return {
        database_connection: {
          status: 'down',
          message: `Database connection failed: ${error.message}`,
        },
      };
    }
  }

  private async checkDatabaseMigrations(): Promise<HealthIndicatorResult> {
    try {
      const migrations = await this.dataSource.showMigrations();
      return {
        database_migrations: {
          status: migrations ? 'down' : 'up',
          message: migrations
            ? `${migrations} pending migrations`
            : 'All migrations are up to date',
          pendingMigrations: migrations || 0,
        },
      };
    } catch (error) {
      return {
        database_migrations: {
          status: 'down',
          message: `Migration check failed: ${error.message}`,
        },
      };
    }
  }

  private async checkEnvironmentVariables(): Promise<HealthIndicatorResult> {
    const requiredVars = [
      'DATABASE_HOST',
      'DATABASE_PORT',
      'DATABASE_USERNAME',
      'DATABASE_NAME',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
    ];

    const missingVars = requiredVars.filter(
      (varName) => !this.configService.get(varName),
    );

    return {
      environment_variables: {
        status: missingVars.length === 0 ? 'up' : 'down',
        message:
          missingVars.length === 0
            ? 'All required environment variables are set'
            : `Missing environment variables: ${missingVars.join(', ')}`,
        missingVariables: missingVars,
      },
    };
  }

  private async checkCriticalServices(): Promise<HealthIndicatorResult> {
    // Check if critical services are available
    // This could include external APIs, email service, etc.
    const emailHost = this.configService.get('EMAIL_HOST');
    const emailPort = this.configService.get('EMAIL_PORT');

    return {
      critical_services: {
        status: emailHost && emailPort ? 'up' : 'down',
        message:
          emailHost && emailPort
            ? 'Critical services are configured'
            : 'Email service configuration missing',
        services: {
          email: {
            configured: !!(emailHost && emailPort),
            host: emailHost || 'not configured',
          },
        },
      },
    };
  }

  private async checkMemoryUsage(): Promise<HealthIndicatorResult> {
    const memoryUsage = process.memoryUsage();
    const maxMemory = 512 * 1024 * 1024; // 512MB threshold
    const isHealthy = memoryUsage.heapUsed < maxMemory;

    return {
      memory_usage: {
        status: isHealthy ? 'up' : 'down',
        message: isHealthy
          ? 'Memory usage is within acceptable limits'
          : 'Memory usage is high',
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
        threshold: `${Math.round(maxMemory / 1024 / 1024)}MB`,
      },
    };
  }

  private async checkUptime(): Promise<HealthIndicatorResult> {
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);

    return {
      uptime: {
        status: 'up',
        message: `Application has been running for ${uptimeHours}h ${uptimeMinutes}m`,
        seconds: Math.floor(uptime),
        formatted: `${uptimeHours}h ${uptimeMinutes}m`,
      },
    };
  }

  private async checkAIServices(): Promise<HealthIndicatorResult> {
    try {
      const aiHealth = this.aiMonitoringService.getHealthStatus();
      const isHealthy = aiHealth.status === 'healthy';

      return {
        ai_services: {
          status: isHealthy ? 'up' : 'down',
          message: isHealthy
            ? 'AI services are healthy'
            : `AI services are ${aiHealth.status}: ${aiHealth.issues.join(', ')}`,
          details: {
            status: aiHealth.status,
            circuitBreakerState: aiHealth.circuitBreakerState,
            rateLimitStatus: aiHealth.rateLimitStatus,
            responseTimeStatus: aiHealth.responseTimeStatus,
            errorRateStatus: aiHealth.errorRateStatus,
            issues: aiHealth.issues,
            recommendations: aiHealth.recommendations,
          },
        },
      };
    } catch (error) {
      return {
        ai_services: {
          status: 'down',
          message: `AI services health check failed: ${error.message}`,
        },
      };
    }
  }

  private async checkAIServicesReadiness(): Promise<HealthIndicatorResult> {
    try {
      const healthy = await this.huggingFaceService.healthCheck();
      const metrics = this.aiMonitoringService.getMetrics();

      return {
        ai_services_readiness: {
          status: healthy ? 'up' : 'down',
          message: healthy
            ? 'AI services are ready to serve requests'
            : 'AI services are not ready',
          details: {
            huggingFaceHealthy: healthy,
            totalRequests: metrics.totalRequests,
            successRate: metrics.successRate,
            averageResponseTime: metrics.averageResponseTime,
            rateLimitHits: metrics.rateLimitHits,
          },
        },
      };
    } catch (error) {
      return {
        ai_services_readiness: {
          status: 'down',
          message: `AI services readiness check failed: ${error.message}`,
        },
      };
    }
  }
}
