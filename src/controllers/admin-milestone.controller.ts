import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
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
  ApiBody,
} from '@nestjs/swagger';
import { MilestoneTemplateService } from '../services/milestone-template.service';
import { AcademicCalendarService } from '../services/academic-calendar.service';
import { CalendarImportDto } from '../dto/admin/academic-calendar.dto';
import { MilestoneReminderJobService } from '../services/milestone-reminder-job.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateFiltersDto,
  TemplateUsageStatsDto,
} from '../dto/milestone';
import { MilestoneTemplate } from '../entities/milestone-template.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ProjectType } from '../common/enums/project-type.enum';

// DTOs for admin operations
// Using CalendarImportDto from the proper DTO file

export class ReminderConfigurationDto {
  enabled: boolean;
  advanceReminderDays: number[];
  overdueReminderDays: number[];
  escalationDays: number;
  emailTemplate?: string;
  maxRetries: number;
  retryIntervalHours: number;
}

export class SystemConfigurationDto {
  academicYearStart: string; // YYYY-MM-DD
  academicYearEnd: string; // YYYY-MM-DD
  defaultReminderSettings: ReminderConfigurationDto;
  milestoneValidationRules: {
    minDaysInFuture: number;
    maxDaysInFuture: number;
    allowWeekends: boolean;
    allowHolidays: boolean;
  };
  templateApprovalRequired: boolean;
  maxMilestonesPerStudent: number;
}

@ApiTags('admin-milestone')
@ApiBearerAuth('JWT-auth')
@Controller('admin/milestone')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminMilestoneController {
  constructor(
    private readonly templateService: MilestoneTemplateService,
    private readonly academicCalendarService: AcademicCalendarService,
    private readonly reminderJobService: MilestoneReminderJobService,
  ) {}

  // Template Management Endpoints

  @Get('templates')
  @ApiOperation({
    summary: 'Get all milestone templates (admin)',
    description:
      'Get all milestone templates with advanced filtering and management options',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        templates: {
          type: 'array',
          items: { $ref: '#/components/schemas/MilestoneTemplate' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
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
    description: 'Search in name, description, or specialization',
  })
  @ApiQuery({
    name: 'createdBy',
    required: false,
    type: String,
    description: 'Filter by creator ID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  async getAllTemplates(@Query() filters: TemplateFiltersDto): Promise<{
    templates: MilestoneTemplate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.templateService.getTemplates(filters);
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const totalPages = Math.ceil(result.total / limit);

    return {
      templates: result.templates,
      total: result.total,
      page,
      limit,
      totalPages,
    };
  }

  @Post('templates')
  @ApiOperation({
    summary: 'Create milestone template (admin)',
    description: 'Create a new milestone template for use across the platform',
  })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    type: MilestoneTemplate,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid template data or validation failed',
  })
  @ApiBody({ type: CreateTemplateDto })
  async createTemplate(
    @Request() req: any,
    @Body() createTemplateDto: CreateTemplateDto,
  ): Promise<MilestoneTemplate> {
    try {
      return await this.templateService.createTemplate(
        createTemplateDto,
        req.user.id,
      );
    } catch (error) {
      if (
        error.message.includes('validation') ||
        error.message.includes('exists')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Put('templates/:id')
  @ApiOperation({
    summary: 'Update milestone template (admin)',
    description: 'Update an existing milestone template',
  })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    type: MilestoneTemplate,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid template data or validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  @ApiBody({ type: UpdateTemplateDto })
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ): Promise<MilestoneTemplate> {
    try {
      return await this.templateService.updateTemplate(
        id,
        updateTemplateDto,
        req.user.id,
      );
    } catch (error) {
      if (
        error.message.includes('validation') ||
        error.message.includes('exists')
      ) {
        throw new BadRequestException(error.message);
      }
      if (error.message.includes('not found')) {
        throw new BadRequestException('Template not found');
      }
      throw error;
    }
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete milestone template (admin)',
    description: 'Delete a milestone template (only if not in use)',
  })
  @ApiResponse({
    status: 204,
    description: 'Template deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Template is in use and cannot be deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  async deleteTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<void> {
    try {
      await this.templateService.deleteTemplate(id, req.user.id);
    } catch (error) {
      if (
        error.message.includes('used') ||
        error.message.includes('validation')
      ) {
        throw new BadRequestException(error.message);
      }
      if (error.message.includes('not found')) {
        throw new BadRequestException('Template not found');
      }
      throw error;
    }
  }

  @Patch('templates/:id/archive')
  @ApiOperation({
    summary: 'Archive milestone template (admin)',
    description:
      'Archive a milestone template (makes it inactive but preserves it)',
  })
  @ApiResponse({
    status: 200,
    description: 'Template archived successfully',
    type: MilestoneTemplate,
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  async archiveTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<MilestoneTemplate> {
    try {
      return await this.templateService.archiveTemplate(id, req.user.id);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new BadRequestException('Template not found');
      }
      throw error;
    }
  }

  @Patch('templates/:id/restore')
  @ApiOperation({
    summary: 'Restore archived template (admin)',
    description: 'Restore an archived milestone template',
  })
  @ApiResponse({
    status: 200,
    description: 'Template restored successfully',
    type: MilestoneTemplate,
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  async restoreTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ): Promise<MilestoneTemplate> {
    try {
      return await this.templateService.restoreTemplate(id, req.user.id);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new BadRequestException('Template not found');
      }
      throw error;
    }
  }

  @Post('templates/:id/duplicate')
  @ApiOperation({
    summary: 'Duplicate milestone template (admin)',
    description: 'Create a copy of an existing milestone template',
  })
  @ApiResponse({
    status: 201,
    description: 'Template duplicated successfully',
    type: MilestoneTemplate,
  })
  @ApiResponse({
    status: 400,
    description: 'Duplicate name conflict or validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  @ApiParam({ name: 'id', description: 'Template UUID to duplicate' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        newName: {
          type: 'string',
          description: 'Name for the duplicated template',
        },
      },
    },
  })
  async duplicateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body('newName') newName?: string,
  ): Promise<MilestoneTemplate> {
    try {
      return await this.templateService.duplicateTemplate(
        id,
        req.user.id,
        newName,
      );
    } catch (error) {
      if (
        error.message.includes('validation') ||
        error.message.includes('exists')
      ) {
        throw new BadRequestException(error.message);
      }
      if (error.message.includes('not found')) {
        throw new BadRequestException('Template not found');
      }
      throw error;
    }
  }

  @Get('templates/:id/usage-stats')
  @ApiOperation({
    summary: 'Get template usage statistics (admin)',
    description: 'Get detailed usage statistics for a milestone template',
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
    try {
      return await this.templateService.getTemplateUsageStats(id);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new BadRequestException('Template not found');
      }
      throw error;
    }
  }

  // Academic Calendar Management Endpoints

  @Post('academic-calendar/import')
  @ApiOperation({
    summary: 'Import academic calendar (admin)',
    description:
      'Import academic calendar events from various formats (ICS, JSON, CSV)',
  })
  @ApiResponse({
    status: 201,
    description: 'Academic calendar imported successfully',
    schema: {
      type: 'object',
      properties: {
        importedEvents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              eventType: { type: 'string' },
              startDate: { type: 'string' },
              endDate: { type: 'string' },
              semester: { type: 'string' },
              academicYear: { type: 'number' },
            },
          },
        },
        totalImported: { type: 'number' },
        adjustedMilestones: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid calendar data or format',
  })
  @ApiBody({ type: CalendarImportDto })
  async importAcademicCalendar(
    @Request() req: any,
    @Body() importDto: CalendarImportDto,
  ): Promise<{
    importedEvents: number;
    totalImported: number;
    adjustedMilestones: number;
    skipped: number;
    errors: string[];
  }> {
    try {
      const result = await this.academicCalendarService.importCalendarEvents(
        importDto,
        req.user.id,
      );

      return {
        importedEvents: result.imported,
        totalImported: result.imported,
        adjustedMilestones: 0, // This would be calculated by the service
        skipped: result.skipped,
        errors: result.errors,
      };
    } catch (error) {
      if (
        error.message.includes('validation') ||
        error.message.includes('format')
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get('academic-calendar')
  @ApiOperation({
    summary: 'Get academic calendar events (admin)',
    description: 'Get academic calendar events for management and review',
  })
  @ApiResponse({
    status: 200,
    description: 'Academic calendar events retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          eventType: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          semester: { type: 'string' },
          academicYear: { type: 'number' },
          affectsMilestones: { type: 'boolean' },
        },
      },
    },
  })
  @ApiQuery({
    name: 'academicYear',
    required: true,
    type: Number,
    description: 'Academic year to retrieve',
  })
  @ApiQuery({
    name: 'semester',
    required: false,
    enum: ['fall', 'spring', 'summer'],
    description: 'Specific semester to filter by',
  })
  async getAcademicCalendar(
    @Query('academicYear') academicYear: number,
    @Query('semester') semester?: 'fall' | 'spring' | 'summer',
  ): Promise<any> {
    if (!academicYear || academicYear < 2020 || academicYear > 2030) {
      throw new BadRequestException(
        'Valid academic year is required (2020-2030)',
      );
    }

    return await this.academicCalendarService.getCalendarEvents({
      academicYear,
      semester: semester as any,
    });
  }

  // System Configuration Endpoints

  @Get('reminder-configuration')
  @ApiOperation({
    summary: 'Get reminder system configuration (admin)',
    description:
      'Get current reminder system configuration and monitoring status',
  })
  @ApiResponse({
    status: 200,
    description: 'Reminder configuration retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        configuration: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            advanceReminderDays: { type: 'array', items: { type: 'number' } },
            overdueReminderDays: { type: 'array', items: { type: 'number' } },
            escalationDays: { type: 'number' },
            maxRetries: { type: 'number' },
            retryIntervalHours: { type: 'number' },
          },
        },
        status: {
          type: 'object',
          properties: {
            lastJobRun: { type: 'string' },
            nextJobRun: { type: 'string' },
            totalRemindersProcessed: { type: 'number' },
            failedReminders: { type: 'number' },
            isHealthy: { type: 'boolean' },
          },
        },
      },
    },
  })
  async getReminderConfiguration(): Promise<{
    configuration: ReminderConfigurationDto;
    status: {
      lastJobRun: string | null;
      nextJobRun: string | null;
      totalRemindersProcessed: number;
      failedReminders: number;
      isHealthy: boolean;
    };
  }> {
    const status = this.reminderJobService.getJobStatus();

    // Default configuration - in a real implementation, this would come from a config service
    const configuration: ReminderConfigurationDto = {
      enabled: true,
      advanceReminderDays: [7, 3, 1],
      overdueReminderDays: [1, 3, 7],
      escalationDays: 3,
      maxRetries: 3,
      retryIntervalHours: 2,
    };

    return {
      configuration,
      status: {
        lastJobRun: null, // Would need to track this in a real implementation
        nextJobRun: null, // Would need to track this in a real implementation
        totalRemindersProcessed: 0, // Would need to track this in a real implementation
        failedReminders: 0, // Would need to track this in a real implementation
        isHealthy:
          !status.isProcessingReminders && !status.isProcessingEscalations,
      },
    };
  }

  @Put('reminder-configuration')
  @ApiOperation({
    summary: 'Update reminder system configuration (admin)',
    description:
      'Update reminder system configuration and restart jobs if needed',
  })
  @ApiResponse({
    status: 200,
    description: 'Reminder configuration updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        configuration: {
          $ref: '#/components/schemas/ReminderConfigurationDto',
        },
        restartRequired: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid configuration parameters',
  })
  @ApiBody({ type: ReminderConfigurationDto })
  async updateReminderConfiguration(
    @Body() configDto: ReminderConfigurationDto,
  ): Promise<{
    message: string;
    configuration: ReminderConfigurationDto;
    restartRequired: boolean;
  }> {
    // Validate configuration
    if (configDto.advanceReminderDays.some((days) => days < 0 || days > 30)) {
      throw new BadRequestException(
        'Advance reminder days must be between 0 and 30',
      );
    }

    if (configDto.overdueReminderDays.some((days) => days < 0 || days > 30)) {
      throw new BadRequestException(
        'Overdue reminder days must be between 0 and 30',
      );
    }

    if (configDto.escalationDays < 1 || configDto.escalationDays > 14) {
      throw new BadRequestException('Escalation days must be between 1 and 14');
    }

    if (configDto.maxRetries < 1 || configDto.maxRetries > 10) {
      throw new BadRequestException('Max retries must be between 1 and 10');
    }

    if (configDto.retryIntervalHours < 1 || configDto.retryIntervalHours > 24) {
      throw new BadRequestException(
        'Retry interval must be between 1 and 24 hours',
      );
    }

    // TODO: In a real implementation, save configuration to database or config service
    // TODO: Restart reminder jobs if configuration changed significantly

    return {
      message: 'Reminder configuration updated successfully',
      configuration: configDto,
      restartRequired: false, // Would be determined based on what changed
    };
  }

  @Post('reminder-jobs/trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually trigger reminder processing (admin)',
    description:
      'Manually trigger the reminder processing job for testing or immediate execution',
  })
  @ApiResponse({
    status: 200,
    description: 'Reminder job triggered successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        jobId: { type: 'string' },
        processedReminders: { type: 'number' },
        failedReminders: { type: 'number' },
        executionTime: { type: 'number' },
      },
    },
  })
  async triggerReminderJob(): Promise<{
    message: string;
    jobId: string;
    processedReminders: number;
    failedReminders: number;
    executionTime: number;
  }> {
    const result = await this.reminderJobService.manualProcessReminders();

    return {
      message: 'Reminder job executed successfully',
      jobId: `manual-${Date.now()}`,
      processedReminders: result.processedReminders,
      failedReminders: result.failedReminders,
      executionTime: result.executionTime,
    };
  }

  @Get('system-health')
  @ApiOperation({
    summary: 'Get milestone system health status (admin)',
    description:
      'Get comprehensive health status of the milestone tracking system',
  })
  @ApiResponse({
    status: 200,
    description: 'System health status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        overall: { type: 'string', enum: ['healthy', 'warning', 'critical'] },
        components: {
          type: 'object',
          properties: {
            database: {
              type: 'string',
              enum: ['healthy', 'warning', 'critical'],
            },
            reminderJobs: {
              type: 'string',
              enum: ['healthy', 'warning', 'critical'],
            },
            academicCalendar: {
              type: 'string',
              enum: ['healthy', 'warning', 'critical'],
            },
            templates: {
              type: 'string',
              enum: ['healthy', 'warning', 'critical'],
            },
          },
        },
        metrics: {
          type: 'object',
          properties: {
            totalMilestones: { type: 'number' },
            activeMilestones: { type: 'number' },
            overdueMilestones: { type: 'number' },
            totalTemplates: { type: 'number' },
            activeTemplates: { type: 'number' },
            pendingReminders: { type: 'number' },
          },
        },
        lastChecked: { type: 'string' },
      },
    },
  })
  async getSystemHealth(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    components: {
      database: 'healthy' | 'warning' | 'critical';
      reminderJobs: 'healthy' | 'warning' | 'critical';
      academicCalendar: 'healthy' | 'warning' | 'critical';
      templates: 'healthy' | 'warning' | 'critical';
    };
    metrics: {
      totalMilestones: number;
      activeMilestones: number;
      overdueMilestones: number;
      totalTemplates: number;
      activeTemplates: number;
      pendingReminders: number;
    };
    lastChecked: string;
  }> {
    // TODO: Implement actual health checks
    // This is a placeholder implementation

    const reminderStatus = await this.reminderJobService.getJobStatus();
    const templatesResult = await this.templateService.getTemplates({
      limit: 1,
    });

    return {
      overall: 'healthy',
      components: {
        database: 'healthy',
        reminderJobs:
          !reminderStatus.isProcessingReminders &&
          !reminderStatus.isProcessingEscalations
            ? 'healthy'
            : 'warning',
        academicCalendar: 'healthy',
        templates: 'healthy',
      },
      metrics: {
        totalMilestones: 0, // Would query actual count
        activeMilestones: 0, // Would query actual count
        overdueMilestones: 0, // Would query actual count
        totalTemplates: templatesResult.total,
        activeTemplates: 0, // Would query actual count
        pendingReminders: 0, // Would query actual count
      },
      lastChecked: new Date().toISOString(),
    };
  }
}
