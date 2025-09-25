import {
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BookmarkedMessagesSearchDto {
  @ApiPropertyOptional({
    description: 'Search query to match against bookmarked message content',
    example: 'literature review structure',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by project ID',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by message category',
    example: 'methodology',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Minimum confidence score filter',
    example: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  minConfidence?: number;

  @ApiPropertyOptional({
    description: 'Minimum rating filter',
    example: 4.0,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  minRating?: number;

  @ApiPropertyOptional({
    description: 'Filter bookmarks created after this date (ISO string)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  bookmarkedAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter bookmarks created before this date (ISO string)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  bookmarkedBefore?: string;

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
    enum: ['createdAt', 'averageRating', 'confidenceScore', 'bookmarkedAt'],
    example: 'bookmarkedAt',
  })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'averageRating', 'confidenceScore', 'bookmarkedAt'])
  sortBy?: string = 'bookmarkedAt';

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
