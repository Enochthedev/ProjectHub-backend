import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType } from '../../common/enums';

export class TemplateSearchDto {
  @ApiPropertyOptional({
    description: 'Search query for template name or description',
    example: 'machine learning',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Search query must be a string' })
  @MinLength(2, { message: 'Search query must be at least 2 characters long' })
  @MaxLength(100, { message: 'Search query must not exceed 100 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter by specialization',
    example: 'Artificial Intelligence',
  })
  @IsOptional()
  @IsString({ message: 'Specialization must be a string' })
  @MinLength(2, {
    message: 'Specialization must be at least 2 characters long',
  })
  @MaxLength(100, { message: 'Specialization must not exceed 100 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  specialization?: string;

  @ApiPropertyOptional({
    description: 'Filter by project type',
    example: ProjectType.INDIVIDUAL,
    enum: ProjectType,
  })
  @IsOptional()
  @IsEnum(ProjectType, {
    message: `Project type must be one of: ${Object.values(ProjectType).join(', ')}`,
  })
  projectType?: ProjectType;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Active status must be a boolean' })
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by tags',
    example: ['research', 'ai', 'machine-learning'],
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

  @ApiPropertyOptional({
    description: 'Minimum duration in weeks',
    example: 8,
    minimum: 1,
    maximum: 52,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Minimum duration must be an integer' })
  @Min(1, { message: 'Minimum duration must be at least 1 week' })
  @Max(52, { message: 'Minimum duration must not exceed 52 weeks' })
  minDurationWeeks?: number;

  @ApiPropertyOptional({
    description: 'Maximum duration in weeks',
    example: 16,
    minimum: 1,
    maximum: 52,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Maximum duration must be an integer' })
  @Min(1, { message: 'Maximum duration must be at least 1 week' })
  @Max(52, { message: 'Maximum duration must not exceed 52 weeks' })
  maxDurationWeeks?: number;

  @ApiPropertyOptional({
    description: 'Filter by template creator',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString({ message: 'Created by must be a string' })
  createdBy?: string;

  @ApiPropertyOptional({
    description: 'Minimum usage count',
    example: 5,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Minimum usage count must be an integer' })
  @Min(0, { message: 'Minimum usage count must be at least 0' })
  minUsageCount?: number;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'usageCount',
    enum: ['name', 'createdAt', 'usageCount', 'estimatedDurationWeeks'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  @IsEnum(['name', 'createdAt', 'usageCount', 'estimatedDurationWeeks'], {
    message:
      'Sort by must be one of: name, createdAt, usageCount, estimatedDurationWeeks',
  })
  sortBy?: 'name' | 'createdAt' | 'usageCount' | 'estimatedDurationWeeks' =
    'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsString({ message: 'Sort order must be a string' })
  @IsEnum(['ASC', 'DESC'], {
    message: 'Sort order must be either ASC or DESC',
  })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
