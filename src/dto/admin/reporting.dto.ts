import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsDateString,
  IsBoolean,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json',
}

export enum ReportType {
  USER_ANALYTICS = 'user_analytics',
  PROJECT_ANALYTICS = 'project_analytics',
  SYSTEM_HEALTH = 'system_health',
  PLATFORM_USAGE = 'platform_usage',
  MILESTONE_ANALYTICS = 'milestone_analytics',
  AI_ANALYTICS = 'ai_analytics',
  COMPREHENSIVE = 'comprehensive',
}

export enum ReportScheduleFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
}

export class DateRangeDto {
  @ApiProperty({
    description: 'Start date for the report period',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date for the report period',
    example: '2024-01-31T23:59:59Z',
  })
  @IsDateString()
  endDate: string;
}

export class ReportFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by user roles',
    example: ['student', 'supervisor'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userRoles?: string[];

  @ApiPropertyOptional({
    description: 'Filter by project specializations',
    example: ['Computer Science', 'Data Science'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @ApiPropertyOptional({
    description: 'Filter by project approval status',
    example: ['approved', 'pending'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approvalStatuses?: string[];

  @ApiPropertyOptional({
    description: 'Filter by milestone status',
    example: ['completed', 'in_progress'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  milestoneStatuses?: string[];

  @ApiPropertyOptional({
    description: 'Include only active users',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  activeUsersOnly?: boolean;
}

export class GenerateReportDto {
  @ApiProperty({
    description: 'Type of report to generate',
    enum: ReportType,
    example: ReportType.USER_ANALYTICS,
  })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({
    description: 'Report format',
    enum: ReportFormat,
    example: ReportFormat.PDF,
  })
  @IsEnum(ReportFormat)
  format: ReportFormat;

  @ApiProperty({
    description: 'Date range for the report',
    type: DateRangeDto,
  })
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange: DateRangeDto;

  @ApiPropertyOptional({
    description: 'Filters to apply to the report',
    type: ReportFiltersDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportFiltersDto)
  filters?: ReportFiltersDto;

  @ApiPropertyOptional({
    description: 'Custom report title',
    example: 'Monthly Platform Analytics Report',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Include charts and visualizations',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeCharts?: boolean;

  @ApiPropertyOptional({
    description: 'Include detailed breakdowns',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeDetails?: boolean;
}

export class ReportTemplateDto {
  @ApiProperty({
    description: 'Template name',
    example: 'Monthly User Report',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Template description',
    example: 'Comprehensive monthly user analytics report',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Report type',
    enum: ReportType,
  })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({
    description: 'Default format',
    enum: ReportFormat,
  })
  @IsEnum(ReportFormat)
  defaultFormat: ReportFormat;

  @ApiPropertyOptional({
    description: 'Default filters',
    type: ReportFiltersDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReportFiltersDto)
  defaultFilters?: ReportFiltersDto;

  @ApiPropertyOptional({
    description: 'Template configuration',
    example: {
      includeCharts: true,
      includeDetails: false,
      sections: ['summary', 'trends', 'insights'],
    },
  })
  @IsOptional()
  config?: Record<string, any>;
}

export class ScheduleReportDto {
  @ApiProperty({
    description: 'Report template ID',
    example: 'template-uuid',
  })
  @IsUUID()
  templateId: string;

  @ApiProperty({
    description: 'Schedule frequency',
    enum: ReportScheduleFrequency,
  })
  @IsEnum(ReportScheduleFrequency)
  frequency: ReportScheduleFrequency;

  @ApiProperty({
    description: 'Recipients email addresses',
    example: ['admin@university.edu', 'supervisor@university.edu'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @ApiPropertyOptional({
    description: 'Schedule start date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Schedule end date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Additional schedule configuration',
    example: {
      dayOfWeek: 1,
      dayOfMonth: 1,
      timeOfDay: '09:00',
    },
  })
  @IsOptional()
  config?: Record<string, any>;
}

export class ReportMetadataDto {
  @ApiProperty({
    description: 'Report ID',
    example: 'report-uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Report type',
    enum: ReportType,
  })
  type: ReportType;

  @ApiProperty({
    description: 'Report format',
    enum: ReportFormat,
  })
  format: ReportFormat;

  @ApiProperty({
    description: 'Report title',
    example: 'Monthly Platform Analytics Report',
  })
  title: string;

  @ApiProperty({
    description: 'Report generation timestamp',
    example: '2024-01-20T10:30:00Z',
  })
  generatedAt: Date;

  @ApiProperty({
    description: 'Report period',
    type: DateRangeDto,
  })
  period: DateRangeDto;

  @ApiProperty({
    description: 'Generated by admin ID',
    example: 'admin-uuid',
  })
  generatedBy: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
  })
  fileSize: number;

  @ApiProperty({
    description: 'Download URL',
    example: '/api/admin/reports/report-uuid/download',
  })
  downloadUrl: string;

  @ApiProperty({
    description: 'Report status',
    example: 'completed',
  })
  status: 'generating' | 'completed' | 'failed';

  @ApiPropertyOptional({
    description: 'Error message if generation failed',
    example: 'Insufficient data for the specified period',
  })
  @IsOptional()
  error?: string;
}

export class DashboardVisualizationDto {
  @ApiProperty({
    description: 'Chart type',
    example: 'line',
  })
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'gauge';

  @ApiProperty({
    description: 'Chart title',
    example: 'User Growth Over Time',
  })
  title: string;

  @ApiProperty({
    description: 'Chart data',
    example: {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [
        {
          label: 'New Users',
          data: [10, 20, 15],
        },
      ],
    },
  })
  data: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Chart configuration options',
    example: {
      responsive: true,
      maintainAspectRatio: false,
    },
  })
  @IsOptional()
  options?: Record<string, any>;
}

export class DashboardWidgetDto {
  @ApiProperty({
    description: 'Widget ID',
    example: 'user-growth-widget',
  })
  id: string;

  @ApiProperty({
    description: 'Widget title',
    example: 'User Growth',
  })
  title: string;

  @ApiProperty({
    description: 'Widget type',
    example: 'chart',
  })
  type: 'chart' | 'metric' | 'table' | 'list';

  @ApiProperty({
    description: 'Widget size',
    example: { width: 6, height: 4 },
  })
  size: { width: number; height: number };

  @ApiProperty({
    description: 'Widget position',
    example: { x: 0, y: 0 },
  })
  position: { x: number; y: number };

  @ApiPropertyOptional({
    description: 'Widget data',
    type: DashboardVisualizationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DashboardVisualizationDto)
  visualization?: DashboardVisualizationDto;

  @ApiPropertyOptional({
    description: 'Widget configuration',
    example: {
      refreshInterval: 300000,
      autoRefresh: true,
    },
  })
  @IsOptional()
  config?: Record<string, any>;
}

export class CustomDashboardDto {
  @ApiProperty({
    description: 'Dashboard name',
    example: 'Executive Dashboard',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Dashboard description',
    example: 'High-level platform metrics for executives',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Dashboard widgets',
    type: [DashboardWidgetDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardWidgetDto)
  widgets: DashboardWidgetDto[];

  @ApiPropertyOptional({
    description: 'Dashboard layout configuration',
    example: {
      columns: 12,
      rowHeight: 100,
      margin: [10, 10],
    },
  })
  @IsOptional()
  layout?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Dashboard permissions',
    example: ['admin', 'supervisor'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class ReportListQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by report type',
    enum: ReportType,
  })
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @ApiPropertyOptional({
    description: 'Filter by report format',
    enum: ReportFormat,
  })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

  @ApiPropertyOptional({
    description: 'Filter by generation date (from)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  generatedAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter by generation date (to)',
    example: '2024-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  generatedBefore?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}

export class ReportListResponseDto {
  @ApiProperty({
    description: 'List of reports',
    type: [ReportMetadataDto],
  })
  reports: ReportMetadataDto[];

  @ApiProperty({
    description: 'Total number of reports',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total pages',
    example: 5,
  })
  totalPages: number;
}
