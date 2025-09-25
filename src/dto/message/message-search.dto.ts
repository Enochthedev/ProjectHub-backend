import {
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MessageType, MessageStatus } from '../../common/enums';

export class MessageSearchDto {
  @ApiPropertyOptional({
    description: 'UUID of the conversation to search within',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Search query to match against message content',
    example: 'literature review',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter by message type',
    enum: MessageType,
    example: MessageType.AI_RESPONSE,
  })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({
    description: 'Filter by message status',
    enum: MessageStatus,
    example: MessageStatus.DELIVERED,
  })
  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @ApiPropertyOptional({
    description: 'Filter to show only bookmarked messages',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  bookmarkedOnly?: boolean;

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
    enum: ['createdAt', 'averageRating', 'confidenceScore'],
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'averageRating' | 'confidenceScore' = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
