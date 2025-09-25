import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsUUID,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority } from '../../common/enums';
import { IsFutureDate, IsAcademicYearDate } from '../../common/validators';

export class TemplateMilestoneCustomizationDto {
  @ApiProperty({
    description: 'Original milestone title from template to customize',
    example: 'Literature Review',
  })
  @IsString({ message: 'Milestone title must be a string' })
  @IsNotEmpty({ message: 'Milestone title cannot be empty' })
  @MinLength(3, {
    message: 'Milestone title must be at least 3 characters long',
  })
  @MaxLength(200, { message: 'Milestone title must not exceed 200 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  milestoneTitle: string;

  @ApiPropertyOptional({
    description: 'New title for the milestone (if customizing)',
    example: 'Comprehensive Literature Review and Analysis',
  })
  @IsOptional()
  @IsString({ message: 'New title must be a string' })
  @MinLength(3, { message: 'New title must be at least 3 characters long' })
  @MaxLength(200, { message: 'New title must not exceed 200 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  newTitle?: string;

  @ApiPropertyOptional({
    description: 'New description for the milestone (if customizing)',
    example:
      'Conduct comprehensive literature review focusing on recent advances in machine learning',
  })
  @IsOptional()
  @IsString({ message: 'New description must be a string' })
  @MinLength(10, {
    message: 'New description must be at least 10 characters long',
  })
  @MaxLength(1000, {
    message: 'New description must not exceed 1000 characters',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  newDescription?: string;

  @ApiPropertyOptional({
    description:
      'New number of days from project start (if customizing timing)',
    example: 14,
    minimum: 0,
    maximum: 365,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Days from start must be an integer' })
  @Min(0, { message: 'Days from start must be at least 0' })
  @Max(365, { message: 'Days from start must not exceed 365' })
  newDaysFromStart?: number;

  @ApiPropertyOptional({
    description: 'New priority level for the milestone',
    example: Priority.HIGH,
    enum: Priority,
  })
  @IsOptional()
  @IsEnum(Priority, {
    message: `Priority must be one of: ${Object.values(Priority).join(', ')}`,
  })
  priority?: Priority;

  @ApiPropertyOptional({
    description: 'New estimated hours for the milestone',
    example: 60,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Estimated hours must be an integer' })
  @Min(1, { message: 'Estimated hours must be at least 1' })
  @Max(1000, { message: 'Estimated hours must not exceed 1000' })
  newEstimatedHours?: number;

  @ApiPropertyOptional({
    description: 'Whether to exclude this milestone from the applied template',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Exclude must be a boolean value' })
  exclude?: boolean;
}

export class ApplyTemplateDto {
  @ApiProperty({
    description: 'ID of the template to apply',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString({ message: 'Template ID must be a string' })
  @IsNotEmpty({ message: 'Template ID cannot be empty' })
  @IsUUID(4, { message: 'Template ID must be a valid UUID' })
  templateId: string;

  @ApiProperty({
    description:
      'Start date for the project (milestones will be calculated from this date)',
    example: '2024-03-01',
    type: String,
    format: 'date',
  })
  @IsDateString({}, { message: 'Start date must be a valid date string' })
  @IsFutureDate(
    { allowToday: true },
    { message: 'Start date must be today or in the future' },
  )
  @IsAcademicYearDate({
    message:
      'Start date must be within the current academic year (September to August)',
  })
  startDate: string;

  @ApiPropertyOptional({
    description: 'Associated project ID (optional)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsString({ message: 'Project ID must be a string' })
  @IsUUID(4, { message: 'Project ID must be a valid UUID' })
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Customizations to apply to specific milestones',
    type: [TemplateMilestoneCustomizationDto],
  })
  @IsOptional()
  @IsArray({ message: 'Customizations must be an array' })
  @ValidateNested({ each: true })
  @Type(() => TemplateMilestoneCustomizationDto)
  customizations?: TemplateMilestoneCustomizationDto[];

  @ApiPropertyOptional({
    description: 'Custom duration in weeks (overrides template default)',
    example: 16,
    minimum: 1,
    maximum: 52,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Custom duration must be an integer' })
  @Min(1, { message: 'Custom duration must be at least 1 week' })
  @Max(52, { message: 'Custom duration must not exceed 52 weeks' })
  customDurationWeeks?: number;

  @ApiPropertyOptional({
    description: 'Additional notes or context for template application',
    example:
      'Applying template for AI/ML specialization with focus on educational applications',
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes must not exceed 500 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  notes?: string;
}
