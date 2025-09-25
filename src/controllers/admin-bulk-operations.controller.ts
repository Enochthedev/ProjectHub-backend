import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';
import { AdminBulkOperationsService } from '../services/admin-bulk-operations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import {
  BulkImportOptionsDto,
  BulkExportOptionsDto,
  UserMigrationOptionsDto,
  CleanupOptionsDto,
  BulkImportResultDto,
  MigrationResultDto,
  CleanupResultDto,
} from '../dto/admin/bulk-operations.dto';

/**
 * Admin Bulk Operations Controller
 *
 * Provides comprehensive bulk operations for user management including:
 * - Bulk user import from CSV with validation and transaction safety
 * - Bulk user export with filtering and multiple formats
 * - User data migration between roles with comprehensive error handling
 * - Data cleanup tools for inactive/unverified users
 * - Operation status tracking and monitoring
 */
@ApiTags('Admin - Bulk Operations')
@ApiBearerAuth('JWT-auth')
@Controller('admin/bulk')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AdminBulkOperationsController {
  constructor(
    private readonly bulkOperationsService: AdminBulkOperationsService,
  ) {}

  /**
   * Import users from CSV data
   * POST /admin/bulk/import
   */
  @ApiOperation({
    summary: 'Import users from CSV data',
    description:
      'Imports multiple users from CSV data with transaction safety and comprehensive error handling.',
  })
  @ApiConsumes('application/json')
  @ApiBody({
    type: BulkImportOptionsDto,
    description: 'CSV import options and data',
    examples: {
      basic: {
        summary: 'Basic CSV import',
        value: {
          csvData:
            'email,role,name,isActive\nstudent1@ui.edu.ng,student,John Doe,true\nstudent2@ui.edu.ng,student,Jane Smith,true',
          sendWelcomeEmails: false,
        },
      },
      withProfiles: {
        summary: 'CSV import with profile data',
        value: {
          csvData:
            'email,role,name,skills,interests,currentYear\nstudent1@ui.edu.ng,student,John Doe,JavaScript;Python,Web Development;AI,4',
          sendWelcomeEmails: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Import completed successfully',
    type: BulkImportResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid CSV data or validation errors',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  async importUsers(
    @Body() importOptions: BulkImportOptionsDto,
    @Req() req: Request,
  ): Promise<BulkImportResultDto> {
    const adminId = req.user?.['sub'];
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.bulkOperationsService.importUsersFromCsv(
      importOptions.csvData,
      adminId,
      importOptions.sendWelcomeEmails,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Export users to CSV or JSON format
   * GET /admin/bulk/export
   */
  @ApiOperation({
    summary: 'Export users to CSV or JSON format',
    description: 'Exports users with filtering options in CSV or JSON format.',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRole,
    description: 'Filter by user role',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: 'boolean',
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'isEmailVerified',
    required: false,
    type: 'boolean',
    description: 'Filter by email verification status',
  })
  @ApiQuery({
    name: 'includeProfiles',
    required: false,
    type: 'boolean',
    description: 'Include user profile data',
    example: true,
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'json'],
    description: 'Export format',
    example: 'csv',
  })
  @ApiQuery({
    name: 'createdAfter',
    required: false,
    type: 'string',
    description: 'Filter users created after this date',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'createdBefore',
    required: false,
    type: 'string',
    description: 'Filter users created before this date',
    example: '2024-12-31T23:59:59Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Export completed successfully',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          example:
            'id,email,role,isActive,isEmailVerified,createdAt,updatedAt\nuuid1,user1@ui.edu.ng,student,true,true,2024-01-01T00:00:00Z,2024-01-01T00:00:00Z',
        },
      },
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
              isActive: { type: 'boolean' },
              isEmailVerified: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @Get('export')
  async exportUsers(
    @Query() exportOptions: BulkExportOptionsDto,
    @Res() res: Response,
  ): Promise<void> {
    // Convert string dates to Date objects
    const processedOptions = {
      ...exportOptions,
      createdAfter: exportOptions.createdAfter
        ? new Date(exportOptions.createdAfter)
        : undefined,
      createdBefore: exportOptions.createdBefore
        ? new Date(exportOptions.createdBefore)
        : undefined,
    };

    if (exportOptions.format === 'json') {
      const data =
        await this.bulkOperationsService.exportUsersToJSON(processedOptions);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="users-export.json"',
      );
      res.json(data);
    } else {
      const csvData =
        await this.bulkOperationsService.exportUsersToCSV(processedOptions);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="users-export.csv"',
      );
      res.send(csvData);
    }
  }

  /**
   * Migrate users between roles
   * POST /admin/bulk/migrate
   */
  @ApiOperation({
    summary: 'Migrate users between roles',
    description:
      'Migrates users from one role to another with transaction safety and profile handling.',
  })
  @ApiBody({
    type: UserMigrationOptionsDto,
    description: 'User migration options',
    examples: {
      basic: {
        summary: 'Basic role migration',
        value: {
          userIds: ['uuid1', 'uuid2', 'uuid3'],
          toRole: 'supervisor',
          preserveProfiles: false,
          dryRun: false,
        },
      },
      dryRun: {
        summary: 'Dry run migration',
        value: {
          userIds: ['uuid1', 'uuid2'],
          fromRole: 'student',
          toRole: 'supervisor',
          preserveProfiles: true,
          dryRun: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Migration completed successfully',
    type: MigrationResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid migration options or user IDs',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @Post('migrate')
  async migrateUsers(
    @Body() migrationOptions: UserMigrationOptionsDto,
    @Req() req: Request,
  ): Promise<MigrationResultDto> {
    const adminId = req.user?.['sub'];
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.bulkOperationsService.migrateUsers(
      migrationOptions.userIds,
      {
        fromRole: migrationOptions.fromRole,
        toRole: migrationOptions.toRole,
        preserveProfiles: migrationOptions.preserveProfiles,
        dryRun: migrationOptions.dryRun,
        batchSize: migrationOptions.batchSize,
      },
      adminId,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Clean up inactive or unverified users
   * POST /admin/bulk/cleanup
   */
  @ApiOperation({
    summary: 'Clean up inactive or unverified users',
    description:
      'Removes inactive or unverified users based on specified criteria with transaction safety.',
  })
  @ApiBody({
    type: CleanupOptionsDto,
    description: 'Cleanup options and criteria',
    examples: {
      basic: {
        summary: 'Basic cleanup',
        value: {
          inactiveForDays: 365,
          unverifiedForDays: 30,
          deleteProfiles: true,
          dryRun: false,
        },
      },
      dryRun: {
        summary: 'Dry run cleanup',
        value: {
          inactiveForDays: 180,
          unverifiedForDays: 14,
          deleteProfiles: true,
          dryRun: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup completed successfully',
    type: CleanupResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid cleanup options',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @Post('cleanup')
  async cleanupUsers(
    @Body() cleanupOptions: CleanupOptionsDto,
    @Req() req: Request,
  ): Promise<CleanupResultDto> {
    const adminId = req.user?.['sub'];
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.bulkOperationsService.cleanupUsers(
      {
        inactiveForDays: cleanupOptions.inactiveForDays,
        unverifiedForDays: cleanupOptions.unverifiedForDays,
        deleteProfiles: cleanupOptions.deleteProfiles,
        dryRun: cleanupOptions.dryRun,
        batchSize: cleanupOptions.batchSize,
      },
      adminId,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Get CSV template for user import
   * GET /admin/bulk/import-template
   */
  @ApiOperation({
    summary: 'Get CSV template for user import',
    description:
      'Downloads a CSV template file with proper headers and example data for user import.',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRole,
    description: 'Generate template for specific role',
  })
  @ApiProduces('text/csv')
  @ApiResponse({
    status: 200,
    description: 'CSV template downloaded successfully',
    content: {
      'text/csv': {
        schema: {
          type: 'string',
          example:
            'email,role,name,isActive,isEmailVerified,skills,interests,preferredSpecializations,currentYear,gpa\nexample@ui.edu.ng,student,Example User,true,false,JavaScript;Python,Web Development;AI,Computer Science,4,3.8',
        },
      },
    },
  })
  @Get('import-template')
  async getImportTemplate(
    @Query('role') role?: UserRole,
    @Res() res?: Response,
  ): Promise<void> {
    let csvTemplate = '';

    if (role === UserRole.STUDENT) {
      csvTemplate = [
        'email,role,name,isActive,isEmailVerified,skills,interests,preferredSpecializations,currentYear,gpa',
        'student1@ui.edu.ng,student,John Doe,true,false,JavaScript;Python,Web Development;AI,Computer Science,4,3.8',
        'student2@ui.edu.ng,student,Jane Smith,true,false,React;Node.js,Full Stack Development,Software Engineering,3,3.5',
      ].join('\n');
    } else if (role === UserRole.SUPERVISOR) {
      csvTemplate = [
        'email,role,name,isActive,isEmailVerified,specializations,maxStudents,officeLocation,phoneNumber',
        'supervisor1@ui.edu.ng,supervisor,Dr. John Professor,true,true,Artificial Intelligence;Machine Learning,5,Room 201 CS Building,+234-xxx-xxx-xxxx',
        'supervisor2@ui.edu.ng,supervisor,Dr. Jane Expert,true,true,Web Development;Software Engineering,8,Room 305 CS Building,+234-xxx-xxx-xxxx',
      ].join('\n');
    } else {
      // General template with all possible fields
      csvTemplate = [
        'email,role,name,isActive,isEmailVerified,skills,interests,preferredSpecializations,currentYear,gpa,specializations,maxStudents,officeLocation,phoneNumber',
        'student@ui.edu.ng,student,Student Name,true,false,JavaScript;Python,Web Development,Computer Science,4,3.8,,,,',
        'supervisor@ui.edu.ng,supervisor,Dr. Supervisor Name,true,true,,,,,Artificial Intelligence,5,Room 201,+234-xxx-xxx-xxxx',
      ].join('\n');
    }

    res!.setHeader('Content-Type', 'text/csv');
    res!.setHeader(
      'Content-Disposition',
      `attachment; filename="user-import-template${role ? `-${role}` : ''}.csv"`,
    );
    res!.send(csvTemplate);
  }
}
