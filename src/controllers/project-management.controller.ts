import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProjectService } from '../services/project.service';
import { SearchService } from '../services/search.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectDetailDto,
} from '../dto/project';
import { SearchProjectsDto, PaginatedProjectsDto } from '../dto/search';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, ApprovalStatus, SortOrder } from '../common/enums';

@ApiTags('project-management')
@ApiBearerAuth('JWT-auth')
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectManagementController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly searchService: SearchService,
  ) {}

  @Post()
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Submit a new project',
    description: 'Create a new project submission for admin approval',
  })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ProjectDetailDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid project data or validation failed',
  })
  @ApiResponse({
    status: 403,
    description: 'Only supervisors can create projects',
  })
  async createProject(
    @Request() req: any,
    @Body() createProjectDto: CreateProjectDto,
  ): Promise<ProjectDetailDto> {
    try {
      const project = await this.projectService.createProject(
        createProjectDto,
        req.user.id,
      );

      return await this.projectService.getProjectById(project.id);
    } catch (error) {
      if (
        error.message.includes('validation') ||
        error.message.includes('duplicate')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Put(':id')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update an existing project',
    description:
      'Update project details. Supervisors can only update their own projects.',
  })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    type: ProjectDetailDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid project data or validation failed',
  })
  @ApiResponse({
    status: 403,
    description: 'You can only update your own projects',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async updateProject(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectDetailDto> {
    if (!this.isValidUuid(id)) {
      throw new BadRequestException('Invalid project ID format');
    }

    try {
      const updatedProject = await this.projectService.updateProject(
        id,
        updateProjectDto,
        req.user.id,
        req.user.role,
      );

      return await this.projectService.getProjectById(updatedProject.id);
    } catch (error) {
      if (error.message.includes('permission')) {
        throw new ForbiddenException(error.message);
      }
      if (
        error.message.includes('validation') ||
        error.message.includes('duplicate')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('my-projects')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({
    summary: "Get supervisor's projects",
    description:
      'Retrieve all projects created by the authenticated supervisor with filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Supervisor projects retrieved successfully',
    type: PaginatedProjectsDto,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ApprovalStatus,
    description: 'Filter by approval status',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Filter by project year',
  })
  @ApiQuery({
    name: 'specialization',
    required: false,
    type: String,
    description: 'Filter by specialization',
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
    name: 'sortBy',
    required: false,
    enum: ['date', 'title', 'status'],
    description: 'Sort criteria',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order',
  })
  async getSupervisorProjects(
    @Request() req: any,
    @Query('status') status?: ApprovalStatus,
    @Query('year') year?: number,
    @Query('specialization') specialization?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<PaginatedProjectsDto> {
    // Build search criteria for supervisor's projects
    const searchDto: SearchProjectsDto = {
      limit: Math.min(Math.max(limit ?? 20, 1), 100),
      offset: Math.max(offset || 0, 0),
      sortBy: this.mapSortBy(sortBy),
      sortOrder: sortOrder === 'asc' ? SortOrder.ASC : SortOrder.DESC,
    };

    // Add filters if provided
    if (year) {
      searchDto.yearFrom = year;
      searchDto.yearTo = year;
    }

    if (specialization) {
      searchDto.specializations = [specialization];
    }

    // Use a custom method to get supervisor's projects with all statuses
    return await this.getSupervisorProjectsWithStatus(
      req.user.id,
      searchDto,
      status,
    );
  }

  @Get('my-projects/analytics')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Get supervisor project analytics',
    description: "Get analytics and statistics for supervisor's projects",
  })
  @ApiResponse({
    status: 200,
    description: 'Project analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalProjects: { type: 'number' },
        approvedProjects: { type: 'number' },
        pendingProjects: { type: 'number' },
        rejectedProjects: { type: 'number' },
        totalViews: { type: 'number' },
        totalBookmarks: { type: 'number' },
        popularityScore: { type: 'number' },
        projectsByYear: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
        projectsBySpecialization: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
      },
    },
  })
  async getSupervisorAnalytics(@Request() req: any): Promise<any> {
    return await this.getSupervisorProjectAnalytics(req.user.id);
  }

  @Get('suggestions/tags')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Get tag suggestions',
    description:
      'Get suggested tags based on partial input for project creation/editing',
  })
  @ApiResponse({
    status: 200,
    description: 'Tag suggestions retrieved successfully',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  @ApiQuery({
    name: 'partial',
    required: true,
    description: 'Partial tag text to get suggestions for',
  })
  async getTagSuggestions(
    @Query('partial') partial: string,
  ): Promise<string[]> {
    if (!partial || partial.trim().length < 2) {
      throw new BadRequestException(
        'Partial text must be at least 2 characters long',
      );
    }

    return await this.projectService.getSuggestedTags(partial.trim());
  }

  @Get('suggestions/technologies')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Get technology suggestions',
    description:
      'Get suggested technologies based on partial input for project creation/editing',
  })
  @ApiResponse({
    status: 200,
    description: 'Technology suggestions retrieved successfully',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  @ApiQuery({
    name: 'partial',
    required: true,
    description: 'Partial technology text to get suggestions for',
  })
  async getTechnologySuggestions(
    @Query('partial') partial: string,
  ): Promise<string[]> {
    if (!partial || partial.trim().length < 2) {
      throw new BadRequestException(
        'Partial text must be at least 2 characters long',
      );
    }

    return await this.projectService.getSuggestedTechnologies(partial.trim());
  }

  // Private helper methods
  private async getSupervisorProjectsWithStatus(
    supervisorId: string,
    searchDto: SearchProjectsDto,
    status?: ApprovalStatus,
  ): Promise<PaginatedProjectsDto> {
    // This would need to be implemented in the search service
    // For now, we'll use a basic implementation
    const baseQuery = {
      ...searchDto,
      // Add supervisor filter - this would need to be supported by SearchService
    };

    // Note: This is a simplified implementation
    // In a real implementation, you'd extend SearchService to support supervisor filtering
    return await this.searchService.searchProjects(baseQuery);
  }

  private async getSupervisorProjectAnalytics(
    supervisorId: string,
  ): Promise<any> {
    // This would need to be implemented in the project service
    // For now, return a basic structure
    return {
      totalProjects: 0,
      approvedProjects: 0,
      pendingProjects: 0,
      rejectedProjects: 0,
      totalViews: 0,
      totalBookmarks: 0,
      popularityScore: 0,
      projectsByYear: {},
      projectsBySpecialization: {},
    };
  }

  private mapSortBy(sortBy?: string): any {
    switch (sortBy) {
      case 'title':
        return 'title';
      case 'status':
        return 'date'; // Map status to date for now
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
