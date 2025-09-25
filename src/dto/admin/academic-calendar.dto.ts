import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsArray,
  ValidateNested,
  IsDate,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  AcademicEventType,
  AcademicSemester,
} from '../../entities/academic-calendar.entity';

/**
 * DTO for creating a new academic calendar event
 */
export class CreateAcademicEventDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AcademicEventType)
  eventType: AcademicEventType;

  @IsDateString()
  @Transform(({ value }) => new Date(value))
  startDate: Date;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : null))
  endDate?: Date;

  @IsEnum(AcademicSemester)
  semester: AcademicSemester;

  @IsInt()
  @Min(2020)
  @Max(2050)
  academicYear: number;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean = false;

  @IsOptional()
  @IsBoolean()
  affectsMilestones?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number = 3;

  @IsOptional()
  @IsString()
  importSource?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO for updating an academic calendar event
 */
export class UpdateAcademicEventDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AcademicEventType)
  eventType?: AcademicEventType;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : null))
  endDate?: Date;

  @IsOptional()
  @IsEnum(AcademicSemester)
  semester?: AcademicSemester;

  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2050)
  academicYear?: number;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsBoolean()
  affectsMilestones?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsOptional()
  @IsString()
  importSource?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * DTO for filtering academic calendar events
 */
export class AcademicCalendarFiltersDto {
  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2050)
  @Type(() => Number)
  academicYear?: number;

  @IsOptional()
  @IsEnum(AcademicSemester)
  semester?: AcademicSemester;

  @IsOptional()
  @IsEnum(AcademicEventType)
  eventType?: AcademicEventType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  affectsMilestones?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  priority?: number;

  @IsOptional()
  @IsString()
  sortBy?: string = 'startDate';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;
}

/**
 * DTO for academic year configuration
 */
export class AcademicYearConfigDto {
  @IsInt()
  academicYear: number;

  semesters: {
    [AcademicSemester.FALL]: any[];
    [AcademicSemester.SPRING]: any[];
    [AcademicSemester.SUMMER]: any[];
  };

  holidays: any[];
  breaks: any[];
  examPeriods: any[];

  @IsInt()
  totalEvents: number;

  @IsOptional()
  @IsDate()
  yearStart?: Date;

  @IsOptional()
  @IsDate()
  yearEnd?: Date;
}

/**
 * DTO for milestone adjustment calculations
 */
export class MilestoneAdjustmentDto {
  @IsDate()
  originalDate: Date;

  @IsDate()
  adjustedDate: Date;

  @IsNumber()
  adjustmentDays: number;

  @IsArray()
  conflicts: any[];

  @IsString()
  recommendation: 'no_change' | 'move_before' | 'move_after' | 'reschedule';

  @IsString()
  reason: string;
}

/**
 * DTO for calendar import data
 */
export class CalendarImportEventDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AcademicEventType)
  eventType: AcademicEventType;

  @IsDateString()
  @Transform(({ value }) => new Date(value))
  startDate: Date;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : null))
  endDate?: Date;

  @IsEnum(AcademicSemester)
  semester: AcademicSemester;

  @IsInt()
  @Min(2020)
  @Max(2050)
  academicYear: number;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean = false;

  @IsOptional()
  @IsBoolean()
  affectsMilestones?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number = 3;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CalendarImportDto {
  @IsString()
  source: string;

  @IsOptional()
  @IsBoolean()
  overwrite?: boolean = false;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CalendarImportEventDto)
  events: CalendarImportEventDto[];
}

/**
 * Response DTOs
 */
export class AcademicEventResponseDto {
  id: string;
  title: string;
  description?: string;
  eventType: AcademicEventType;
  startDate: Date;
  endDate?: Date;
  semester: AcademicSemester;
  academicYear: number;
  isRecurring: boolean;
  affectsMilestones: boolean;
  priority: number;
  importSource?: string;
  importedBy?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class CalendarImportResultDto {
  imported: number;
  skipped: number;
  errors: string[];
}

export class CurrentAcademicPeriodDto {
  academicYear: number;
  semester: AcademicSemester;
}

export class DeadlineAdjustmentRequestDto {
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  originalDate: Date;

  @IsInt()
  @Min(2020)
  @Max(2050)
  academicYear: number;

  @IsEnum(AcademicSemester)
  semester: AcademicSemester;
}

export class UpcomingEventsRequestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  days?: number = 30;
}
