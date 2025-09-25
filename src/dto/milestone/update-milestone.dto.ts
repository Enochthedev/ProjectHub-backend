import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsDateString,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Priority } from '../../common/enums/priority.enum';
import { IsFutureDate, IsAcademicYearDate } from '../../common/validators';

export class UpdateMilestoneDto {
  @ApiPropertyOptional({
    description: 'Milestone title - should be descriptive and concise',
    example: 'Complete Literature Review',
    minLength: 3,
    maxLength: 200,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title?: string;

  @ApiPropertyOptional({
    description:
      'Detailed description of the milestone objectives and deliverables',
    example:
      'Complete comprehensive literature review covering recent advances in machine learning for educational analytics',
    minLength: 10,
    maxLength: 1000,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({
    description:
      'Due date for the milestone (must be in the future and within academic year)',
    example: '2024-03-15',
    type: String,
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid date string' })
  @IsFutureDate(
    { minDaysFromNow: 1 },
    { message: 'Due date must be at least 1 day in the future' },
  )
  @IsAcademicYearDate({
    message:
      'Due date must be within the current academic year (September to August)',
  })
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Priority level of the milestone',
    example: Priority.HIGH,
    enum: Priority,
  })
  @IsOptional()
  @IsEnum(Priority, {
    message: `Priority must be one of: ${Object.values(Priority).join(', ')}`,
  })
  priority?: Priority;

  @ApiPropertyOptional({
    description: 'Associated project ID (optional)',
    example: 'uuid-string',
    type: String,
  })
  @IsOptional()
  @IsUUID(4, { message: 'Project ID must be a valid UUID' })
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Estimated hours to complete the milestone',
    example: 40,
    minimum: 1,
    maximum: 1000,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Estimated hours must be an integer' })
  @Min(1, { message: 'Estimated hours must be at least 1' })
  @Max(1000, { message: 'Estimated hours must not exceed 1000' })
  estimatedHours?: number;

  @ApiPropertyOptional({
    description: 'Tags for milestone categorization',
    example: ['research', 'literature-review', 'academic'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @Transform(({ value }) => {
    // Only transform if it's already a valid array with all string items
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
    ) {
      return value
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0);
    }
    // Return original value for validation to catch non-arrays or mixed types
    return value;
  })
  tags?: string[];
}
