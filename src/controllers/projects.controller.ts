import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from '../services/search.service';
import { ProjectService } from '../services/project.service';
import { ProjectViewTrackingService } from '../services/project-view-tracking.service';
import { InputSanitizationService } from '../common/services/input-sanitization.service';
import {
  SearchProjectsDto,
  ProjectSummaryDto,
  PaginatedProjectsDto,
} from '../dto/search';
import { ProjectDetailDto } from '../dto/project';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SecurityGuard, Security } from '../common/guards/security.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('projects')
@Controller('projects')
@UseGuards(SecurityGuard)
export class ProjectsController {
  constructor(
    private readonly searchService: SearchService,
    private readonly projectService: ProjectService,
    private readonly viewTrackingService: ProjectViewTrackingService,
    private readonly inputSanitizationService: InputSanitizationService,
  ) {}

  @Get()
  @Public()
  @Security({
    rateLimit: {
      endpoint: 'search',
      maxRequests: 30,
      windowMs: 60000, // 1 minute
    },
    inputValidation: {
      sanitizeQuery: true,
      maxQueryLength: 500,
    },
  })
  @ApiOperation({
    summary: 'Search and browse projects',
    description:
      'Search through approved projects with filtering, sorting, and pagination support',
  })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully',
    type: PaginatedProjectsDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid search parameters',
  })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Search query for full-text search',
  })
  @ApiQuery({
    name: 'specializations',
    required: false,
    type: [String],
    description: 'Filter by specializations',
  })
  @ApiQuery({
    name: 'difficultyLevels',
    required: false,
    type: [String],
    description: 'Filter by difficulty levels',
  })
  @ApiQuery({
    name: 'yearFrom',
    required: false,
    type: Number,
    description: 'Filter projects from this year',
  })
  @ApiQuery({
    name: 'yearTo',
    required: false,
    type: Number,
    description: 'Filter projects up to this year',
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    type: [String],
    description: 'Filter by tags',
  })
  @ApiQuery({
    name: 'isGroupProject',
    required: false,
    type: Boolean,
    description: 'Filter by group project status',
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
    enum: ['relevance', 'date', 'title', 'popularity'],
    description: 'Sort criteria',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order',
  })
  async searchProjects(
    @Query() searchDto: SearchProjectsDto,
  ): Promise<PaginatedProjectsDto> {
    try {
      // Sanitize search query if provided
      if (searchDto.query) {
        searchDto.query = this.inputSanitizationService.sanitizeSearchQuery(
          searchDto.query,
        );
      }

      // Sanitize tags if provided
      if (searchDto.tags) {
        searchDto.tags = this.inputSanitizationService.sanitizeTags(
          searchDto.tags,
        );
      }

      // Validate pagination parameters
      const { limit, offset } =
        this.inputSanitizationService.validatePaginationParams(
          searchDto.limit,
          searchDto.offset,
        );
      searchDto.limit = limit;
      searchDto.offset = offset;

      // Validate sort parameters
      const { sortBy, sortOrder } =
        this.inputSanitizationService.validateSortParams(
          searchDto.sortBy,
          searchDto.sortOrder,
        );
      searchDto.sortBy = sortBy as any;
      searchDto.sortOrder = sortOrder as any;

      return await this.searchService.searchProjects(searchDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid search parameters');
    }
  }

  @Get('popular')
  @Public()
  @Security({
    rateLimit: {
      endpoint: 'search',
      maxRequests: 20,
      windowMs: 60000, // 1 minute
    },
    inputValidation: {
      sanitizeQuery: true,
      maxQueryLength: 10,
    },
  })
  @ApiOperation({
    summary: 'Get popular/trending projects',
    description:
      'Retrieve the most popular projects based on views and bookmarks',
  })
  @ApiResponse({
    status: 200,
    description: 'Popular projects retrieved successfully',
    type: [ProjectSummaryDto],
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of popular projects to return (max 50)',
  })
  async getPopularProjects(
    @Query('limit') limit?: number,
  ): Promise<ProjectSummaryDto[]> {
    const validLimit = Math.min(Math.max(limit ?? 10, 1), 50);
    return await this.searchService.getPopularProjects(validLimit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Security({
    rateLimit: {
      endpoint: 'search',
      maxRequests: 50,
      windowMs: 60000, // 1 minute
    },
    inputValidation: {
      sanitizeQuery: false,
      maxQueryLength: 50,
    },
  })
  @ApiOperation({
    summary: 'Get project details by ID',
    description:
      'Retrieve detailed information about a specific project and track the view',
  })
  @ApiResponse({
    status: 200,
    description: 'Project details retrieved successfully',
    type: ProjectDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found or not approved',
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async getProjectById(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ProjectDetailDto> {
    // Validate UUID format
    if (!this.isValidUuid(id)) {
      throw new BadRequestException('Invalid project ID format');
    }

    // Get project details
    const project = await this.projectService.getProjectById(id);
    if (!project) {
      throw new NotFoundException('Project not found or not approved');
    }

    // Track the view asynchronously (don't wait for it)
    this.trackProjectView(id, req).catch((error) => {
      // Log error but don't fail the request
      console.error('Failed to track project view:', error);
    });

    return project;
  }

  @Get(':id/suggestions')
  @Public()
  @Security({
    rateLimit: {
      endpoint: 'search',
      maxRequests: 20,
      windowMs: 60000, // 1 minute
    },
    inputValidation: {
      sanitizeQuery: true,
      maxQueryLength: 10,
    },
  })
  @ApiOperation({
    summary: 'Get related project suggestions',
    description:
      'Get projects similar to the specified project based on tags and specialization',
  })
  @ApiResponse({
    status: 200,
    description: 'Related projects retrieved successfully',
    type: [ProjectSummaryDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of suggestions to return (max 20)',
  })
  async getRelatedProjects(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ): Promise<ProjectSummaryDto[]> {
    if (!this.isValidUuid(id)) {
      throw new BadRequestException('Invalid project ID format');
    }

    const validLimit = Math.min(Math.max(limit ?? 5, 1), 20);

    // Get the project to find similar ones
    const project = await this.searchService.getProjectById(id);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Search for similar projects based on specialization and tags
    const searchDto: SearchProjectsDto = {
      specializations: [project.specialization],
      tags: project.tags.slice(0, 3), // Use first 3 tags
      limit: validLimit + 1, // Get one extra to exclude the current project
      offset: 0,
    };

    const results = await this.searchService.searchProjects(searchDto);

    // Filter out the current project and return the rest
    const relatedProjects = results.projects.filter((p) => p.id !== id);
    return relatedProjects.slice(0, validLimit);
  }

  private async trackProjectView(projectId: string, req: any): Promise<void> {
    try {
      const viewerId = req.user?.id || null;
      const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      await this.viewTrackingService.trackProjectView({
        projectId,
        viewerId,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      // Silently fail - view tracking shouldn't break the main functionality
      console.error('View tracking failed:', error);
    }
  }

  private isValidUuid(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
