import {
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Title for the conversation',
    example: 'Literature Review Guidance',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title: string;

  @ApiPropertyOptional({
    description: 'Initial question to start the conversation',
    example: 'How do I write a comprehensive literature review?',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Initial query cannot exceed 1000 characters' })
  initialQuery?: string;

  @ApiPropertyOptional({
    description: 'Project ID to associate with the conversation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Preferred language for the conversation',
    example: 'en',
    enum: ['en', 'es', 'fr', 'de', 'pt', 'it'],
    default: 'en',
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'], {
    message: 'Language must be one of: en, es, fr, de, pt, it',
  })
  language?: string = 'en';
}
