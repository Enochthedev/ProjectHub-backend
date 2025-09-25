import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  MaxLength,
  ArrayMaxSize,
  IsIn,
  Validate,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DifficultyLevel } from '../../common/enums/difficulty-level.enum';
import {
  ProjectSortBy,
  SortOrder,
} from '../../common/enums/project-sort-by.enum';
import { SPECIALIZATIONS } from '../../common/constants/specializations';

export class SearchProjectsDto {
  @ApiPropertyOptional({
    description:
      'Full-text search query to search in project titles, abstracts, tags, and technology stack',
    example: 'machine learning python',
    maxLength: 100,
    type: String,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Search query must not exceed 100 characters' })
  @Transform(({ value }) => value?.trim())
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter projects by specialization areas',
    example: [
      'Artificial Intelligence & Machine Learning',
      'Web Development & Full Stack',
    ],
    type: [String],
    enum: SPECIALIZATIONS,
    maxItems: 10,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10, { message: 'Maximum 10 specializations allowed' })
  @IsIn(SPECIALIZATIONS, {
    each: true,
    message:
      'Invalid specialization. Must be one of the predefined specializations.',
  })
  specializations?: string[];

  @ApiPropertyOptional({
    description: 'Filter projects by difficulty levels',
    example: [DifficultyLevel.INTERMEDIATE, DifficultyLevel.ADVANCED],
    enum: DifficultyLevel,
    isArray: true,
    maxItems: 3,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(DifficultyLevel, { each: true })
  @ArrayMaxSize(3, { message: 'Maximum 3 difficulty levels allowed' })
  difficultyLevels?: DifficultyLevel[];

  @ApiPropertyOptional({
    description: 'Filter projects from this year onwards',
    example: 2023,
    minimum: 2020,
    maximum: new Date().getFullYear(),
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Year from must be an integer' })
  @Min(2020, { message: 'Year from must be at least 2020' })
  @Max(new Date().getFullYear(), {
    message: 'Year from cannot be in the future',
  })
  yearFrom?: number;

  @ApiPropertyOptional({
    description: 'Filter projects up to this year',
    example: 2024,
    minimum: 2020,
    maximum: new Date().getFullYear(),
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Year to must be an integer' })
  @Min(2020, { message: 'Year to must be at least 2020' })
  @Max(new Date().getFullYear(), { message: 'Year to cannot be in the future' })
  yearTo?: number;

  @ApiPropertyOptional({
    description: 'Filter projects by specific tags',
    example: ['react', 'nodejs', 'mongodb'],
    type: [String],
    maxItems: 20,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20, { message: 'Maximum 20 tags allowed' })
  tags?: string[];

  @ApiPropertyOptional({
    description:
      'Filter by group project status. True for group projects, false for individual projects',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isGroupProject?: boolean;

  @ApiPropertyOptional({
    description: 'Number of results to return per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of results to skip for pagination',
    example: 0,
    default: 0,
    minimum: 0,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Offset must be an integer' })
  @Min(0, { message: 'Offset must be at least 0' })
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Sort criteria for the results',
    example: ProjectSortBy.RELEVANCE,
    default: ProjectSortBy.RELEVANCE,
    enum: ProjectSortBy,
  })
  @IsOptional()
  @IsEnum(ProjectSortBy, { message: 'Invalid sort by option' })
  sortBy?: ProjectSortBy = ProjectSortBy.RELEVANCE;

  @ApiPropertyOptional({
    description: 'Sort order for the results',
    example: SortOrder.DESC,
    default: SortOrder.DESC,
    enum: SortOrder,
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'Invalid sort order' })
  sortOrder?: SortOrder = SortOrder.DESC;
}
