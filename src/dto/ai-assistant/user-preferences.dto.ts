import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  IsObject,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UserPreferencesDto {
  @ApiPropertyOptional({
    description: 'Preferred language for AI responses',
    example: 'en',
    enum: ['en', 'es', 'fr', 'de', 'pt', 'it'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'], {
    message: 'Language must be one of: en, es, fr, de, pt, it',
  })
  preferredLanguage?: string;

  @ApiPropertyOptional({
    description: 'Preferred response detail level',
    example: 'comprehensive',
    enum: ['brief', 'moderate', 'comprehensive'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['brief', 'moderate', 'comprehensive'], {
    message: 'Detail level must be one of: brief, moderate, comprehensive',
  })
  detailLevel?: string;

  @ApiPropertyOptional({
    description: 'Preferred response style',
    example: 'academic',
    enum: ['casual', 'professional', 'academic'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['casual', 'professional', 'academic'], {
    message: 'Response style must be one of: casual, professional, academic',
  })
  responseStyle?: string;

  @ApiPropertyOptional({
    description: 'Whether to include examples in responses',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeExamples?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to include source references',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeReferences?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to suggest follow-up questions',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  suggestFollowUps?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum confidence threshold for AI responses',
    example: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Confidence threshold must be between 0 and 1' })
  @Max(1, { message: 'Confidence threshold must be between 0 and 1' })
  confidenceThreshold?: number;

  @ApiPropertyOptional({
    description: 'Notification preferences',
    example: {
      emailNotifications: true,
      pushNotifications: false,
      weeklyDigest: true,
    },
  })
  @IsOptional()
  @IsObject()
  notifications?: Record<string, boolean>;

  @ApiPropertyOptional({
    description: 'Custom settings for personalization',
    example: {
      favoriteTopics: ['methodology', 'data_analysis'],
      learningGoals: ['improve_writing', 'research_skills'],
    },
  })
  @IsOptional()
  @IsObject()
  customSettings?: Record<string, any>;
}
