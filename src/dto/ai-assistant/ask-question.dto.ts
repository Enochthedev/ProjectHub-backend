import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AskQuestionDto {
  @ApiProperty({
    description: 'The question to ask the AI assistant',
    example: 'What is a literature review and how should I structure it?',
    minLength: 3,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(3, { message: 'Question must be at least 3 characters long' })
  @MaxLength(1000, { message: 'Question cannot exceed 1000 characters' })
  query: string;

  @ApiPropertyOptional({
    description: 'Existing conversation ID to continue the conversation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Preferred language for the response',
    example: 'en',
    enum: ['en', 'es', 'fr', 'de', 'pt', 'it'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'], {
    message: 'Language must be one of: en, es, fr, de, pt, it',
  })
  language?: string;

  @ApiPropertyOptional({
    description: 'Current project phase for contextual guidance',
    example: 'literature_review',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  projectPhase?: string;

  @ApiPropertyOptional({
    description: 'Whether to include project context in the response',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeProjectContext?: boolean = true;

  @ApiPropertyOptional({
    description: 'Student specialization for tailored responses',
    example: 'machine_learning',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialization?: string;
}
