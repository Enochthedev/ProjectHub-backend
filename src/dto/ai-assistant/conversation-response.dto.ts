import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationStatus } from '../../common/enums';
import { MessageResponseDto } from '../message/message-response.dto';
import { ConversationContextDto } from './conversation-context.dto';

export class ConversationResponseDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Student ID who owns the conversation',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  studentId: string;

  @ApiProperty({
    description: 'Conversation title',
    example: 'Literature Review Methodology Discussion',
  })
  title: string;

  @ApiProperty({
    description: 'Conversation status',
    enum: ConversationStatus,
    example: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @ApiPropertyOptional({
    description: 'Associated project ID',
    example: '789e0123-e89b-12d3-a456-426614174002',
  })
  projectId?: string;

  @ApiProperty({
    description: 'Conversation language',
    example: 'en',
  })
  language: string;

  @ApiProperty({
    description: 'Number of messages in the conversation',
    example: 15,
  })
  messageCount: number;

  @ApiPropertyOptional({
    description: 'Recent messages in the conversation',
    type: [MessageResponseDto],
  })
  messages?: MessageResponseDto[];

  @ApiPropertyOptional({
    description: 'Conversation context information',
    type: ConversationContextDto,
  })
  context?: ConversationContextDto;

  @ApiProperty({
    description: 'Conversation creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-20T14:45:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Last message timestamp',
    example: '2024-01-20T14:45:00Z',
  })
  lastMessageAt?: Date;
}
