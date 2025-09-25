import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationStatus } from '../../common/enums';

export class UpdateConversationDto {
  @ApiPropertyOptional({
    description: 'Updated title for the conversation',
    example: 'Literature Review and Methodology Discussion',
    minLength: 3,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated conversation status',
    enum: ConversationStatus,
    example: ConversationStatus.ARCHIVED,
  })
  @IsOptional()
  @IsEnum(ConversationStatus, {
    message: 'Status must be one of: active, archived, escalated',
  })
  status?: ConversationStatus;
}
