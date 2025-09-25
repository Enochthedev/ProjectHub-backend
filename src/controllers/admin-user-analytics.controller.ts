import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminUserAnalyticsService } from '../services/admin-user-analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import {
  UserAnalyticsQueryDto,
  UserReportOptionsDto,
  UserGrowthAnalyticsDto,
  UserActivityMetricsDto,
  UserEngagementMetricsDto,
  UserDemographicAnalysisDto,
  ComprehensiveUserReportDto,
} from '../dto/admin/user-analytics.dto';

/**
 * Admin User Analytics Controller
 *
 * Provides comprehensive user analytics and reporting endpoints including:
 * - User growth analytics and trend analysis
 * - User activity monitoring and engagement metrics
 * - User demographic analysis and insights
 * - Comprehensive reporting with customizable metrics
 * - Performance optimized analytics queries
 */
@ApiTags('Admin - User Analytics')
@ApiBearerAuth('JWT-auth')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AdminUserAnalyticsController {
  constructor(private readonly analyticsService: AdminUserAnalyticsService) {}

  /**
   * Get user growth analytics
   * GET /admin/analytics/growth
   */
  @ApiOperation({
    summary: 'Get user growth analytics',
    description:
      'Retrieves comprehensive user growth analytics including trends, registrations, and role distribution.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: 'string',
    description: 'Start date for analytics period',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: 'string',
    description: 'End date for analytics period',
    example: '2024-12-31T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Growth analytics retrieved successfully',
    type: UserGrowthAnalyticsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @Get('growth')
  async getUserGrowthAnalytics(
    @Query() query: UserAnalyticsQueryDto,
  ): Promise<UserGrowthAnalyticsDto> {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    return this.analyticsService.getUserGrowthAnalytics(startDate, endDate);
  }

  /**
   * Get user activity metrics
   * GET /admin/analytics/activity
   */
  @ApiOperation({
    summary: 'Get user activity metrics',
    description:
      'Retrieves user activity metrics including active user counts, top users, and activity patterns.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: 'string',
    description: 'Start date for analytics period',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: 'string',
    description: 'End date for analytics period',
    example: '2024-12-31T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity metrics retrieved successfully',
    type: UserActivityMetricsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @Get('activity')
  async getUserActivityMetrics(
    @Query() query: UserAnalyticsQueryDto,
  ): Promise<UserActivityMetricsDto> {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    return this.analyticsService.getUserActivityMetrics(startDate, endDate);
  }

  /**
   * Get user engagement metrics
   * GET /admin/analytics/engagement
   */
  @ApiOperation({
    summary: 'Get user engagement metrics',
    description:
      'Retrieves user engagement metrics including profile completion rates, retention, and role-based engagement.',
  })
  @ApiResponse({
    status: 200,
    description: 'Engagement metrics retrieved successfully',
    type: UserEngagementMetricsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @Get('engagement')
  async getUserEngagementMetrics(): Promise<UserEngagementMetricsDto> {
    return this.analyticsService.getUserEngagementMetrics();
  }

  /**
   * Get user demographic analysis
   * GET /admin/analytics/demographics
   */
  @ApiOperation({
    summary: 'Get user demographic analysis',
    description:
      'Retrieves comprehensive demographic analysis including role distribution, student analytics, and supervisor analytics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Demographic analysis retrieved successfully',
    type: UserDemographicAnalysisDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @Get('demographics')
  async getUserDemographicAnalysis(): Promise<UserDemographicAnalysisDto> {
    return this.analyticsService.getUserDemographicAnalysis();
  }

  /**
   * Generate comprehensive user report
   * POST /admin/analytics/report
   */
  @ApiOperation({
    summary: 'Generate comprehensive user report',
    description:
      'Generates a comprehensive user analytics report with customizable metrics and time periods.',
  })
  @ApiBody({
    type: UserReportOptionsDto,
    description: 'Report generation options',
    examples: {
      basic: {
        summary: 'Basic monthly report',
        value: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
          metrics: ['growth', 'activity'],
          groupBy: 'day',
        },
      },
      comprehensive: {
        summary: 'Comprehensive quarterly report',
        value: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-03-31T23:59:59Z',
          role: 'student',
          includeInactive: false,
          metrics: ['growth', 'activity', 'engagement', 'demographics'],
          groupBy: 'week',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Report generated successfully',
    type: ComprehensiveUserReportDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid report options',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @Post('report')
  @HttpCode(HttpStatus.CREATED)
  async generateComprehensiveReport(
    @Body() options: UserReportOptionsDto,
  ): Promise<ComprehensiveUserReportDto> {
    const processedOptions = {
      ...options,
      startDate: options.startDate ? new Date(options.startDate) : undefined,
      endDate: options.endDate ? new Date(options.endDate) : undefined,
    };

    return this.analyticsService.generateComprehensiveReport(processedOptions);
  }

  /**
   * Get analytics dashboard summary
   * GET /admin/analytics/dashboard
   */
  @ApiOperation({
    summary: 'Get analytics dashboard summary',
    description:
      'Retrieves a summary of key metrics for the admin analytics dashboard.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalUsers: { type: 'number', example: 1250 },
        activeUsers: { type: 'number', example: 1180 },
        newUsersToday: { type: 'number', example: 15 },
        newUsersThisWeek: { type: 'number', example: 85 },
        newUsersThisMonth: { type: 'number', example: 320 },
        profileCompletionRate: { type: 'number', example: 85.5 },
        emailVerificationRate: { type: 'number', example: 92.3 },
        topActiveUsers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              activityScore: { type: 'number' },
            },
          },
        },
        roleDistribution: {
          type: 'object',
          properties: {
            student: { type: 'number', example: 1000 },
            supervisor: { type: 'number', example: 200 },
            admin: { type: 'number', example: 50 },
          },
        },
        recentTrend: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', example: '2024-01-15' },
              newUsers: { type: 'number', example: 25 },
              activeUsers: { type: 'number', example: 450 },
            },
          },
        },
      },
    },
  })
  @Get('dashboard')
  async getAnalyticsDashboard(): Promise<any> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get all analytics in parallel for better performance
    const [
      growthAnalytics,
      activityMetrics,
      engagementMetrics,
      demographicAnalysis,
    ] = await Promise.all([
      this.analyticsService.getUserGrowthAnalytics(last7Days, now),
      this.analyticsService.getUserActivityMetrics(last7Days, now),
      this.analyticsService.getUserEngagementMetrics(),
      this.analyticsService.getUserDemographicAnalysis(),
    ]);

    // Extract key metrics for dashboard
    const dashboard = {
      totalUsers: growthAnalytics.totalUsers,
      activeUsers: growthAnalytics.activeUsers,
      newUsersToday: growthAnalytics.growthTrend
        .filter((trend) => trend.date === today.toISOString().split('T')[0])
        .reduce((sum, trend) => sum + trend.newUsers, 0),
      newUsersThisWeek: growthAnalytics.growthTrend.reduce(
        (sum, trend) => sum + trend.newUsers,
        0,
      ),
      newUsersThisMonth: growthAnalytics.registrationsByMonth
        .filter((reg) =>
          reg.month.startsWith(thisMonth.toISOString().slice(0, 7)),
        )
        .reduce((sum, reg) => sum + reg.count, 0),
      profileCompletionRate: engagementMetrics.profileCompletionRate,
      emailVerificationRate: engagementMetrics.emailVerificationRate,
      topActiveUsers: activityMetrics.topActiveUsers.slice(0, 5),
      roleDistribution: growthAnalytics.usersByRole,
      recentTrend: growthAnalytics.growthTrend.slice(-7), // Last 7 days
    };

    return dashboard;
  }

  /**
   * Get user analytics summary for specific role
   * GET /admin/analytics/role/:role
   */
  @ApiOperation({
    summary: 'Get analytics summary for specific role',
    description: 'Retrieves analytics summary filtered by user role.',
  })
  @ApiQuery({
    name: 'role',
    required: true,
    enum: UserRole,
    description: 'User role to analyze',
  })
  @ApiResponse({
    status: 200,
    description: 'Role-specific analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['student', 'supervisor', 'admin'] },
        totalUsers: { type: 'number', example: 1000 },
        activeUsers: { type: 'number', example: 950 },
        profileCompletionRate: { type: 'number', example: 88.5 },
        averageCompleteness: { type: 'number', example: 82.1 },
        recentGrowth: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', example: '2024-01-15' },
              newUsers: { type: 'number', example: 20 },
            },
          },
        },
        specificMetrics: { type: 'object' },
      },
    },
  })
  @Get('role/:role')
  async getRoleAnalytics(@Query('role') role: UserRole): Promise<any> {
    const [growthAnalytics, engagementMetrics, demographicAnalysis] =
      await Promise.all([
        this.analyticsService.getUserGrowthAnalytics(),
        this.analyticsService.getUserEngagementMetrics(),
        this.analyticsService.getUserDemographicAnalysis(),
      ]);

    const roleEngagement = engagementMetrics.engagementByRole[role];
    const roleDistribution = demographicAnalysis.roleDistribution.find(
      (r) => r.role === role,
    );

    let specificMetrics = {};
    if (role === UserRole.STUDENT) {
      specificMetrics = demographicAnalysis.studentAnalytics;
    } else if (role === UserRole.SUPERVISOR) {
      specificMetrics = demographicAnalysis.supervisorAnalytics;
    }

    return {
      role,
      totalUsers: roleDistribution?.count || 0,
      activeUsers: roleEngagement?.activeUsers || 0,
      profileCompletionRate: roleEngagement?.profileCompletionRate || 0,
      averageCompleteness: roleEngagement?.averageCompleteness || 0,
      recentGrowth: growthAnalytics.registrationsByMonth
        .filter((reg) => reg.role === role)
        .slice(-7),
      specificMetrics,
    };
  }
}
