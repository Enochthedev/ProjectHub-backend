import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
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
import { MilestoneTemplateService } from '../services/milestone-template.service';
import { MilestoneTemplateApplicationService } from '../services/milestone-template-application.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateFiltersDto,
  ApplyTemplateDto,
  TemplateResponseDto,
  PaginatedTemplateResponseDto,
  TemplateUsageStatsDto,
} from '../dto/milestone';
import { MilestoneTemplate } from '../entities/milestone-template.entity';
import { Milestone } from '../entities/milestone.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ProjectType } from '../common/enums/project-type.enum';

@ApiTags('milestone-templates')
@ApiBearerAuth('JWT-auth')
@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MilestoneTemplateController {
  constructor(
    private readonly templateService: MilestoneTemplateService,
    private readonly templateApplicationService: MilestoneTemplateApplicationService,
  ) {}

  @Get()
  @Roles(UserRole.STUDENT, UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get milestone templates with filtering',
    description:
      'Retrieve milestone templates with optional filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
    type: PaginatedTemplateResponseDto,
  })
  @ApiQuery({
    name: 'specialization',
    required: false,
    type: String,
    description: 'Filter by specialization',
  })
  @ApiQuery({
    name: 'projectType',
    required: false,
    enum: ProjectType,
    description: 'Filter by project type',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for name, description, or specialization',
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    type: [String],
    description: 'Filter by tags',
  })
  @ApiQuery({
    name: 'minDurationWeeks',
    required: false,
    type: Number,
    description: 'Minimum duration in weeks',
  })
  @ApiQuery({
    name: 'maxDurationWeeks',
    required: false,
    type: Number,
    description: 'Maximum duration in weeks',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 20, max: 100)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'createdAt', 'usageCount', 'averageRating'],
    description: 'Sort criteria',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  async getTemplates(
    @Query() filters: TemplateFiltersDto,
  ): Promise<PaginatedTemplateResponseDto> {
    // Sanitize filters
    const sanitizedFilters = this.sanitizeTemplateFilters(filters);

    const result = await this.templateService.getTemplates(sanitizedFilters);

    const page = sanitizedFilters.page || 1;
    const limit = sanitizedFilters.limit || 20;
    const totalPages = Math.ceil(result.total / limit);

    // Convert to response DTOs
    const templateResponses: TemplateResponseDto[] = result.templates.map(
      (template) => this.mapTemplateToResponseDto(template),
    );

    return {
      templates: templateResponses,
      total: result.total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get template by ID',
    description: 'Retrieve a specific milestone template by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Template retrieved successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  async getTemplateById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TemplateResponseDto> {
    const template = await this.templateService.getTemplateById(id);
    return this.mapTemplateToResponseDto(template);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Create a new milestone template',
    description: 'Create a new milestone template (admin and supervisor only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid template data or validation failed',
  })
  @ApiResponse({
    status: 403,
    description: 'Only admins and supervisors can create templates',
  })
  async createTemplate(
    @Request() req: any,
    @Body() createTemplateDto: CreateTemplateDto,
  ): Promise<TemplateResponseDto> {
    try {
      const template = await this.templateService.createTemplate(
        createTemplateDto,
        req.user.id,
      );
      return this.mapTemplateToResponseDto(template);
    } catch (error) {
      if (
        error.message.includes('validation') ||
        error.message.includes('duplicate') ||
        error.message.includes('exists')
      ) {
        throw new BadRequestException(error.message);
      }
      if (error.message.includes('permission')) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Update milestone template',
    description:
      'Update template details (admins can update all, supervisors can update their own)',
  })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid template data or validation failed',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to update this template',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ): Promise<TemplateResponseDto> {
    try {
      const template = await this.templateService.updateTemplate(
        id,
        updateTemplateDto,
        req.user.id,
      );
      return this.mapTemplateToResponseDto(template);
    } catch (error) {
      if (error.message.includes('permission')) {
        throw new ForbiddenException(error.message);
      }
      if (
        error.message.includes('validation') ||
        error.message.includes('duplicate') ||
        error.message.includes('exists')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete milestone template',
    description:
      'Delete a template (admins can delete all, supervisors can delete their own)',
  })
  @ApiResponse({
    status: 204,
    description: 'Template deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to delete this template',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete template that has been used',
  })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  async deleteTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<void> {
    try {
      await this.templateService.deleteTemplate(id, req.user.id);
    } catch (error) {
      if (error.message.includes('permission')) {
        throw new ForbiddenException(error.message);
      }
      if (error.message.includes('used')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post(':id/archive')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Archive milestone template',
    description: 'Archive a template instead of deleting it',
  })
  @ApiResponse({
    status: 200,
    description: 'Template archived successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to archive this template',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  async archiveTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<TemplateResponseDto> {
    try {
      const template = await this.templateService.archiveTemplate(
        id,
        req.user.id,
      );
      return this.mapTemplateToResponseDto(template);
    } catch (error) {
      if (error.message.includes('permission')) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  @Post(':id/restore')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Restore archived template',
    description: 'Restore an archived template to active status',
  })
  @ApiResponse({
    status: 200,
    description: 'Template restored successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to restore this template',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  async restoreTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<TemplateResponseDto> {
    try {
      const template = await this.templateService.restoreTemplate(
        id,
        req.user.id,
      );
      return this.mapTemplateToResponseDto(template);
    } catch (error) {
      if (error.message.includes('permission')) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  @Post(':id/duplicate')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Duplicate milestone template',
    description: 'Create a copy of an existing template',
  })
  @ApiResponse({
    status: 201,
    description: 'Template duplicated successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid template name or validation failed',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions to create templates',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template UUID to duplicate' })
  async duplicateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() body: { newName?: string },
  ): Promise<TemplateResponseDto> {
    try {
      const template = await this.templateService.duplicateTemplate(
        id,
        req.user.id,
        body.newName,
      );
      return this.mapTemplateToResponseDto(template);
    } catch (error) {
      if (error.message.includes('permission')) {
        throw new ForbiddenException(error.message);
      }
      if (
        error.message.includes('validation') ||
        error.message.includes('exists')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get(':id/usage-stats')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Get template usage statistics',
    description: 'Get detailed usage statistics for a template',
  })
  @ApiResponse({
    status: 200,
    description: 'Usage statistics retrieved successfully',
    type: TemplateUsageStatsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  async getTemplateUsageStats(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TemplateUsageStatsDto> {
    return await this.templateService.getTemplateUsageStats(id);
  }

  // Private helper methods
  private sanitizeTemplateFilters(
    filters: TemplateFiltersDto,
  ): TemplateFiltersDto {
    const sanitized = { ...filters };

    // Ensure page is at least 1
    if (sanitized.page && sanitized.page < 1) {
      sanitized.page = 1;
    }

    // Ensure limit is within bounds
    if (sanitized.limit) {
      sanitized.limit = Math.min(Math.max(sanitized.limit, 1), 100);
    }

    // Validate duration ranges
    if (sanitized.minDurationWeeks && sanitized.minDurationWeeks < 1) {
      sanitized.minDurationWeeks = 1;
    }

    if (sanitized.maxDurationWeeks && sanitized.maxDurationWeeks > 52) {
      sanitized.maxDurationWeeks = 52;
    }

    return sanitized;
  }

  private mapTemplateToResponseDto(
    template: MilestoneTemplate,
  ): TemplateResponseDto {
    // Get name from appropriate profile
    let createdByName = 'Unknown';
    if (template.createdBy) {
      if (template.createdBy.studentProfile?.name) {
        createdByName = template.createdBy.studentProfile.name;
      } else if (template.createdBy.supervisorProfile?.name) {
        createdByName = template.createdBy.supervisorProfile.name;
      } else {
        createdByName = template.createdBy.email;
      }
    }

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      specialization: template.specialization,
      projectType: template.projectType,
      estimatedDurationWeeks: template.estimatedDurationWeeks,
      isActive: template.isActive,
      usageCount: template.usageCount,
      milestoneItems: template.milestoneItems,
      configuration: template.configuration || undefined,
      tags: template.tags,
      createdByName,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      averageRating: template.averageRating,
      ratingCount: template.ratingCount,
    };
  }
}
