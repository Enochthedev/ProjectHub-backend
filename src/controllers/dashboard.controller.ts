import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { DashboardService } from '../services/dashboard.service';
import { StudentDashboardService } from '../services/student-dashboard.service';
import { SupervisorDashboardService } from '../services/supervisor-dashboard.service';
import { ProjectApplicationService } from '../services/project-application.service';
import { UserActivityService } from '../services/user-activity.service';
import { StudentDashboardDto } from '../dto/dashboard/student-dashboard.dto';
import { SupervisorDashboardDto } from '../dto/dashboard/supervisor-dashboard.dto';
import { AdminDashboardDto } from '../dto/dashboard/admin-dashboard.dto';
import {
  CreateProjectApplicationDto,
  UpdateApplicationStatusDto,
  ProjectApplicationDto,
  StudentApplicationsDto,
  SupervisorApplicationsDto,
} from '../dto/dashboard/project-application.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly studentDashboardService: StudentDashboardService,
    private readonly supervisorDashboardService: SupervisorDashboardService,
    private readonly projectApplicationService: ProjectApplicationService,
    private readonly userActivityService: UserActivityService,
  ) { }

  // Student Dashboard Endpoints

  @Get('student')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Get student dashboard data',
    description: 'Retrieve personalized dashboard data for the authenticated student.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student dashboard data retrieved successfully',
    type: StudentDashboardDto,
  })
  async getStudentDashboard(@Request() req): Promise<StudentDashboardDto> {
    this.logger.log(`Getting student dashboard for user ${req.user.id}`);
    return this.studentDashboardService.getStudentDashboard(req.user.id);
  }

  // Supervisor Dashboard Endpoints

  @Get('supervisor')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Get supervisor dashboard data',
    description: 'Retrieve comprehensive dashboard data for the authenticated supervisor.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Supervisor dashboard data retrieved successfully',
    type: SupervisorDashboardDto,
  })
  async getSupervisorDashboard(@Request() req): Promise<SupervisorDashboardDto> {
    this.logger.log(`Getting supervisor dashboard for user ${req.user.id}`);
    return this.supervisorDashboardService.getSupervisorDashboard(req.user.id);
  }

  // Admin Dashboard Endpoints

  @Get('admin')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get admin dashboard data',
    description: 'Retrieve comprehensive platform analytics and system management data.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Admin dashboard data retrieved successfully',
    type: AdminDashboardDto,
  })
  async getAdminDashboard(@Request() req): Promise<AdminDashboardDto> {
    this.logger.log(`Getting admin dashboard for user ${req.user.id}`);
    return this.dashboardService.getAdminDashboard();
  }

  // Project Application Endpoints

  @Post('applications')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Create project application',
    description: 'Submit an application for a specific project.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Project application created successfully',
    type: ProjectApplicationDto,
  })
  async createProjectApplication(
    @Request() req,
    @Body() createDto: CreateProjectApplicationDto,
  ): Promise<ProjectApplicationDto> {
    this.logger.log(`Creating application for project ${createDto.projectId} by student ${req.user.id}`);
    return this.projectApplicationService.createApplication(
      req.user.id,
      createDto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('applications/student')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Get student applications',
    description: 'Retrieve all applications submitted by the authenticated student.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student applications retrieved successfully',
    type: StudentApplicationsDto,
  })
  async getStudentApplications(@Request() req): Promise<StudentApplicationsDto> {
    this.logger.log(`Getting applications for student ${req.user.id}`);
    return this.projectApplicationService.getStudentApplications(req.user.id);
  }

  @Put('applications/:applicationId/status')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update application status',
    description: 'Update the status of a project application.',
  })
  @ApiParam({
    name: 'applicationId',
    description: 'Application ID',
    example: 'app-123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application status updated successfully',
    type: ProjectApplicationDto,
  })
  async updateApplicationStatus(
    @Request() req,
    @Param('applicationId') applicationId: string,
    @Body() updateDto: UpdateApplicationStatusDto,
  ): Promise<ProjectApplicationDto> {
    this.logger.log(`Updating application ${applicationId} status by user ${req.user.id}`);
    return this.projectApplicationService.updateApplicationStatus(
      applicationId,
      updateDto,
      req.user.id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // User Activity Endpoints

  @Get('activities/recent')
  @Roles(UserRole.STUDENT, UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get recent user activities',
    description: 'Retrieve recent activities for the authenticated user.',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of activities to retrieve',
    required: false,
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recent activities retrieved successfully',
  })
  async getRecentActivities(
    @Request() req,
    @Query('limit') limit?: number,
  ) {
    this.logger.log(`Getting recent activities for user ${req.user.id}`);
    const activityLimit = limit && limit > 0 && limit <= 100 ? limit : 10;
    return this.userActivityService.getRecentActivities(req.user.id, activityLimit);
  }

  // Milestone Progress Tracking Endpoints

  @Get('milestones/progress/:projectId')
  @Roles(UserRole.STUDENT, UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get milestone progress for project',
    description: 'Retrieve milestone progress tracking data for a specific project.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: 'project-123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestone progress retrieved successfully',
  })
  async getMilestoneProgress(
    @Request() req,
    @Param('projectId') projectId: string,
  ) {
    this.logger.log(`Getting milestone progress for project ${projectId} by user ${req.user.id}`);

    if (req.user.role === 'student') {
      return this.studentDashboardService.getProjectMilestoneProgress(req.user.id, projectId);
    } else if (req.user.role === 'supervisor') {
      return this.supervisorDashboardService.getProjectMilestoneProgress(req.user.id, projectId);
    } else {
      return this.dashboardService.getProjectMilestoneProgress(projectId);
    }
  }
}