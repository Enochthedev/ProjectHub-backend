import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
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
  ApiBody,
} from '@nestjs/swagger';
import { SupervisorReportingService } from '../services/supervisor-reporting.service';
import { SupervisorAvailabilityService } from '../services/supervisor-availability.service';
import { SupervisorAIInteractionService } from '../services/supervisor-ai-interaction.service';
import { SupervisorCommunicationService } from '../services/supervisor-communication.service';
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
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
  AvailabilityResponseDto,
  SupervisorAvailabilityDto,
} from '../dto/supervisor/availability.dto';
import {
  CreateAIInteractionReviewDto,
  UpdateAIInteractionReviewDto,
  AIInteractionReviewResponseDto,
  AIInteractionOverviewDto,
} from '../dto/supervisor/ai-interaction.dto';
import {
  SendMessageDto,
  ScheduleMeetingDto,
  MessageResponseDto,
  MeetingResponseDto,
  CommunicationOverviewDto,
  MeetingStatus,
} from '../dto/supervisor/communication.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { MilestoneStatus } from '../common/enums/milestone-status.enum';
import { Priority } from '../common/enums/priority.enum';
import { ReviewStatus, ReviewCategory } from '../entities/ai-interaction-review.entity';

@ApiTags('supervisor')
@ApiBearerAuth('JWT-auth')
@Controller('supervisor')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupervisorController {
  constructor(
    private readonly supervisorReportingService: SupervisorReportingService,
    private readonly availabilityService: SupervisorAvailabilityService,
    private readonly aiInteractionService: SupervisorAIInteractionService,
    private readonly communicationService: SupervisorCommunicationService,
  ) { }

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

  // ===== AVAILABILITY MANAGEMENT ENDPOINTS =====

  @Get('availability')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get supervisor availability',
    description: 'Get all availability slots for the supervisor',
  })
  @ApiResponse({
    status: 200,
    description: 'Supervisor availability retrieved successfully',
    type: SupervisorAvailabilityDto,
  })
  async getSupervisorAvailability(
    @Request() req: any,
  ): Promise<SupervisorAvailabilityDto> {
    return await this.availabilityService.getSupervisorAvailability(req.user.id);
  }

  @Post('availability')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create availability slot',
    description: 'Create a new availability slot for the supervisor',
  })
  @ApiBody({ type: CreateAvailabilityDto })
  @ApiResponse({
    status: 201,
    description: 'Availability slot created successfully',
    type: AvailabilityResponseDto,
  })
  async createAvailability(
    @Request() req: any,
    @Body() createDto: CreateAvailabilityDto,
  ): Promise<AvailabilityResponseDto> {
    return await this.availabilityService.createAvailability(req.user.id, createDto);
  }

  @Put('availability/:availabilityId')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update availability slot',
    description: 'Update an existing availability slot',
  })
  @ApiParam({ name: 'availabilityId', description: 'Availability slot UUID' })
  @ApiBody({ type: UpdateAvailabilityDto })
  @ApiResponse({
    status: 200,
    description: 'Availability slot updated successfully',
    type: AvailabilityResponseDto,
  })
  async updateAvailability(
    @Request() req: any,
    @Param('availabilityId', ParseUUIDPipe) availabilityId: string,
    @Body() updateDto: UpdateAvailabilityDto,
  ): Promise<AvailabilityResponseDto> {
    return await this.availabilityService.updateAvailability(
      req.user.id,
      availabilityId,
      updateDto,
    );
  }

  @Delete('availability/:availabilityId')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete availability slot',
    description: 'Delete an availability slot',
  })
  @ApiParam({ name: 'availabilityId', description: 'Availability slot UUID' })
  @ApiResponse({
    status: 204,
    description: 'Availability slot deleted successfully',
  })
  async deleteAvailability(
    @Request() req: any,
    @Param('availabilityId', ParseUUIDPipe) availabilityId: string,
  ): Promise<void> {
    return await this.availabilityService.deleteAvailability(req.user.id, availabilityId);
  }

  // ===== AI INTERACTION MONITORING ENDPOINTS =====

  @Get('ai-interactions')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get AI interaction overview',
    description: 'Get overview of AI interactions requiring supervisor attention',
  })
  @ApiResponse({
    status: 200,
    description: 'AI interaction overview retrieved successfully',
    type: AIInteractionOverviewDto,
  })
  async getAIInteractionOverview(
    @Request() req: any,
  ): Promise<AIInteractionOverviewDto> {
    return await this.aiInteractionService.getAIInteractionOverview(req.user.id);
  }

  @Get('ai-interactions/reviews')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get AI interaction reviews',
    description: 'Get filtered list of AI interaction reviews',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ReviewStatus,
    description: 'Filter by review status',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ReviewCategory,
    description: 'Filter by review category',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of reviews to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of reviews to skip',
  })
  @ApiResponse({
    status: 200,
    description: 'AI interaction reviews retrieved successfully',
    type: [AIInteractionReviewResponseDto],
  })
  async getAIInteractionReviews(
    @Request() req: any,
    @Query('status') status?: ReviewStatus,
    @Query('category') category?: ReviewCategory,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<AIInteractionReviewResponseDto[]> {
    return await this.aiInteractionService.getReviews(
      req.user.id,
      status,
      category,
      limit,
      offset,
    );
  }

  @Post('ai-interactions/reviews')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create AI interaction review',
    description: 'Create a new review for an AI interaction',
  })
  @ApiBody({ type: CreateAIInteractionReviewDto })
  @ApiResponse({
    status: 201,
    description: 'AI interaction review created successfully',
    type: AIInteractionReviewResponseDto,
  })
  async createAIInteractionReview(
    @Request() req: any,
    @Body() createDto: CreateAIInteractionReviewDto,
  ): Promise<AIInteractionReviewResponseDto> {
    return await this.aiInteractionService.createReview(req.user.id, createDto);
  }

  @Put('ai-interactions/reviews/:reviewId')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update AI interaction review',
    description: 'Update an existing AI interaction review',
  })
  @ApiParam({ name: 'reviewId', description: 'Review UUID' })
  @ApiBody({ type: UpdateAIInteractionReviewDto })
  @ApiResponse({
    status: 200,
    description: 'AI interaction review updated successfully',
    type: AIInteractionReviewResponseDto,
  })
  async updateAIInteractionReview(
    @Request() req: any,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() updateDto: UpdateAIInteractionReviewDto,
  ): Promise<AIInteractionReviewResponseDto> {
    return await this.aiInteractionService.updateReview(req.user.id, reviewId, updateDto);
  }

  @Post('ai-interactions/reviews/:reviewId/approve')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Approve AI interaction',
    description: 'Approve an AI interaction review',
  })
  @ApiParam({ name: 'reviewId', description: 'Review UUID' })
  @ApiResponse({
    status: 200,
    description: 'AI interaction approved successfully',
    type: AIInteractionReviewResponseDto,
  })
  async approveAIInteraction(
    @Request() req: any,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
  ): Promise<AIInteractionReviewResponseDto> {
    return await this.aiInteractionService.approveReview(req.user.id, reviewId);
  }

  @Post('ai-interactions/reviews/:reviewId/escalate')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Escalate AI interaction',
    description: 'Escalate an AI interaction for further review',
  })
  @ApiParam({ name: 'reviewId', description: 'Review UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Reason for escalation' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'AI interaction escalated successfully',
    type: AIInteractionReviewResponseDto,
  })
  async escalateAIInteraction(
    @Request() req: any,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body('reason') reason?: string,
  ): Promise<AIInteractionReviewResponseDto> {
    return await this.aiInteractionService.escalateReview(req.user.id, reviewId, reason);
  }

  @Post('ai-interactions/reviews/:reviewId/flag')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Flag AI interaction',
    description: 'Flag an AI interaction as problematic',
  })
  @ApiParam({ name: 'reviewId', description: 'Review UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Reason for flagging' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'AI interaction flagged successfully',
    type: AIInteractionReviewResponseDto,
  })
  async flagAIInteraction(
    @Request() req: any,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body('reason') reason?: string,
  ): Promise<AIInteractionReviewResponseDto> {
    return await this.aiInteractionService.flagReview(req.user.id, reviewId, reason);
  }

  // ===== STUDENT COMMUNICATION ENDPOINTS =====

  @Get('communication')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get communication overview',
    description: 'Get overview of messages and meetings with students',
  })
  @ApiResponse({
    status: 200,
    description: 'Communication overview retrieved successfully',
    type: CommunicationOverviewDto,
  })
  async getCommunicationOverview(
    @Request() req: any,
  ): Promise<CommunicationOverviewDto> {
    return await this.communicationService.getCommunicationOverview(req.user.id);
  }

  @Post('communication/messages')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Send message to student',
    description: 'Send a message to a student',
  })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
    type: MessageResponseDto,
  })
  async sendMessage(
    @Request() req: any,
    @Body() sendMessageDto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    return await this.communicationService.sendMessage(req.user.id, sendMessageDto);
  }

  @Get('communication/messages')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get messages',
    description: 'Get messages sent to students',
  })
  @ApiQuery({
    name: 'studentId',
    required: false,
    type: String,
    description: 'Filter by student ID',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of messages to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of messages to skip',
  })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    type: [MessageResponseDto],
  })
  async getMessages(
    @Request() req: any,
    @Query('studentId') studentId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<MessageResponseDto[]> {
    return await this.communicationService.getMessages(req.user.id, studentId, limit, offset);
  }

  @Post('communication/meetings')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Schedule meeting with student',
    description: 'Schedule a meeting with a student',
  })
  @ApiBody({ type: ScheduleMeetingDto })
  @ApiResponse({
    status: 201,
    description: 'Meeting scheduled successfully',
    type: MeetingResponseDto,
  })
  async scheduleMeeting(
    @Request() req: any,
    @Body() scheduleMeetingDto: ScheduleMeetingDto,
  ): Promise<MeetingResponseDto> {
    return await this.communicationService.scheduleMeeting(req.user.id, scheduleMeetingDto);
  }

  @Get('communication/meetings')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get meetings',
    description: 'Get meetings with students',
  })
  @ApiQuery({
    name: 'studentId',
    required: false,
    type: String,
    description: 'Filter by student ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: MeetingStatus,
    description: 'Filter by meeting status',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of meetings to return',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of meetings to skip',
  })
  @ApiResponse({
    status: 200,
    description: 'Meetings retrieved successfully',
    type: [MeetingResponseDto],
  })
  async getMeetings(
    @Request() req: any,
    @Query('studentId') studentId?: string,
    @Query('status') status?: MeetingStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<MeetingResponseDto[]> {
    return await this.communicationService.getMeetings(
      req.user.id,
      studentId,
      status,
      limit,
      offset,
    );
  }

  @Put('communication/meetings/:meetingId/status')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update meeting status',
    description: 'Update the status of a meeting',
  })
  @ApiParam({ name: 'meetingId', description: 'Meeting UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { enum: Object.values(MeetingStatus), description: 'New meeting status' },
      },
      required: ['status'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Meeting status updated successfully',
    type: MeetingResponseDto,
  })
  async updateMeetingStatus(
    @Request() req: any,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
    @Body('status') status: MeetingStatus,
  ): Promise<MeetingResponseDto> {
    return await this.communicationService.updateMeetingStatus(req.user.id, meetingId, status);
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
