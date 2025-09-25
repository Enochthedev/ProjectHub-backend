import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsString,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MilestoneStatus } from '../../common/enums/milestone-status.enum';
import { Priority } from '../../common/enums/priority.enum';

export class MilestoneFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by milestone status',
    enum: MilestoneStatus,
  })
  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @ApiPropertyOptional({
    description: 'Filter by priority level',
    enum: Priority,
  })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({
    description: 'Filter by project ID',
    type: String,
  })
  @IsOptional()
  @IsUUID(4, { message: 'Project ID must be a valid UUID' })
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Filter milestones due after this date',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter milestones due before this date',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by overdue status',
    type: Boolean,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isOverdue?: boolean;

  @ApiPropertyOptional({
    description: 'Search term for title and description',
    type: String,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    type: Number,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    type: Number,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
