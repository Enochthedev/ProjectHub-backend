import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
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
import { ProjectService } from '../services/project.service';
import { SearchService } from '../services/search.service';
import { ProjectAnalyticsService } from '../services/project-analytics.service';
import {
  ApproveProjectDto,
  RejectProjectDto,
  ProjectDetailDto,
} from '../dto/project';
import { SearchProjectsDto, PaginatedProjectsDto } from '../dto/search';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, ApprovalStatus, SortOrder } from '../common/enums';

@ApiTags('admin-projects')
@ApiBearerAuth('JWT-auth')
@Controller('admin/projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly searchService: SearchService,
    private readonly projectAnalyticsService: ProjectAnalyticsService,
  ) {}

  @Get('pending')
  @ApiOperation({
    summary: 'Get pending projects for review',
    description:
      'Retrieve all projects awaiting admin approval with pagination and filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending projects retrieved successfully',
    type: PaginatedProjectsDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Admin access required',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of results per page (max 100)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of results to skip',
  })
  @ApiQuery({
    name: 'specialization',
    required: false,
    type: String,
    description: 'Filter by specialization',
  })
  @ApiQuery({
    name: 'supervisor',
    required: false,
    type: String,
    description: 'Filter by supervisor ID',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['date', 'title', 'supervisor'],
    description: 'Sort criteria',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order',
  })
  async getPendingProjects(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('specialization') specialization?: string,
    @Query('supervisor') supervisor?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<PaginatedProjectsDto> {
    const searchDto: SearchProjectsDto = {
      limit: Math.min(Math.max(limit ?? 20, 1), 100),
      offset: Math.max(offset || 0, 0),
      sortBy: this.mapSortBy(sortBy),
      sortOrder: sortOrder === 'asc' ? SortOrder.ASC : SortOrder.DESC,
    };

    // Add filters
    if (specialization) {
      searchDto.specializations = [specialization];
    }

    // Get pending projects using search service with status filter
    return await this.searchService.searchProjectsByStatus(
      ApprovalStatus.PENDING,
      searchDto,
      supervisor,
    );
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a project',
    description: 'Approve a pending project and make it visible to students',
  })
  @ApiResponse({
    status: 200,
    description: 'Project approved successfully',
    type: ProjectDetailDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid project ID or project cannot be approved',
  })
  @ApiResponse({
    status: 403,
    description: 'Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiBody({
    type: ApproveProjectDto,
    required: false,
    description: 'Optional approval notes',
  })
  async approveProject(
    @Param('id') id: string,
    @Request() req: any,
    @Body() approveDto?: ApproveProjectDto,
  ): Promise<ProjectDetailDto> {
    if (!this.isValidUuid(id)) {
      throw new BadRequestException('Invalid project ID format');
    }

    try {
      const approvedProject = await this.projectService.approveProject(
        id,
        req.user.id,
        approveDto,
      );

      return await this.projectService.getProjectById(approvedProject.id);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new NotFoundException(`Project with ID ${id} not found`);
      }
      if (error.message.includes('cannot be approved')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a project',
    description: 'Reject a pending project with a reason',
  })
  @ApiResponse({
    status: 200,
    description: 'Project rejected successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Project rejected successfully' },
        projectId: { type: 'string', format: 'uuid' },
        rejectionReason: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid project ID or rejection reason required',
  })
  @ApiResponse({
    status: 403,
    description: 'Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiBody({
    type: RejectProjectDto,
    description: 'Rejection reason (required)',
  })
  async rejectProject(
    @Param('id') id: string,
    @Request() req: any,
    @Body() rejectDto: RejectProjectDto,
  ): Promise<{
    message: string;
    projectId: string;
    rejectionReason: string;
  }> {
    if (!this.isValidUuid(id)) {
      throw new BadRequestException('Invalid project ID format');
    }

    try {
      await this.projectService.rejectProject(id, req.user.id, rejectDto);

      return {
        message: 'Project rejected successfully',
        projectId: id,
        rejectionReason: rejectDto.rejectionReason,
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new NotFoundException(`Project with ID ${id} not found`);
      }
      if (error.message.includes('cannot be rejected')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Get system project analytics',
    description:
      'Retrieve comprehensive analytics and insights about the project repository',
  })
  @ApiResponse({
    status: 200,
    description: 'System analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalProjects: { type: 'number', example: 150 },
        projectsByStatus: {
          type: 'object',
          properties: {
            pending: { type: 'number', example: 12 },
            approved: { type: 'number', example: 120 },
            rejected: { type: 'number', example: 15 },
            archived: { type: 'number', example: 3 },
          },
        },
        projectsBySpecialization: {
          type: 'object',
          additionalProperties: { type: 'number' },
          example: {
            'Web Development': 45,
            'Machine Learning': 32,
            'Mobile Development': 28,
          },
        },
        projectsByYear: {
          type: 'object',
          additionalProperties: { type: 'number' },
          example: {
            '2024': 85,
            '2023': 65,
          },
        },
        popularityMetrics: {
          type: 'object',
          properties: {
            totalViews: { type: 'number', example: 2450 },
            totalBookmarks: { type: 'number', example: 380 },
            averageViewsPerProject: { type: 'number', example: 16.3 },
            averageBookmarksPerProject: { type: 'number', example: 2.5 },
          },
        },
        trendingTechnologies: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              technology: { type: 'string', example: 'React' },
              count: { type: 'number', example: 25 },
              trend: { type: 'string', example: 'up' },
            },
          },
        },
        supervisorMetrics: {
          type: 'object',
          properties: {
            totalSupervisors: { type: 'number', example: 45 },
            activeSupervisors: { type: 'number', example: 38 },
            averageProjectsPerSupervisor: { type: 'number', example: 3.2 },
          },
        },
        recentActivity: {
          type: 'object',
          properties: {
            projectsSubmittedThisWeek: { type: 'number', example: 8 },
            projectsApprovedThisWeek: { type: 'number', example: 12 },
            projectsRejectedThisWeek: { type: 'number', example: 2 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Admin access required',
  })
  async getSystemAnalytics(): Promise<any> {
    return await this.projectAnalyticsService.getSystemAnalytics();
  }

  @Patch(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Archive a project',
    description: 'Archive a project while preserving historical data',
  })
  @ApiResponse({
    status: 200,
    description: 'Project archived successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Project archived successfully' },
        projectId: { type: 'string', format: 'uuid' },
        archivedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid project ID or project cannot be archived',
  })
  @ApiResponse({
    status: 403,
    description: 'Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async archiveProject(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{
    message: string;
    projectId: string;
    archivedAt: Date;
  }> {
    if (!this.isValidUuid(id)) {
      throw new BadRequestException('Invalid project ID format');
    }

    try {
      await this.projectService.archiveProject(id, req.user.id);
      const archivedAt = new Date();

      return {
        message: 'Project archived successfully',
        projectId: id,
        archivedAt,
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new NotFoundException(`Project with ID ${id} not found`);
      }
      if (error.message.includes('cannot be archived')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Patch('bulk/archive-old')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk archive old projects',
    description: 'Archive projects that are older than a specified threshold',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk archive operation completed',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Bulk archive completed' },
        archivedCount: { type: 'number', example: 15 },
        processedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Admin access required',
  })
  async bulkArchiveOldProjects(@Request() req: any): Promise<{
    message: string;
    archivedCount: number;
    processedAt: Date;
  }> {
    const archivedCount = await this.projectService.bulkArchiveOldProjects(
      req.user.id,
    );

    return {
      message: 'Bulk archive completed',
      archivedCount,
      processedAt: new Date(),
    };
  }

  @Patch('bulk/reject-stale')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk reject stale pending projects',
    description: 'Reject projects that have been pending for too long',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk reject operation completed',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Bulk reject completed' },
        rejectedCount: { type: 'number', example: 8 },
        processedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Admin access required',
  })
  async bulkRejectStaleProjects(@Request() req: any): Promise<{
    message: string;
    rejectedCount: number;
    processedAt: Date;
  }> {
    const rejectedCount = await this.projectService.bulkRejectStaleProjects(
      req.user.id,
    );

    return {
      message: 'Bulk reject completed',
      rejectedCount,
      processedAt: new Date(),
    };
  }

  @Get('status-statistics')
  @ApiOperation({
    summary: 'Get project status statistics',
    description: 'Get counts of projects by approval status',
  })
  @ApiResponse({
    status: 200,
    description: 'Status statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        pending: { type: 'number', example: 12 },
        approved: { type: 'number', example: 120 },
        rejected: { type: 'number', example: 15 },
        archived: { type: 'number', example: 3 },
        total: { type: 'number', example: 150 },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Admin access required',
  })
  async getProjectStatusStatistics(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    archived: number;
    total: number;
  }> {
    return await this.projectService.getProjectStatusStatistics();
  }

  @Get('attention-required')
  @ApiOperation({
    summary: 'Get projects requiring attention',
    description:
      'Get projects that need admin attention (stale pending, old approved)',
  })
  @ApiResponse({
    status: 200,
    description: 'Projects requiring attention retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        stalePending: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              supervisor: { type: 'string' },
              daysPending: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        oldApproved: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              supervisor: { type: 'string' },
              yearsOld: { type: 'number' },
              approvedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Admin access required',
  })
  async getProjectsRequiringAttention(): Promise<{
    stalePending: any[];
    oldApproved: any[];
  }> {
    return await this.projectService.getProjectsRequiringAttention();
  }

  // Private helper methods
  private mapSortBy(sortBy?: string): any {
    switch (sortBy) {
      case 'title':
        return 'title';
      case 'supervisor':
        return 'supervisor';
      case 'date':
      default:
        return 'date';
    }
  }

  private isValidUuid(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
