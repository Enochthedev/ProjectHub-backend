import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '../../common/enums';

export class KnowledgeBaseSearchDto {
  @ApiPropertyOptional({
    description: 'Search query to match against knowledge base content',
    example: 'literature review methodology',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter by content category',
    example: 'methodology',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific tags',
    example: ['research', 'academic_writing', 'guidelines'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Filter by content type',
    enum: ContentType,
    example: ContentType.GUIDELINE,
  })
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @ApiPropertyOptional({
    description: 'Filter by language',
    example: 'en',
    enum: ['en', 'es', 'fr', 'de', 'pt', 'it'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'])
  language?: string;

  @ApiPropertyOptional({
    description: 'Include only active content',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activeOnly?: boolean = true;

  @ApiPropertyOptional({
    description: 'Minimum average rating filter',
    example: 4.0,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  minRating?: number;

  @ApiPropertyOptional({
    description: 'Minimum usage count filter',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minUsageCount?: number;

  @ApiPropertyOptional({
    description: 'Include relevance scoring in results',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeRelevanceScore?: boolean = true;

  @ApiPropertyOptional({
    description: 'Number of results to return',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of results to skip',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['relevance', 'rating', 'usage', 'created_at', 'updated_at'],
    example: 'relevance',
  })
  @IsOptional()
  @IsString()
  @IsIn(['relevance', 'rating', 'usage', 'created_at', 'updated_at'])
  sortBy?: string = 'relevance';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
