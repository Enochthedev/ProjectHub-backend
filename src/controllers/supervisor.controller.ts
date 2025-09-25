import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SupervisorReportingService } from '../services/supervisor-reporting.service';
import {
  SupervisorDashboardDto,
  StudentProgressSummaryDto,
  AtRiskStudentDto,
  SupervisorReportDto,
  ProgressReportFiltersDto,
  ExportableReportDto,
  StudentMilestoneOverviewDto,
  SupervisorAnalyticsDto,
} from '../dto/milestone/supervisor-reporting.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { MilestoneStatus } from '../common/enums/milestone-status.enum';
import { Priority } from '../common/enums/priority.enum';

@ApiTags('supervisor')
@ApiBearerAuth('JWT-auth')
@Controller('supervisor')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupervisorController {
  constructor(
    private readonly supervisorReportingService: SupervisorReportingService,
  ) {}

  @Get('dashboard')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get supervisor dashboard',
    description:
      'Get comprehensive dashboard with overview of all supervised students progress',
  })
  @ApiResponse({
    status: 200,
    description: 'Supervisor dashboard retrieved successfully',
    type: SupervisorDashboardDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Only supervisors and admins can access this endpoint',
  })
  async getSupervisorDashboard(
    @Request() req: any,
  ): Promise<SupervisorDashboardDto> {
    try {
      return await this.supervisorReportingService.getSupervisorDashboard(
        req.user.id,
      );
    } catch (error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('invalid role')
      ) {
        throw new ForbiddenException('Supervisor access required');
      }
      throw error;
    }
  }

  @Get('students/progress')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get students progress overview',
    description:
      'Get progress summaries for all supervised students with completion rates and risk assessment',
  })
  @ApiResponse({
    status: 200,
    description: 'Student progress summaries retrieved successfully',
    type: [StudentProgressSummaryDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Only supervisors and admins can access this endpoint',
  })
  async getStudentsProgress(
    @Request() req: any,
  ): Promise<StudentProgressSummaryDto[]> {
    try {
      return await this.supervisorReportingService.getStudentProgressSummaries(
        req.user.id,
      );
    } catch (error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('invalid role')
      ) {
        throw new ForbiddenException('Supervisor access required');
      }
      throw error;
    }
  }

  @Get('students/:studentId/overview')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get detailed student milestone overview',
    description:
      "Get comprehensive overview of a specific student's milestones and progress",
  })
  @ApiResponse({
    status: 200,
    description: 'Student milestone overview retrieved successfully',
    type: StudentMilestoneOverviewDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'Supervisor does not have access to this student or invalid role',
  })
  @ApiResponse({
    status: 404,
    description: 'Student not found',
  })
  @ApiParam({ name: 'studentId', description: 'Student UUID' })
  async getStudentMilestoneOverview(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Request() req: any,
  ): Promise<StudentMilestoneOverviewDto> {
    try {
      return await this.supervisorReportingService.getStudentMilestoneOverview(
        req.user.id,
        studentId,
      );
    } catch (error) {
      if (error.message.includes('does not have access')) {
        throw new ForbiddenException('You do not have access to this student');
      }
      if (error.message.includes('not found')) {
        throw new BadRequestException('Student not found');
      }
      throw error;
    }
  }

  @Get('alerts')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get at-risk student notifications',
    description:
      'Get list of students who need attention due to overdue milestones, blocked progress, or low completion rates',
  })
  @ApiResponse({
    status: 200,
    description: 'At-risk student alerts retrieved successfully',
    type: [AtRiskStudentDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Only supervisors and admins can access this endpoint',
  })
  async getAtRiskStudentAlerts(
    @Request() req: any,
  ): Promise<AtRiskStudentDto[]> {
    try {
      return await this.supervisorReportingService.identifyAtRiskStudents(
        req.user.id,
      );
    } catch (error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('invalid role')
      ) {
        throw new ForbiddenException('Supervisor access required');
      }
      throw error;
    }
  }

  @Get('reports')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Generate exportable progress reports',
    description:
      'Generate comprehensive progress reports with filtering options for academic records',
  })
  @ApiResponse({
    status: 200,
    description: 'Progress report generated successfully',
    type: SupervisorReportDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid filter parameters',
  })
  @ApiResponse({
    status: 403,
    description: 'Only supervisors and admins can access this endpoint',
  })
  @ApiQuery({
    name: 'studentIds',
    required: false,
    type: [String],
    description: 'Filter by specific student IDs',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for milestone filtering (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for milestone filtering (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: MilestoneStatus,
    description: 'Filter by milestone status',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: Priority,
    description: 'Filter by milestone priority',
  })
  async generateProgressReport(
    @Request() req: any,
    @Query() filters: ProgressReportFiltersDto,
  ): Promise<SupervisorReportDto> {
    try {
      // Validate date formats if provided
      if (filters.startDate && !this.isValidDateString(filters.startDate)) {
        throw new BadRequestException(
          'Invalid start date format. Use YYYY-MM-DD',
        );
      }

      if (filters.endDate && !this.isValidDateString(filters.endDate)) {
        throw new BadRequestException(
          'Invalid end date format. Use YYYY-MM-DD',
        );
      }

      // Validate date range
      if (filters.startDate && filters.endDate) {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);

        if (startDate > endDate) {
          throw new BadRequestException('Start date cannot be after end date');
        }
      }

      return await this.supervisorReportingService.generateProgressReport(
        req.user.id,
        filters,
      );
    } catch (error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('invalid role')
      ) {
        throw new ForbiddenException('Supervisor access required');
      }
      if (
        error.message.includes('Invalid') ||
        error.message.includes('format')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('reports/export')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Export progress reports',
    description:
      'Export progress reports in PDF or CSV format for academic record keeping',
  })
  @ApiResponse({
    status: 200,
    description: 'Report exported successfully',
    type: ExportableReportDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid export parameters or format',
  })
  @ApiResponse({
    status: 403,
    description: 'Only supervisors and admins can access this endpoint',
  })
  @ApiQuery({
    name: 'format',
    required: true,
    enum: ['pdf', 'csv'],
    description: 'Export format',
  })
  @ApiQuery({
    name: 'studentIds',
    required: false,
    type: [String],
    description: 'Filter by specific student IDs',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for milestone filtering (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for milestone filtering (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: MilestoneStatus,
    description: 'Filter by milestone status',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: Priority,
    description: 'Filter by milestone priority',
  })
  async exportProgressReport(
    @Request() req: any,
    @Query('format') format: 'pdf' | 'csv',
    @Query() filters: ProgressReportFiltersDto,
  ): Promise<ExportableReportDto> {
    try {
      // Validate format
      if (!format || !['pdf', 'csv'].includes(format)) {
        throw new BadRequestException('Format must be either "pdf" or "csv"');
      }

      // Validate date formats if provided
      if (filters.startDate && !this.isValidDateString(filters.startDate)) {
        throw new BadRequestException(
          'Invalid start date format. Use YYYY-MM-DD',
        );
      }

      if (filters.endDate && !this.isValidDateString(filters.endDate)) {
        throw new BadRequestException(
          'Invalid end date format. Use YYYY-MM-DD',
        );
      }

      // Validate date range
      if (filters.startDate && filters.endDate) {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);

        if (startDate > endDate) {
          throw new BadRequestException('Start date cannot be after end date');
        }
      }

      return await this.supervisorReportingService.exportProgressReport(
        req.user.id,
        format,
        filters,
      );
    } catch (error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('invalid role')
      ) {
        throw new ForbiddenException('Supervisor access required');
      }
      if (
        error.message.includes('Invalid') ||
        error.message.includes('format') ||
        error.message.includes('Format')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('analytics')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get supervisor analytics',
    description:
      'Get comprehensive analytics including trends, benchmarks, and performance insights',
  })
  @ApiResponse({
    status: 200,
    description: 'Supervisor analytics retrieved successfully',
    type: SupervisorAnalyticsDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Only supervisors and admins can access this endpoint',
  })
  async getSupervisorAnalytics(
    @Request() req: any,
  ): Promise<SupervisorAnalyticsDto> {
    try {
      return await this.supervisorReportingService.getSupervisorAnalytics(
        req.user.id,
      );
    } catch (error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('invalid role')
      ) {
        throw new ForbiddenException('Supervisor access required');
      }
      throw error;
    }
  }

  // Private helper methods
  private isValidDateString(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    return (
      date instanceof Date &&
      !isNaN(date.getTime()) &&
      date.toISOString().split('T')[0] === dateString
    );
  }
}
