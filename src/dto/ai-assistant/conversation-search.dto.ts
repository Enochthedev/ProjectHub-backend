import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationStatus } from '../../common/enums';

export class ConversationSearchDto {
  @ApiPropertyOptional({
    description:
      'Search query to match against conversation title and messages',
    example: 'literature review methodology',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter by conversation status',
    enum: ConversationStatus,
    example: ConversationStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({
    description: 'Filter by project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

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
    description: 'Filter conversations created after this date (ISO string)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  createdAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter conversations created before this date (ISO string)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  createdBefore?: string;

  @ApiPropertyOptional({
    description:
      'Filter conversations with activity after this date (ISO string)',
    example: '2024-01-15T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  lastActivityAfter?: string;

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
    enum: ['createdAt', 'updatedAt', 'lastMessageAt', 'title'],
    example: 'lastMessageAt',
  })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'lastMessageAt', 'title'])
  sortBy?: string = 'lastMessageAt';

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
