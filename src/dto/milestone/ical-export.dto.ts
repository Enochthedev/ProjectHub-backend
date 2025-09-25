import {
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUUID,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ICalExportOptionsDto {
  @ApiPropertyOptional({
    description: 'Include completed milestones in export',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  includeCompleted?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include cancelled milestones in export',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  includeCancelled?: boolean = false;

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
    description: 'Filter by specific project ID',
    example: 'uuid-project-id',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

export class BulkICalExportDto {
  @ApiProperty({
    description: 'Array of student IDs to export milestones for',
    type: [String],
    example: ['uuid-student-1', 'uuid-student-2'],
  })
  @IsArray()
  @IsUUID(4, { each: true })
  studentIds: string[];

  @ApiPropertyOptional({
    description: 'Export options',
    type: ICalExportOptionsDto,
  })
  @IsOptional()
  @Type(() => ICalExportOptionsDto)
  options?: ICalExportOptionsDto;
}

export class ICalExportResponseDto {
  @ApiProperty({
    description: 'The iCal calendar content',
    example: 'BEGIN:VCALENDAR\nVERSION:2.0\n...',
  })
  calendar: string;

  @ApiProperty({
    description: 'Suggested filename for the export',
    example: 'milestones-john-doe-2024-01-15.ics',
  })
  filename: string;

  @ApiProperty({
    description: 'MIME type of the export',
    example: 'text/calendar',
  })
  mimeType: string;

  @ApiProperty({
    description: 'Number of milestones included in the export',
    example: 15,
  })
  milestoneCount: number;

  @ApiProperty({
    description: 'Export generation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  generatedAt: string;
}
