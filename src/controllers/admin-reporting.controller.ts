import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Res,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators';
import type { Request } from 'express';
import { UserRole } from '../common/enums/user-role.enum';
import { ReportingEngineService } from '../services/reporting-engine.service';
import { DashboardService } from '../services/dashboard.service';
import {
  GenerateReportDto,
  ReportMetadataDto,
  ReportTemplateDto,
  ScheduleReportDto,
  CustomDashboardDto,
  DashboardWidgetDto,
  ReportListQueryDto,
  ReportListResponseDto,
  ReportFormat,
} from '../dto/admin/reporting.dto';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Admin Reporting')
@ApiBearerAuth()
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminReportingController {
  private readonly logger = new Logger(AdminReportingController.name);

  constructor(
    private readonly reportingService: ReportingEngineService,
    private readonly dashboardService: DashboardService,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new report' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Report generation initiated successfully',
    type: ReportMetadataDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid report configuration',
  })
  @HttpCode(HttpStatus.CREATED)
  async generateReport(
    @Body() generateDto: GenerateReportDto,
    @Req() req: Request,
  ): Promise<ReportMetadataDto> {
    const adminId = req.user?.['sub'];
    this.logger.log(`Admin ${adminId} generating ${generateDto.type} report`);

    return this.reportingService.generateReport(generateDto, adminId);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of generated reports' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reports retrieved successfully',
    type: ReportListResponseDto,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by report type',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Filter by report format',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async getReports(
    @Query() query: ReportListQueryDto,
    @GetUser('id') adminId: string,
  ): Promise<ReportListResponseDto> {
    this.logger.log(`Admin ${adminId} retrieving reports list`);

    // In a real implementation, this would query the database
    // For now, return mock data
    return {
      reports: [],
      total: 0,
      page: query.page || 1,
      limit: query.limit || 20,
      totalPages: 0,
    };
  }

  @Get(':reportId')
  @ApiOperation({ summary: 'Get report metadata' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report metadata retrieved successfully',
    type: ReportMetadataDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Report not found',
  })
  async getReport(
    @Param('reportId') reportId: string,
    @GetUser('id') adminId: string,
  ): Promise<ReportMetadataDto> {
    this.logger.log(`Admin ${adminId} retrieving report ${reportId}`);

    // In a real implementation, this would query the database
    throw new NotFoundException(`Report ${reportId} not found`);
  }

  @Get(':reportId/download')
  @ApiOperation({ summary: 'Download generated report' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report file downloaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Report file not found',
  })
  async downloadReport(
    @Param('reportId') reportId: string,
    @Res() res: Response,
    @GetUser('id') adminId: string,
  ): Promise<void> {
    this.logger.log(`Admin ${adminId} downloading report ${reportId}`);

    const reportsDirectory = path.join(process.cwd(), 'storage', 'reports');

    // Find the report file (check all possible formats)
    const formats = ['json', 'csv', 'html', 'xlsx'];
    let filePath: string | null = null;
    let fileName: string | null = null;

    for (const format of formats) {
      const testPath = path.join(reportsDirectory, `*-${reportId}.${format}`);
      const files = await this.findFiles(
        reportsDirectory,
        `*-${reportId}.${format}`,
      );

      if (files.length > 0) {
        filePath = files[0];
        fileName = path.basename(files[0]);
        break;
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      throw new NotFoundException(`Report file for ${reportId} not found`);
    }

    // Set appropriate headers
    const ext = path.extname(fileName || '').toLowerCase();
    const mimeTypes = {
      '.json': 'application/json',
      '.csv': 'text/csv',
      '.html': 'text/html',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.pdf': 'application/pdf',
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Delete(':reportId')
  @ApiOperation({ summary: 'Delete a generated report' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Report deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Report not found',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReport(
    @Param('reportId') reportId: string,
    @GetUser('id') adminId: string,
  ): Promise<void> {
    this.logger.log(`Admin ${adminId} deleting report ${reportId}`);

    const reportsDirectory = path.join(process.cwd(), 'storage', 'reports');
    const formats = ['json', 'csv', 'html', 'xlsx', 'pdf'];

    let fileDeleted = false;

    for (const format of formats) {
      const files = await this.findFiles(
        reportsDirectory,
        `*-${reportId}.${format}`,
      );

      for (const filePath of files) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          fileDeleted = true;
          this.logger.log(`Deleted report file: ${filePath}`);
        }
      }
    }

    if (!fileDeleted) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }
  }

  // Dashboard endpoints

  @Get('dashboard/realtime')
  @ApiOperation({ summary: 'Get real-time dashboard data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Real-time dashboard data retrieved successfully',
  })
  async getRealTimeDashboard(@GetUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} retrieving real-time dashboard`);

    return this.dashboardService.getRealTimeDashboard(adminId);
  }

  @Post('dashboard/custom')
  @ApiOperation({ summary: 'Create custom dashboard' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Custom dashboard created successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  async createCustomDashboard(
    @Body() dashboardDto: CustomDashboardDto,
    @GetUser('id') adminId: string,
  ) {
    this.logger.log(
      `Admin ${adminId} creating custom dashboard: ${dashboardDto.name}`,
    );

    return this.dashboardService.createCustomDashboard(dashboardDto, adminId);
  }

  @Put('dashboard/:dashboardId/widgets/:widgetId')
  @ApiOperation({ summary: 'Update dashboard widget' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Widget updated successfully',
    type: DashboardWidgetDto,
  })
  async updateDashboardWidget(
    @Param('dashboardId') dashboardId: string,
    @Param('widgetId') widgetId: string,
    @Body() widget: DashboardWidgetDto,
    @GetUser('id') adminId: string,
  ): Promise<DashboardWidgetDto> {
    this.logger.log(
      `Admin ${adminId} updating widget ${widgetId} in dashboard ${dashboardId}`,
    );

    return this.dashboardService.updateDashboardWidget(
      dashboardId,
      widgetId,
      widget,
      adminId,
    );
  }

  @Get('dashboard/widgets/:widgetId/data')
  @ApiOperation({ summary: 'Get widget data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Widget data retrieved successfully',
  })
  async getWidgetData(
    @Param('widgetId') widgetId: string,
    @Query() config: any,
    @GetUser('id') adminId: string,
  ) {
    this.logger.log(`Admin ${adminId} retrieving data for widget ${widgetId}`);

    return this.dashboardService.getWidgetData(widgetId, config);
  }

  @Post('dashboard/refresh')
  @ApiOperation({ summary: 'Refresh dashboard cache' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard cache refreshed successfully',
  })
  @HttpCode(HttpStatus.OK)
  async refreshDashboardCache(@GetUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} refreshing dashboard cache`);

    await this.dashboardService.refreshDashboardCache(adminId);

    return { message: 'Dashboard cache refreshed successfully' };
  }

  // Report templates endpoints

  @Post('templates')
  @ApiOperation({ summary: 'Create report template' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Report template created successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  async createReportTemplate(
    @Body() templateDto: ReportTemplateDto,
    @GetUser('id') adminId: string,
  ) {
    this.logger.log(
      `Admin ${adminId} creating report template: ${templateDto.name}`,
    );

    // In a real implementation, this would save to database
    return {
      id: `template-${Date.now()}`,
      ...templateDto,
      createdBy: adminId,
      createdAt: new Date(),
    };
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get report templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report templates retrieved successfully',
  })
  async getReportTemplates(@GetUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} retrieving report templates`);

    // In a real implementation, this would query the database
    return [];
  }

  @Put('templates/:templateId')
  @ApiOperation({ summary: 'Update report template' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report template updated successfully',
  })
  async updateReportTemplate(
    @Param('templateId') templateId: string,
    @Body() templateDto: ReportTemplateDto,
    @GetUser('id') adminId: string,
  ) {
    this.logger.log(`Admin ${adminId} updating report template ${templateId}`);

    // In a real implementation, this would update in database
    return {
      id: templateId,
      ...templateDto,
      updatedBy: adminId,
      updatedAt: new Date(),
    };
  }

  @Delete('templates/:templateId')
  @ApiOperation({ summary: 'Delete report template' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Report template deleted successfully',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReportTemplate(
    @Param('templateId') templateId: string,
    @GetUser('id') adminId: string,
  ): Promise<void> {
    this.logger.log(`Admin ${adminId} deleting report template ${templateId}`);

    // In a real implementation, this would delete from database
  }

  // Scheduled reports endpoints

  @Post('schedules')
  @ApiOperation({ summary: 'Schedule a report' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Report scheduled successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  async scheduleReport(
    @Body() scheduleDto: ScheduleReportDto,
    @GetUser('id') adminId: string,
  ) {
    this.logger.log(
      `Admin ${adminId} scheduling report with template ${scheduleDto.templateId}`,
    );

    // In a real implementation, this would create a scheduled job
    return {
      id: `schedule-${Date.now()}`,
      ...scheduleDto,
      createdBy: adminId,
      createdAt: new Date(),
      status: 'active',
    };
  }

  @Get('schedules')
  @ApiOperation({ summary: 'Get scheduled reports' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduled reports retrieved successfully',
  })
  async getScheduledReports(@GetUser('id') adminId: string) {
    this.logger.log(`Admin ${adminId} retrieving scheduled reports`);

    // In a real implementation, this would query the database
    return [];
  }

  @Put('schedules/:scheduleId')
  @ApiOperation({ summary: 'Update scheduled report' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduled report updated successfully',
  })
  async updateScheduledReport(
    @Param('scheduleId') scheduleId: string,
    @Body() scheduleDto: ScheduleReportDto,
    @GetUser('id') adminId: string,
  ) {
    this.logger.log(`Admin ${adminId} updating scheduled report ${scheduleId}`);

    // In a real implementation, this would update the scheduled job
    return {
      id: scheduleId,
      ...scheduleDto,
      updatedBy: adminId,
      updatedAt: new Date(),
    };
  }

  @Delete('schedules/:scheduleId')
  @ApiOperation({ summary: 'Delete scheduled report' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Scheduled report deleted successfully',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteScheduledReport(
    @Param('scheduleId') scheduleId: string,
    @GetUser('id') adminId: string,
  ): Promise<void> {
    this.logger.log(`Admin ${adminId} deleting scheduled report ${scheduleId}`);

    // In a real implementation, this would delete the scheduled job
  }

  @Post('schedules/:scheduleId/run')
  @ApiOperation({ summary: 'Run scheduled report immediately' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduled report executed successfully',
  })
  async runScheduledReport(
    @Param('scheduleId') scheduleId: string,
    @GetUser('id') adminId: string,
  ) {
    this.logger.log(
      `Admin ${adminId} running scheduled report ${scheduleId} immediately`,
    );

    // In a real implementation, this would trigger the scheduled job
    return {
      message: 'Scheduled report execution initiated',
      scheduleId,
      executedAt: new Date(),
      executedBy: adminId,
    };
  }

  // Helper methods

  private async findFiles(
    directory: string,
    pattern: string,
  ): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(directory);
      const matchingFiles: string[] = [];

      // Simple pattern matching (in production, use a proper glob library)
      const regex = new RegExp(pattern.replace('*', '.*'));

      for (const file of files) {
        if (regex.test(file)) {
          matchingFiles.push(path.join(directory, file));
        }
      }

      return matchingFiles;
    } catch (error) {
      this.logger.error(`Error finding files in ${directory}:`, error);
      return [];
    }
  }
}
