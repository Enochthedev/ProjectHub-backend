import {
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DifficultyLevel } from '../../common/enums';

export class SearchProjectsDto {
  @ApiPropertyOptional({
    description: 'Search query for project title, abstract, or tags',
    example: 'machine learning',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter by specializations',
    example: [
      'Artificial Intelligence & Machine Learning',
      'Data Science & Analytics',
    ],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @ApiPropertyOptional({
    description: 'Filter by difficulty levels',
    example: ['intermediate', 'advanced'],
    enum: DifficultyLevel,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  difficultyLevels?: DifficultyLevel[];

  @ApiPropertyOptional({
    description: 'Filter by minimum year',
    example: 2022,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  yearFrom?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum year',
    example: 2024,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(2030)
  yearTo?: number;

  @ApiPropertyOptional({
    description: 'Filter by tags',
    example: ['AI', 'ML', 'Python'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Filter by group project status',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isGroupProject?: boolean;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of results to skip',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
