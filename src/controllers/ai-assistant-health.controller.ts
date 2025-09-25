import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import {
  AIAssistantMonitoringService,
  AlertRule,
  HealthCheckResult,
  DiagnosticInfo,
} from '../services/ai-assistant-monitoring.service';
import { AIAssistantErrorRecoveryService } from '../services/ai-assistant-error-recovery.service';

export class CreateAlertRuleDto {
  name: string;
  condition: {
    type:
      | 'error_rate'
      | 'response_time'
      | 'consecutive_failures'
      | 'circuit_breaker'
      | 'service_unavailable';
    threshold: number;
    duration?: number;
    comparison: 'greater_than' | 'less_than' | 'equals';
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
}

export class UpdateAlertRuleDto {
  name?: string;
  condition?: {
    type?:
      | 'error_rate'
      | 'response_time'
      | 'consecutive_failures'
      | 'circuit_breaker'
      | 'service_unavailable';
    threshold?: number;
    duration?: number;
    comparison?: 'greater_than' | 'less_than' | 'equals';
  };
  severity?: 'low' | 'medium' | 'high' | 'critical';
  enabled?: boolean;
  cooldownMinutes?: number;
}

@ApiTags('AI Assistant Health')
@Controller('ai-assistant/health')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AIAssistantHealthController {
  constructor(
    private readonly monitoringService: AIAssistantMonitoringService,
    private readonly errorRecoveryService: AIAssistantErrorRecoveryService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get overall AI assistant health status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health status retrieved successfully',
  })
  async getOverallHealthStatus() {
    const healthChecks = await this.monitoringService.performAllHealthChecks();
    const activeAlerts = this.monitoringService.getActiveAlerts();

    const overallStatus = this.determineOverallStatus(healthChecks);

    return {
      status: overallStatus,
      timestamp: new Date(),
      services: healthChecks.length,
      healthyServices: healthChecks.filter((h) => h.status === 'healthy')
        .length,
      activeAlerts: activeAlerts.length,
      criticalAlerts: activeAlerts.filter((a) => a.severity === 'critical')
        .length,
      checks: healthChecks,
    };
  }

  @Get('services')
  @ApiOperation({ summary: 'Get health status for all services' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service health statuses retrieved successfully',
  })
  async getAllServiceHealth(): Promise<HealthCheckResult[]> {
    return await this.monitoringService.performAllHealthChecks();
  }

  @Get('services/:serviceName')
  @ApiOperation({ summary: 'Get health status for a specific service' })
  @ApiParam({
    name: 'serviceName',
    description: 'Name of the service to check',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service health status retrieved successfully',
  })
  async getServiceHealth(
    @Param('serviceName') serviceName: string,
  ): Promise<HealthCheckResult> {
    return await this.monitoringService.performHealthCheck(serviceName);
  }

  @Get('services/:serviceName/diagnostics')
  @ApiOperation({
    summary: 'Get comprehensive diagnostic information for a service',
  })
  @ApiParam({
    name: 'serviceName',
    description: 'Name of the service to diagnose',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Diagnostic information retrieved successfully',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async getServiceDiagnostics(
    @Param('serviceName') serviceName: string,
  ): Promise<DiagnosticInfo> {
    return await this.monitoringService.getDiagnosticInfo(serviceName);
  }

  @Get('services/:serviceName/metrics')
  @ApiOperation({ summary: 'Get metrics for a specific service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service metrics retrieved successfully',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async getServiceMetrics(@Param('serviceName') serviceName: string) {
    return this.monitoringService.getServiceMetrics(serviceName);
  }

  @Post('services/:serviceName/circuit-breaker/open')
  @ApiOperation({ summary: 'Manually open circuit breaker for a service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiQuery({
    name: 'duration',
    description: 'Duration in milliseconds',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Circuit breaker opened successfully',
  })
  @Roles(UserRole.ADMIN)
  async openCircuitBreaker(
    @Param('serviceName') serviceName: string,
    @Query('duration') duration?: number,
  ) {
    this.errorRecoveryService.openCircuitBreaker(serviceName, duration);
    return {
      message: `Circuit breaker opened for service: ${serviceName}`,
      duration: duration || 60000,
      resetTime: new Date(Date.now() + (duration || 60000)),
    };
  }

  @Post('services/:serviceName/circuit-breaker/close')
  @ApiOperation({ summary: 'Manually close circuit breaker for a service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Circuit breaker closed successfully',
  })
  @Roles(UserRole.ADMIN)
  async closeCircuitBreaker(@Param('serviceName') serviceName: string) {
    this.errorRecoveryService.closeCircuitBreaker(serviceName);
    return {
      message: `Circuit breaker closed for service: ${serviceName}`,
    };
  }

  @Post('services/:serviceName/reset')
  @ApiOperation({ summary: 'Reset health status for a service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service health reset successfully',
  })
  @Roles(UserRole.ADMIN)
  async resetServiceHealth(@Param('serviceName') serviceName: string) {
    this.errorRecoveryService.resetServiceHealth(serviceName);
    return {
      message: `Health status reset for service: ${serviceName}`,
    };
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get all alerts' })
  @ApiQuery({
    name: 'active',
    description: 'Filter for active alerts only',
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alerts retrieved successfully',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async getAlerts(@Query('active') activeOnly?: string) {
    if (activeOnly === 'true') {
      return this.monitoringService.getActiveAlerts();
    }
    return this.monitoringService.getAllAlerts();
  }

  @Post('alerts/:alertId/resolve')
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiParam({ name: 'alertId', description: 'ID of the alert to resolve' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert resolved successfully',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async resolveAlert(@Param('alertId') alertId: string) {
    const resolved = this.monitoringService.resolveAlert(alertId);

    if (!resolved) {
      return {
        success: false,
        message: 'Alert not found or already resolved',
      };
    }

    return {
      success: true,
      message: `Alert ${alertId} resolved successfully`,
    };
  }

  @Get('alert-rules')
  @ApiOperation({ summary: 'Get all alert rules' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert rules retrieved successfully',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async getAlertRules(): Promise<AlertRule[]> {
    return this.monitoringService.getAlertRules();
  }

  @Post('alert-rules')
  @ApiOperation({ summary: 'Create a new alert rule' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Alert rule created successfully',
  })
  @Roles(UserRole.ADMIN)
  async createAlertRule(
    @Body() createDto: CreateAlertRuleDto,
  ): Promise<AlertRule> {
    return this.monitoringService.createAlertRule(createDto);
  }

  @Put('alert-rules/:ruleId')
  @ApiOperation({ summary: 'Update an alert rule' })
  @ApiParam({ name: 'ruleId', description: 'ID of the alert rule to update' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert rule updated successfully',
  })
  @Roles(UserRole.ADMIN)
  async updateAlertRule(
    @Param('ruleId') ruleId: string,
    @Body() updateDto: UpdateAlertRuleDto,
  ) {
    const updatedRule = this.monitoringService.updateAlertRule(
      ruleId,
      updateDto as any,
    );

    if (!updatedRule) {
      return {
        success: false,
        message: 'Alert rule not found',
      };
    }

    return {
      success: true,
      rule: updatedRule,
    };
  }

  @Delete('alert-rules/:ruleId')
  @ApiOperation({ summary: 'Delete an alert rule' })
  @ApiParam({ name: 'ruleId', description: 'ID of the alert rule to delete' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert rule deleted successfully',
  })
  @Roles(UserRole.ADMIN)
  async deleteAlertRule(@Param('ruleId') ruleId: string) {
    const deleted = this.monitoringService.deleteAlertRule(ruleId);

    if (!deleted) {
      return {
        success: false,
        message: 'Alert rule not found',
      };
    }

    return {
      success: true,
      message: `Alert rule ${ruleId} deleted successfully`,
    };
  }

  @Get('configuration')
  @ApiOperation({ summary: 'Get monitoring configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration retrieved successfully',
  })
  @Roles(UserRole.ADMIN)
  async getConfiguration() {
    return {
      monitoring: this.monitoringService.getConfiguration(),
      errorRecovery: this.errorRecoveryService.getRetryConfiguration(),
    };
  }

  @Put('configuration/monitoring')
  @ApiOperation({ summary: 'Update monitoring configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Monitoring configuration updated successfully',
  })
  @Roles(UserRole.ADMIN)
  async updateMonitoringConfiguration(@Body() updates: any) {
    this.monitoringService.updateConfiguration(updates);
    return {
      success: true,
      message: 'Monitoring configuration updated successfully',
      configuration: this.monitoringService.getConfiguration(),
    };
  }

  @Put('configuration/error-recovery')
  @ApiOperation({ summary: 'Update error recovery configuration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Error recovery configuration updated successfully',
  })
  @Roles(UserRole.ADMIN)
  async updateErrorRecoveryConfiguration(@Body() updates: any) {
    this.errorRecoveryService.updateRetryConfiguration(updates);
    return {
      success: true,
      message: 'Error recovery configuration updated successfully',
      configuration: this.errorRecoveryService.getRetryConfiguration(),
    };
  }

  @Get('recommendations/:serviceName')
  @ApiOperation({ summary: 'Get recovery recommendations for a service' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recommendations retrieved successfully',
  })
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async getRecoveryRecommendations(@Param('serviceName') serviceName: string) {
    const recommendations =
      this.errorRecoveryService.getRecoveryRecommendations(serviceName);
    const health = this.errorRecoveryService.getServiceHealth(serviceName);

    return {
      serviceName,
      health,
      recommendations,
      timestamp: new Date(),
    };
  }

  /**
   * Determine overall system status based on individual service health
   */
  private determineOverallStatus(healthChecks: HealthCheckResult[]): string {
    if (healthChecks.length === 0) {
      return 'unknown';
    }

    const criticalCount = healthChecks.filter(
      (h) => h.status === 'critical',
    ).length;
    const unhealthyCount = healthChecks.filter(
      (h) => h.status === 'unhealthy',
    ).length;
    const degradedCount = healthChecks.filter(
      (h) => h.status === 'degraded',
    ).length;

    if (criticalCount > 0) {
      return 'critical';
    }

    if (unhealthyCount > 0) {
      return 'unhealthy';
    }

    if (degradedCount > 0) {
      return 'degraded';
    }

    return 'healthy';
  }
}
