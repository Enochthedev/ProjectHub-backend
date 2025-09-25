import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
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
import { MilestoneService } from '../services/milestone.service';
import { MilestoneTemplateApplicationService } from '../services/milestone-template-application.service';
import {
  CreateMilestoneDto,
  UpdateMilestoneDto,
  UpdateMilestoneStatusDto,
  MilestoneFiltersDto,
  CreateMilestoneNoteDto,
  ProjectProgressDto,
  ApplyTemplateDto,
} from '../dto/milestone';
import { Milestone } from '../entities/milestone.entity';
import { MilestoneNote } from '../entities/milestone-note.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { MilestoneSecurityGuard } from '../common/guards/milestone-security.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  MilestoneSecurity,
  RequireMilestoneOwnership,
  RequireMilestoneReadAccess,
  RequireMilestoneWriteAccess,
  RequireMilestoneDeleteAccess,
  MilestoneRateLimit,
} from '../common/guards/milestone-security.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { MilestoneStatus } from '../common/enums/milestone-status.enum';
import { Priority } from '../common/enums/priority.enum';

@ApiTags('milestones')
@ApiBearerAuth('JWT-auth')
@Controller('milestones')
@UseGuards(JwtAuthGuard, RolesGuard, MilestoneSecurityGuard)
export class MilestoneController {
  constructor(
    private readonly milestoneService: MilestoneService,
    private readonly templateApplicationService: MilestoneTemplateApplicationService,
  ) {}

  @Post()
  @Roles(UserRole.STUDENT)
  @MilestoneRateLimit('milestone_creation')
  @ApiOperation({
    summary: 'Create a new milestone',
    description: 'Create a new milestone for the authenticated student',
  })
  @ApiResponse({
    status: 201,
    description: 'Milestone created successfully',
    type: Milestone,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid milestone data or validation failed',
  })
  @ApiResponse({
    status: 403,
    description: 'Only students can create milestones',
  })
  async createMilestone(
    @Request() req: any,
    @Body() createMilestoneDto: CreateMilestoneDto,
  ): Promise<Milestone> {
    try {
      return await this.milestoneService.createMilestone(
        createMilestoneDto,
        req.user.id,
      );
    } catch (error) {
      if (
        error.message.includes('validation') ||
        error.message.includes('conflict') ||
        error.message.includes('calendar')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get()
  @Roles(UserRole.STUDENT, UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get milestones with filtering and pagination',
    description:
      'Retrieve milestones for the authenticated user with optional filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Milestones retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        milestones: {
          type: 'array',
          items: { $ref: '#/components/schemas/Milestone' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
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
    description: 'Filter by priority level',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    description: 'Filter by project ID',
  })
  @ApiQuery({
    name: 'dueDateFrom',
    required: false,
    type: String,
    description: 'Filter milestones due after this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'dueDateTo',
    required: false,
    type: String,
    description: 'Filter milestones due before this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'isOverdue',
    required: false,
    type: Boolean,
    description: 'Filter by overdue status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for title and description',
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
  async getMilestones(
    @Request() req: any,
    @Query() filters: MilestoneFiltersDto,
  ): Promise<{
    milestones: Milestone[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Validate and sanitize filters
    const sanitizedFilters = this.sanitizeFilters(filters);

    // Students can only see their own milestones
    // Supervisors and admins can see milestones based on their permissions
    let studentId = req.user.id;
    if (req.user.role === UserRole.STUDENT) {
      studentId = req.user.id;
    } else {
      // For supervisors/admins, this would need additional logic to determine
      // which student's milestones to show. For now, default to their own.
      studentId = req.user.id;
    }

    const result = await this.milestoneService.getStudentMilestones(
      studentId,
      sanitizedFilters,
    );

    const page = sanitizedFilters.page || 1;
    const limit = sanitizedFilters.limit || 20;
    const totalPages = Math.ceil(result.total / limit);

    return {
      milestones: result.milestones,
      total: result.total,
      page,
      limit,
      totalPages,
    };
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.SUPERVISOR, UserRole.ADMIN)
  @RequireMilestoneReadAccess()
  @ApiOperation({
    summary: 'Get milestone by ID',
    description: 'Retrieve a specific milestone by its ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Milestone retrieved successfully',
    type: Milestone,
  })
  @ApiResponse({
    status: 404,
    description: 'Milestone not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to this milestone',
  })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  async getMilestoneById(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<Milestone> {
    return await this.milestoneService.getMilestoneById(id, req.user.id);
  }

  @Put(':id')
  @Roles(UserRole.STUDENT)
  @RequireMilestoneWriteAccess()
  @MilestoneRateLimit('milestone_update')
  @ApiOperation({
    summary: 'Update milestone',
    description:
      'Update milestone details (students can only update their own milestones)',
  })
  @ApiResponse({
    status: 200,
    description: 'Milestone updated successfully',
    type: Milestone,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid milestone data or validation failed',
  })
  @ApiResponse({
    status: 403,
    description: 'You can only update your own milestones',
  })
  @ApiResponse({
    status: 404,
    description: 'Milestone not found',
  })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  async updateMilestone(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() updateMilestoneDto: UpdateMilestoneDto,
  ): Promise<Milestone> {
    try {
      return await this.milestoneService.updateMilestone(
        id,
        updateMilestoneDto,
        req.user.id,
      );
    } catch (error) {
      if (error.message.includes('permission')) {
        throw new ForbiddenException(error.message);
      }
      if (
        error.message.includes('validation') ||
        error.message.includes('conflict') ||
        error.message.includes('calendar')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Delete(':id')
  @Roles(UserRole.STUDENT)
  @RequireMilestoneDeleteAccess()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete milestone',
    description:
      'Delete a milestone (students can only delete their own milestones)',
  })
  @ApiResponse({
    status: 204,
    description: 'Milestone deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'You can only delete your own milestones',
  })
  @ApiResponse({
    status: 404,
    description: 'Milestone not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete milestone with dependencies',
  })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  async deleteMilestone(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<void> {
    try {
      await this.milestoneService.deleteMilestone(id, req.user.id);
    } catch (error) {
      if (error.message.includes('permission')) {
        throw new ForbiddenException(error.message);
      }
      if (error.message.includes('dependencies')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Patch(':id/status')
  @Roles(UserRole.STUDENT)
  @RequireMilestoneOwnership()
  @MilestoneRateLimit('milestone_status_update')
  @ApiOperation({
    summary: 'Update milestone status',
    description:
      'Update the status of a milestone with optional notes and progress tracking',
  })
  @ApiResponse({
    status: 200,
    description: 'Milestone status updated successfully',
    type: Milestone,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition or validation failed',
  })
  @ApiResponse({
    status: 403,
    description: 'You can only update your own milestones',
  })
  @ApiResponse({
    status: 404,
    description: 'Milestone not found',
  })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  async updateMilestoneStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() updateStatusDto: UpdateMilestoneStatusDto,
  ): Promise<Milestone> {
    try {
      return await this.milestoneService.updateMilestoneStatus(
        id,
        updateStatusDto,
        req.user.id,
      );
    } catch (error) {
      if (error.message.includes('permission')) {
        throw new ForbiddenException(error.message);
      }
      if (
        error.message.includes('validation') ||
        error.message.includes('transition') ||
        error.message.includes('status')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post(':id/notes')
  @Roles(UserRole.STUDENT, UserRole.SUPERVISOR)
  @RequireMilestoneReadAccess()
  @MilestoneRateLimit('milestone_note_creation')
  @ApiOperation({
    summary: 'Add progress note to milestone',
    description:
      'Add a progress note to a milestone for tracking and communication',
  })
  @ApiResponse({
    status: 201,
    description: 'Note added successfully',
    type: MilestoneNote,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid note data or validation failed',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to this milestone',
  })
  @ApiResponse({
    status: 404,
    description: 'Milestone not found',
  })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  async addMilestoneNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() createNoteDto: CreateMilestoneNoteDto,
  ): Promise<MilestoneNote> {
    try {
      return await this.milestoneService.addMilestoneNote(
        id,
        createNoteDto,
        req.user.id,
      );
    } catch (error) {
      if (error.message.includes('permission')) {
        throw new ForbiddenException(error.message);
      }
      if (error.message.includes('validation')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get(':id/progress')
  @Roles(UserRole.STUDENT, UserRole.SUPERVISOR, UserRole.ADMIN)
  @RequireMilestoneReadAccess()
  @MilestoneRateLimit('progress_calculation')
  @ApiOperation({
    summary: 'Get detailed milestone progress',
    description:
      'Get detailed progress information for a specific milestone including notes and timeline',
  })
  @ApiResponse({
    status: 200,
    description: 'Milestone progress retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        milestone: { $ref: '#/components/schemas/Milestone' },
        progressPercentage: { type: 'number' },
        daysUntilDue: { type: 'number' },
        isOverdue: { type: 'boolean' },
        timeSpent: { type: 'number' },
        estimatedTimeRemaining: { type: 'number' },
        recentNotes: {
          type: 'array',
          items: { $ref: '#/components/schemas/MilestoneNote' },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to this milestone',
  })
  @ApiResponse({
    status: 404,
    description: 'Milestone not found',
  })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  async getMilestoneProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<{
    milestone: Milestone;
    progressPercentage: number;
    daysUntilDue: number;
    isOverdue: boolean;
    timeSpent: number;
    estimatedTimeRemaining: number;
    recentNotes: MilestoneNote[];
  }> {
    const milestone = await this.milestoneService.getMilestoneById(
      id,
      req.user.id,
    );

    // Calculate progress metrics
    const progressPercentage = milestone.getProgressPercentage();
    const daysUntilDue = milestone.getDaysUntilDue();
    const isOverdue = milestone.isOverdue();
    const timeSpent = milestone.actualHours;
    const estimatedTimeRemaining = Math.max(
      0,
      milestone.estimatedHours - milestone.actualHours,
    );

    // Get recent notes (last 5)
    const recentNotes = milestone.notes
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5);

    return {
      milestone,
      progressPercentage,
      daysUntilDue,
      isOverdue,
      timeSpent,
      estimatedTimeRemaining,
      recentNotes,
    };
  }

  @Get('progress/overview')
  @Roles(UserRole.STUDENT, UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get project progress overview',
    description: 'Get overall project progress based on milestone completion',
  })
  @ApiResponse({
    status: 200,
    description: 'Project progress overview retrieved successfully',
    type: ProjectProgressDto,
  })
  async getProjectProgress(@Request() req: any): Promise<ProjectProgressDto> {
    // Students get their own progress, supervisors/admins would need additional logic
    let studentId = req.user.id;
    if (req.user.role === UserRole.STUDENT) {
      studentId = req.user.id;
    } else {
      // For supervisors/admins, this would need additional logic to determine
      // which student's progress to show. For now, default to their own.
      studentId = req.user.id;
    }

    return await this.milestoneService.calculateProjectProgress(studentId);
  }

  @Post('apply-template')
  @Roles(UserRole.STUDENT)
  @MilestoneRateLimit('template_application')
  @ApiOperation({
    summary: 'Apply milestone template',
    description:
      'Apply a milestone template to create a set of milestones for the student',
  })
  @ApiResponse({
    status: 201,
    description: 'Template applied successfully, milestones created',
    schema: {
      type: 'object',
      properties: {
        milestones: {
          type: 'array',
          items: { $ref: '#/components/schemas/Milestone' },
        },
        templateId: { type: 'string' },
        appliedAt: { type: 'string' },
        totalMilestones: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid template application data or validation failed',
  })
  @ApiResponse({
    status: 403,
    description: 'Only students can apply templates',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async applyTemplate(
    @Request() req: any,
    @Body() applyTemplateDto: ApplyTemplateDto,
  ): Promise<{
    milestones: Milestone[];
    templateId: string;
    appliedAt: string;
    totalMilestones: number;
  }> {
    try {
      const milestones = await this.templateApplicationService.applyTemplate(
        applyTemplateDto,
        req.user.id,
      );

      return {
        milestones,
        templateId: applyTemplateDto.templateId,
        appliedAt: new Date().toISOString(),
        totalMilestones: milestones.length,
      };
    } catch (error) {
      if (
        error.message.includes('validation') ||
        error.message.includes('conflict') ||
        error.message.includes('calendar') ||
        error.message.includes('not found')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post('preview-template')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Preview template application',
    description:
      'Preview what milestones would be created when applying a template',
  })
  @ApiResponse({
    status: 200,
    description: 'Template preview generated successfully',
    schema: {
      type: 'object',
      properties: {
        preview: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              dueDate: { type: 'string' },
              priority: { type: 'string' },
              estimatedHours: { type: 'number' },
            },
          },
        },
        templateId: { type: 'string' },
        conflicts: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid template preview data',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async previewTemplate(
    @Request() req: any,
    @Body() applyTemplateDto: ApplyTemplateDto,
  ): Promise<{
    preview: {
      title: string;
      description: string;
      dueDate: string;
      priority: Priority;
      estimatedHours: number;
    }[];
    templateId: string;
    conflicts: string[];
  }> {
    try {
      const preview =
        await this.templateApplicationService.previewTemplateApplication(
          applyTemplateDto,
          req.user.id,
        );

      // Check for conflicts
      const proposedMilestones = preview.map((p) => ({
        title: p.title,
        dueDate: p.dueDate,
      }));

      const conflicts =
        await this.templateApplicationService.detectSchedulingConflicts(
          req.user.id,
          proposedMilestones,
        );

      return {
        preview: preview.map((p) => ({
          ...p,
          dueDate: p.dueDate.toISOString().split('T')[0],
        })),
        templateId: applyTemplateDto.templateId,
        conflicts,
      };
    } catch (error) {
      if (
        error.message.includes('validation') ||
        error.message.includes('not found')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  // Private helper methods
  private sanitizeFilters(filters: MilestoneFiltersDto): MilestoneFiltersDto {
    const sanitized = { ...filters };

    // Ensure page is at least 1
    if (sanitized.page && sanitized.page < 1) {
      sanitized.page = 1;
    }

    // Ensure limit is within bounds
    if (sanitized.limit) {
      sanitized.limit = Math.min(Math.max(sanitized.limit, 1), 100);
    }

    // Validate date formats
    if (
      sanitized.dueDateFrom &&
      !this.isValidDateString(sanitized.dueDateFrom)
    ) {
      delete sanitized.dueDateFrom;
    }

    if (sanitized.dueDateTo && !this.isValidDateString(sanitized.dueDateTo)) {
      delete sanitized.dueDateTo;
    }

    return sanitized;
  }

  private isValidDateString(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}
