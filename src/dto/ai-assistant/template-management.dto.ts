import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsObject,
  IsIn,
  Min,
  Max,
  MinLength,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TemplateVariableDto {
  @ApiProperty({
    description: 'Variable name',
    example: 'studentName',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: 'Variable type',
    example: 'string',
    enum: ['string', 'number', 'boolean', 'date'],
  })
  @IsString()
  @IsIn(['string', 'number', 'boolean', 'date'])
  type: string;

  @ApiPropertyOptional({
    description: 'Variable description',
    example: 'The name of the student asking the question',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({
    description: 'Default value for the variable',
    example: 'Student',
  })
  @IsOptional()
  defaultValue?: any;

  @ApiPropertyOptional({
    description: 'Whether this variable is required',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  required?: boolean = false;
}

export class CreateAITemplateDto {
  @ApiProperty({
    description: 'Template name',
    example: 'Literature Review Guidance Template',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Template content with variable placeholders',
    example: 'Hello {{studentName}}, here is guidance on {{topic}}...',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  template: string;

  @ApiProperty({
    description: 'Template category',
    example: 'methodology_guidance',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  category: string;

  @ApiProperty({
    description: 'Keywords that trigger this template',
    example: ['literature review', 'methodology', 'research methods'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  triggerKeywords: string[];

  @ApiPropertyOptional({
    description: 'Template variables definition',
    type: [TemplateVariableDto],
  })
  @IsOptional()
  @IsArray()
  variables?: TemplateVariableDto[];

  @ApiPropertyOptional({
    description: 'Template language',
    example: 'en',
    enum: ['en', 'es', 'fr', 'de', 'pt', 'it'],
    default: 'en',
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'])
  language?: string = 'en';

  @ApiPropertyOptional({
    description: 'Minimum confidence threshold to use this template',
    example: 0.3,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  confidenceThreshold?: number = 0.3;

  @ApiPropertyOptional({
    description: 'Template priority (higher numbers = higher priority)',
    example: 5,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  priority?: number = 5;

  @ApiPropertyOptional({
    description: 'Additional template metadata',
    example: {
      author: 'AI Assistant Team',
      version: '1.0',
      lastReviewed: '2024-01-15',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateAITemplateDto {
  @ApiPropertyOptional({
    description: 'Updated template name',
    minLength: 3,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated template content',
    minLength: 10,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  template?: string;

  @ApiPropertyOptional({
    description: 'Updated category',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    description: 'Updated trigger keywords',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  triggerKeywords?: string[];

  @ApiPropertyOptional({
    description: 'Updated variables definition',
    type: [TemplateVariableDto],
  })
  @IsOptional()
  @IsArray()
  variables?: TemplateVariableDto[];

  @ApiPropertyOptional({
    description: 'Updated language',
    enum: ['en', 'es', 'fr', 'de', 'pt', 'it'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'])
  language?: string;

  @ApiPropertyOptional({
    description: 'Updated confidence threshold',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  confidenceThreshold?: number;

  @ApiPropertyOptional({
    description: 'Updated priority',
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Whether template is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Updated metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class TemplateSearchDto {
  @ApiPropertyOptional({
    description: 'Search query to match against template content',
    example: 'literature review guidance',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'methodology_guidance',
  })
  @IsOptional()
  @IsString()
  category?: string;

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
    description: 'Include only active templates',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activeOnly?: boolean = true;

  @ApiPropertyOptional({
    description: 'Minimum effectiveness score',
    example: 3.0,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  minEffectiveness?: number;

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
    enum: [
      'name',
      'category',
      'effectiveness',
      'usage',
      'created_at',
      'updated_at',
    ],
    example: 'effectiveness',
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'name',
    'category',
    'effectiveness',
    'usage',
    'created_at',
    'updated_at',
  ])
  sortBy?: string = 'effectiveness';

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
