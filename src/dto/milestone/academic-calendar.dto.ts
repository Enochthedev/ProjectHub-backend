import {
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsDateString,
  IsJSON,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AcademicEventType,
  AcademicSemester,
} from '../../entities/academic-calendar.entity';

export class ImportAcademicCalendarDto {
  @ApiProperty({
    description: 'Source of the calendar data',
    example: 'University Academic Calendar 2024',
  })
  @IsString()
  source: string;

  @ApiProperty({
    description: 'Format of the calendar data',
    enum: ['ics', 'json', 'csv'],
    example: 'json',
  })
  @IsEnum(['ics', 'json', 'csv'])
  format: 'ics' | 'json' | 'csv';

  @ApiProperty({
    description: 'Calendar data in the specified format',
    example:
      '[{"title": "Fall Semester Start", "startDate": "2024-08-26", "type": "semester_start"}]',
  })
  @IsString()
  data: string;

  @ApiProperty({
    description: 'Academic year for the calendar',
    example: 2024,
  })
  @IsNumber()
  @Min(2020)
  @Max(2030)
  academicYear: number;

  @ApiPropertyOptional({
    description: 'Specific semester (optional)',
    enum: AcademicSemester,
    example: AcademicSemester.FALL,
  })
  @IsOptional()
  @IsEnum(AcademicSemester)
  semester?: AcademicSemester;
}

export class CreateAcademicEventDto {
  @ApiProperty({
    description: 'Event title',
    example: 'Spring Break',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Event description',
    example: 'University-wide spring break period',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Type of academic event',
    enum: AcademicEventType,
    example: AcademicEventType.BREAK,
  })
  @IsEnum(AcademicEventType)
  eventType: AcademicEventType;

  @ApiProperty({
    description: 'Event start date (YYYY-MM-DD)',
    example: '2024-03-11',
  })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({
    description: 'Event end date (YYYY-MM-DD)',
    example: '2024-03-15',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Academic semester',
    enum: AcademicSemester,
    example: AcademicSemester.SPRING,
  })
  @IsEnum(AcademicSemester)
  semester: AcademicSemester;

  @ApiProperty({
    description: 'Academic year',
    example: 2024,
  })
  @IsNumber()
  @Min(2020)
  @Max(2030)
  academicYear: number;

  @ApiProperty({
    description: 'Whether the event recurs annually',
    default: false,
  })
  @IsBoolean()
  isRecurring: boolean = false;

  @ApiProperty({
    description: 'Whether the event affects milestone scheduling',
    default: true,
  })
  @IsBoolean()
  affectsMilestones: boolean = true;

  @ApiProperty({
    description: 'Event priority (1-5, higher is more important)',
    minimum: 1,
    maximum: 5,
    default: 3,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  priority: number = 3;
}

export class UpdateAcademicEventDto {
  @ApiPropertyOptional({
    description: 'Event title',
    example: 'Spring Break',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Event description',
    example: 'University-wide spring break period',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Type of academic event',
    enum: AcademicEventType,
    example: AcademicEventType.BREAK,
  })
  @IsOptional()
  @IsEnum(AcademicEventType)
  eventType?: AcademicEventType;

  @ApiPropertyOptional({
    description: 'Event start date (YYYY-MM-DD)',
    example: '2024-03-11',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Event end date (YYYY-MM-DD)',
    example: '2024-03-15',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Academic semester',
    enum: AcademicSemester,
    example: AcademicSemester.SPRING,
  })
  @IsOptional()
  @IsEnum(AcademicSemester)
  semester?: AcademicSemester;

  @ApiPropertyOptional({
    description: 'Academic year',
    example: 2024,
  })
  @IsOptional()
  @IsNumber()
  @Min(2020)
  @Max(2030)
  academicYear?: number;

  @ApiPropertyOptional({
    description: 'Whether the event recurs annually',
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the event affects milestone scheduling',
  })
  @IsOptional()
  @IsBoolean()
  affectsMilestones?: boolean;

  @ApiPropertyOptional({
    description: 'Event priority (1-5, higher is more important)',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;
}

export class AcademicEventResponseDto {
  @ApiProperty({
    description: 'Event ID',
    example: 'uuid-event-id',
  })
  id: string;

  @ApiProperty({
    description: 'Event title',
    example: 'Spring Break',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Event description',
    example: 'University-wide spring break period',
  })
  description: string | null;

  @ApiProperty({
    description: 'Type of academic event',
    enum: AcademicEventType,
    example: AcademicEventType.BREAK,
  })
  eventType: AcademicEventType;

  @ApiProperty({
    description: 'Event start date',
    example: '2024-03-11',
  })
  startDate: string;

  @ApiPropertyOptional({
    description: 'Event end date',
    example: '2024-03-15',
  })
  endDate: string | null;

  @ApiProperty({
    description: 'Academic semester',
    enum: AcademicSemester,
    example: AcademicSemester.SPRING,
  })
  semester: AcademicSemester;

  @ApiProperty({
    description: 'Academic year',
    example: 2024,
  })
  academicYear: number;

  @ApiProperty({
    description: 'Whether the event recurs annually',
    example: false,
  })
  isRecurring: boolean;

  @ApiProperty({
    description: 'Whether the event affects milestone scheduling',
    example: true,
  })
  affectsMilestones: boolean;

  @ApiProperty({
    description: 'Event priority (1-5)',
    example: 4,
  })
  priority: number;

  @ApiProperty({
    description: 'Event duration in days',
    example: 5,
  })
  duration: number;

  @ApiProperty({
    description: 'Whether the event is currently active',
    example: false,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Conflict severity level',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'high',
  })
  conflictSeverity: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({
    description: 'Event creation timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Event update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: string;
}

export class MilestoneConflictCheckDto {
  @ApiProperty({
    description: 'Whether conflicts were found',
    example: true,
  })
  hasConflicts: boolean;

  @ApiProperty({
    description: 'Conflicting academic events',
    type: [AcademicEventResponseDto],
  })
  conflicts: AcademicEventResponseDto[];

  @ApiProperty({
    description: 'Suggested milestone adjustments',
    type: [Object],
  })
  suggestions: {
    milestoneId: string;
    originalDate: string;
    adjustedDate: string;
    reason: string;
    conflictingEvents: AcademicEventResponseDto[];
  }[];
}

export class MilestoneAdjustmentResponseDto {
  @ApiProperty({
    description: 'Milestone ID',
    example: 'uuid-milestone-id',
  })
  milestoneId: string;

  @ApiProperty({
    description: 'Original due date',
    example: '2024-03-13',
  })
  originalDate: string;

  @ApiProperty({
    description: 'Adjusted due date',
    example: '2024-03-18',
  })
  adjustedDate: string;

  @ApiProperty({
    description: 'Reason for adjustment',
    example: 'Avoiding Spring Break conflict',
  })
  reason: string;

  @ApiProperty({
    description: 'Conflicting events that caused the adjustment',
    type: [AcademicEventResponseDto],
  })
  conflictingEvents: AcademicEventResponseDto[];
}

export class AcademicCalendarQueryDto {
  @ApiPropertyOptional({
    description: 'Academic year to filter by',
    example: 2024,
  })
  @IsOptional()
  @IsNumber()
  @Min(2020)
  @Max(2030)
  academicYear?: number;

  @ApiPropertyOptional({
    description: 'Semester to filter by',
    enum: AcademicSemester,
    example: AcademicSemester.FALL,
  })
  @IsOptional()
  @IsEnum(AcademicSemester)
  semester?: AcademicSemester;

  @ApiPropertyOptional({
    description: 'Start date for date range filter (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for date range filter (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by event type',
    enum: AcademicEventType,
    example: AcademicEventType.HOLIDAY,
  })
  @IsOptional()
  @IsEnum(AcademicEventType)
  eventType?: AcademicEventType;

  @ApiPropertyOptional({
    description: 'Filter by events that affect milestones',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  affectsMilestones?: boolean;
}
