import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType, MessageStatus } from '../../common/enums';
import type { MessageMetadata } from '../../entities/interfaces/conversation.interface';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Message ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  conversationId: string;

  @ApiProperty({
    description: 'Message type',
    enum: MessageType,
    example: MessageType.AI_RESPONSE,
  })
  type: MessageType;

  @ApiProperty({
    description: 'Message content',
    example:
      'A literature review is a comprehensive survey of scholarly sources...',
  })
  content: string;

  @ApiPropertyOptional({
    description: 'Message metadata',
    example: {
      processingTime: 1500,
      aiModel: 'distilbert-base-cased-distilled-squad',
      language: 'en',
      category: 'methodology',
    },
  })
  metadata?: MessageMetadata;

  @ApiPropertyOptional({
    description: 'AI confidence score',
    example: 0.85,
  })
  confidenceScore?: number;

  @ApiProperty({
    description: 'Source references',
    example: ['FYP Guidelines 2024', 'Research Methodology Handbook'],
  })
  sources: string[];

  @ApiProperty({
    description: 'Whether message is bookmarked',
    example: true,
  })
  isBookmarked: boolean;

  @ApiProperty({
    description: 'Message status',
    enum: MessageStatus,
    example: MessageStatus.DELIVERED,
  })
  status: MessageStatus;

  @ApiProperty({
    description: 'Average rating',
    example: 4.2,
  })
  averageRating: number;

  @ApiProperty({
    description: 'Number of ratings',
    example: 5,
  })
  ratingCount: number;

  @ApiProperty({
    description: 'Message creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}
