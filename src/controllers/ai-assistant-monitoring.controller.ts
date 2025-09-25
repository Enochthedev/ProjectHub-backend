import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

import { AIAssistantAnalyticsService } from '../services/ai-assistant-analytics.service';
import { AIAssistantDashboardService } from '../services/ai-assistant-dashboard.service';
import { AIAssistantMonitoringService } from '../services/ai-assistant-monitoring.service';
import { AIMonitoringService } from '../services/ai-monitoring.service';
import { AILoggingService } from '../services/ai-logging.service';

@ApiTags('AI Assistant Monitoring')
@Controller('ai-assistant/monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AIAssistantMonitoringController {
  constructor(
    private readonly analyticsService: AIAssistantAnalyticsService,
    private readonly dashboardService: AIAssistantDashboardService,
    private readonly monitoringService: AIAssistantMonitoringService,
    private readonly aiMonitoringService: AIMonitoringService,
    private readonly loggingService: AILoggingService,
  ) {}

  // ===== Dashboard Endpoints =====

  @Get('dashboard/metrics')
  @ApiOperation({
    summary: 'Get dashboard metrics',
    description:
      'Retrieves comprehensive dashboard metrics for AI assistant monitoring',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard metrics retrieved successfully',
  })
  async getDashboardMetrics(@Request() req: any) {
    return this.dashboardService.getDashboardMetrics();
  }

  @Get('dashboard/charts')
  @ApiOperation({
    summary: 'Get dashboard chart data',
    description: 'Retrieves chart data for dashboard visualizations',
  })
  @ApiQuery({
    name: 'period',
    enum: ['hour', 'day', 'week', 'month'],
    required: false,
    description: 'Time period for chart data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chart data retrieved successfully',
  })
  async getDashboardCharts(
    @Query('period') period: 'hour' | 'day' | 'week' | 'month' = 'day',
  ) {
    return this.dashboardService.getDashboardChartData(period);
  }

  @Get('dashboard/real-time')
  @ApiOperation({
    summary: 'Get real-time metrics',
    description:
      'Retrieves real-time metrics without caching for live monitoring',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Real-time metrics retrieved successfully',
  })
  async getRealTimeMetrics() {
    return this.dashboardService.getRealTimeMetrics();
  }

  @Get('dashboard/export')
  @ApiOperation({
    summary: 'Export dashboard data',
    description: 'Exports dashboard data in specified format',
  })
  @ApiQuery({
    name: 'format',
    enum: ['json', 'csv'],
    required: false,
    description: 'Export format',
  })
  @ApiQuery({
    name: 'period',
    enum: ['day', 'week', 'month'],
    required: false,
    description: 'Time period for export',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard data exported successfully',
  })
  async exportDashboardData(
    @Query('format') format: 'json' | 'csv' = 'json',
    @Query('period') period: 'day' | 'week' | 'month' = 'day',
  ) {
    const data = await this.dashboardService.exportDashboardData(
      format,
      period,
    );

    return {
      format,
      period,
      data,
      generatedAt: new Date(),
    };
  }

  // ===== Analytics Endpoints =====

  @Get('analytics/comprehensive')
  @ApiOperation({
    summary: 'Get comprehensive analytics',
    description:
      'Generates comprehensive analytics for a specified time period',
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Start date (ISO string)',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'End date (ISO string)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comprehensive analytics generated successfully',
  })
  async getComprehensiveAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    return this.analyticsService.generateComprehensiveAnalytics(start, end);
  }

  @Get('analytics/conversations')
  @ApiOperation({
    summary: 'Get conversation analytics',
    description: 'Retrieves detailed conversation analytics',
  })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversation analytics retrieved successfully',
  })
  async getConversationAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    return this.analyticsService.getConversationAnalytics(start, end);
  }

  @Get('analytics/messages')
  @ApiOperation({
    summary: 'Get message analytics',
    description: 'Retrieves detailed message analytics',
  })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Message analytics retrieved successfully',
  })
  async getMessageAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    return this.analyticsService.getMessageAnalytics(start, end);
  }

  @Get('analytics/quality')
  @ApiOperation({
    summary: 'Get quality analytics',
    description:
      'Retrieves AI response quality and user satisfaction analytics',
  })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quality analytics retrieved successfully',
  })
  async getQualityAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    return this.analyticsService.getQualityAnalytics(start, end);
  }

  @Get('analytics/usage')
  @ApiOperation({
    summary: 'Get usage analytics',
    description: 'Retrieves user engagement and usage pattern analytics',
  })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usage analytics retrieved successfully',
  })
  async getUsageAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    return this.analyticsService.getUsageAnalytics(start, end);
  }

  @Get('analytics/performance')
  @ApiOperation({
    summary: 'Get performance analytics',
    description: 'Retrieves system performance and response time analytics',
  })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance analytics retrieved successfully',
  })
  async getPerformanceAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    return this.analyticsService.getPerformanceAnalytics(start, end);
  }

  @Get('analytics/content')
  @ApiOperation({
    summary: 'Get content analytics',
    description: 'Retrieves knowledge base and template usage analytics',
  })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content analytics retrieved successfully',
  })
  async getContentAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    return this.analyticsService.getContentAnalytics(start, end);
  }

  // ===== Health Monitoring Endpoints =====

  @Get('health/status')
  @ApiOperation({
    summary: 'Get system health status',
    description:
      'Retrieves current system health status and service availability',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System health status retrieved successfully',
  })
  async getSystemHealth() {
    return this.dashboardService.getSystemStatus();
  }

  @Get('health/checks')
  @ApiOperation({
    summary: 'Perform health checks',
    description: 'Performs health checks on all monitored services',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health checks completed successfully',
  })
  async performHealthChecks() {
    return this.monitoringService.performAllHealthChecks();
  }

  @Get('health/service/:serviceName')
  @ApiOperation({
    summary: 'Get service health',
    description: 'Retrieves health status for a specific service',
  })
  @ApiParam({
    name: 'serviceName',
    description: 'Name of the service to check',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service health retrieved successfully',
  })
  async getServiceHealth(@Param('serviceName') serviceName: string) {
    return this.monitoringService.performHealthCheck(serviceName);
  }

  @Get('health/diagnostics/:serviceName')
  @ApiOperation({
    summary: 'Get service diagnostics',
    description: 'Retrieves detailed diagnostic information for a service',
  })
  @ApiParam({ name: 'serviceName', description: 'Name of the service' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service diagnostics retrieved successfully',
  })
  async getServiceDiagnostics(@Param('serviceName') serviceName: string) {
    return this.monitoringService.getDiagnosticInfo(serviceName);
  }

  // ===== Alert Management Endpoints =====

  @Get('alerts')
  @ApiOperation({
    summary: 'Get alerts',
    description: 'Retrieves system alerts with optional filtering',
  })
  @ApiQuery({ name: 'active', type: Boolean, required: false })
  @ApiQuery({
    name: 'severity',
    enum: ['low', 'medium', 'high', 'critical'],
    required: false,
  })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alerts retrieved successfully',
  })
  async getAlerts(
    @Query('active') active?: boolean,
    @Query('severity') severity?: string,
    @Query('limit') limit?: number,
  ) {
    const allAlerts =
      active !== false
        ? this.monitoringService.getActiveAlerts()
        : this.monitoringService.getAllAlerts();

    let filteredAlerts = allAlerts;

    if (severity) {
      filteredAlerts = filteredAlerts.filter(
        (alert) => alert.severity === severity,
      );
    }

    if (limit) {
      filteredAlerts = filteredAlerts.slice(0, limit);
    }

    return {
      alerts: filteredAlerts,
      total: filteredAlerts.length,
      summary: await this.dashboardService.getAlertSummary(),
    };
  }

  @Post('alerts/:alertId/resolve')
  @ApiOperation({
    summary: 'Resolve alert',
    description: 'Marks an alert as resolved',
  })
  @ApiParam({ name: 'alertId', description: 'Alert ID to resolve' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert resolved successfully',
  })
  async resolveAlert(@Param('alertId') alertId: string) {
    const resolved = this.monitoringService.resolveAlert(alertId);

    return {
      success: resolved,
      message: resolved
        ? 'Alert resolved successfully'
        : 'Alert not found or already resolved',
      alertId,
      resolvedAt: resolved ? new Date() : null,
    };
  }

  @Get('alerts/rules')
  @ApiOperation({
    summary: 'Get alert rules',
    description: 'Retrieves all configured alert rules',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert rules retrieved successfully',
  })
  async getAlertRules() {
    return this.monitoringService.getAlertRules();
  }

  @Post('alerts/rules')
  @ApiOperation({
    summary: 'Create alert rule',
    description: 'Creates a new alert rule',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Alert rule created successfully',
  })
  async createAlertRule(@Body() ruleData: any) {
    return this.monitoringService.createAlertRule(ruleData);
  }

  @Put('alerts/rules/:ruleId')
  @ApiOperation({
    summary: 'Update alert rule',
    description: 'Updates an existing alert rule',
  })
  @ApiParam({ name: 'ruleId', description: 'Alert rule ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert rule updated successfully',
  })
  async updateAlertRule(@Param('ruleId') ruleId: string, @Body() updates: any) {
    return this.monitoringService.updateAlertRule(ruleId, updates);
  }

  @Delete('alerts/rules/:ruleId')
  @ApiOperation({
    summary: 'Delete alert rule',
    description: 'Deletes an alert rule',
  })
  @ApiParam({ name: 'ruleId', description: 'Alert rule ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Alert rule deleted successfully',
  })
  async deleteAlertRule(@Param('ruleId') ruleId: string) {
    const deleted = this.monitoringService.deleteAlertRule(ruleId);

    return {
      success: deleted,
      message: deleted
        ? 'Alert rule deleted successfully'
        : 'Alert rule not found',
    };
  }

  // ===== Performance Monitoring Endpoints =====

  @Get('performance/metrics')
  @ApiOperation({
    summary: 'Get performance metrics',
    description: 'Retrieves current AI service performance metrics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance metrics retrieved successfully',
  })
  async getPerformanceMetrics() {
    return this.aiMonitoringService.getMetrics();
  }

  @Get('performance/report')
  @ApiOperation({
    summary: 'Generate performance report',
    description:
      'Generates a comprehensive performance report for a specified period',
  })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance report generated successfully',
  })
  async generatePerformanceReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    return this.dashboardService.generatePerformanceReport(start, end);
  }

  @Get('performance/logs')
  @ApiOperation({
    summary: 'Get performance logs',
    description: 'Retrieves AI operation logs with optional filtering',
  })
  @ApiQuery({ name: 'operation', type: String, required: false })
  @ApiQuery({ name: 'userId', type: String, required: false })
  @ApiQuery({ name: 'success', type: Boolean, required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance logs retrieved successfully',
  })
  async getPerformanceLogs(
    @Query('operation') operation?: string,
    @Query('userId') userId?: string,
    @Query('success') success?: boolean,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ) {
    const criteria = {
      operation,
      userId,
      success,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit || 100,
    };

    return this.loggingService.searchLogs(criteria);
  }

  @Get('performance/export-logs')
  @ApiOperation({
    summary: 'Export performance logs',
    description: 'Exports performance logs in specified format',
  })
  @ApiQuery({ name: 'format', enum: ['json', 'csv'], required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance logs exported successfully',
  })
  async exportPerformanceLogs(
    @Query('format') format: 'json' | 'csv' = 'json',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const criteria = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      includeMetadata: true,
    };

    const data = await this.loggingService.exportLogs(format, criteria);

    return {
      format,
      data,
      generatedAt: new Date(),
      criteria,
    };
  }

  // ===== Configuration Endpoints =====

  @Get('config')
  @ApiOperation({
    summary: 'Get monitoring configuration',
    description: 'Retrieves current monitoring configuration settings',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Monitoring configuration retrieved successfully',
  })
  async getMonitoringConfig() {
    return this.monitoringService.getConfiguration();
  }

  @Put('config')
  @ApiOperation({
    summary: 'Update monitoring configuration',
    description: 'Updates monitoring configuration settings',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Monitoring configuration updated successfully',
  })
  async updateMonitoringConfig(@Body() config: any) {
    this.monitoringService.updateConfiguration(config);

    return {
      success: true,
      message: 'Monitoring configuration updated successfully',
      updatedAt: new Date(),
    };
  }

  // ===== Utility Endpoints =====

  @Post('reset-metrics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Reset metrics',
    description: 'Resets monitoring metrics (admin only)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Metrics reset successfully',
  })
  async resetMetrics() {
    this.aiMonitoringService.resetMetrics();

    return {
      success: true,
      message: 'Monitoring metrics reset successfully',
      resetAt: new Date(),
    };
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get monitoring service status',
    description: 'Retrieves the status of the monitoring service itself',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Monitoring service status retrieved successfully',
  })
  async getMonitoringStatus() {
    return {
      status: 'operational',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date(),
      services: {
        analytics: 'operational',
        monitoring: 'operational',
        dashboard: 'operational',
        logging: 'operational',
      },
    };
  }
}
