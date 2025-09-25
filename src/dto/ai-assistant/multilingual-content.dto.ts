import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsBoolean,
  IsIn,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TranslationDto {
  @ApiProperty({
    description: 'Language code',
    example: 'es',
    enum: ['en', 'es', 'fr', 'de', 'pt', 'it'],
  })
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'])
  language: string;

  @ApiProperty({
    description: 'Translated title',
    example: 'Metodología de Revisión de Literatura',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Translated content',
    example: 'Una revisión de literatura es un análisis exhaustivo...',
    minLength: 50,
    maxLength: 5000,
  })
  @IsString()
  @MinLength(50)
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({
    description: 'Translated keywords',
    example: ['metodología', 'investigación', 'académico'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    description: 'Translation quality score',
    example: 0.95,
  })
  @IsOptional()
  qualityScore?: number;

  @ApiPropertyOptional({
    description: 'Whether this translation was human-reviewed',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  humanReviewed?: boolean;
}

export class CreateMultilingualContentDto {
  @ApiProperty({
    description: 'Primary language content',
    type: TranslationDto,
  })
  @ValidateNested()
  @Type(() => TranslationDto)
  primaryContent: TranslationDto;

  @ApiPropertyOptional({
    description: 'Additional language translations',
    type: [TranslationDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];

  @ApiProperty({
    description: 'Content category',
    example: 'methodology',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  category: string;

  @ApiPropertyOptional({
    description: 'Content tags',
    example: ['research', 'academic_writing', 'guidelines'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Translation metadata',
    example: {
      translationMethod: 'human',
      reviewedBy: 'expert_translator',
      translationDate: '2024-01-15T10:30:00Z',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateMultilingualContentDto {
  @ApiPropertyOptional({
    description: 'Updated primary content',
    type: TranslationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TranslationDto)
  primaryContent?: TranslationDto;

  @ApiPropertyOptional({
    description: 'Updated translations',
    type: [TranslationDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  translations?: TranslationDto[];

  @ApiPropertyOptional({
    description: 'Updated category',
    example: 'methodology',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    description: 'Updated tags',
    example: ['research', 'academic_writing', 'guidelines'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Updated metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class TranslationRequestDto {
  @ApiProperty({
    description: 'Content ID to translate',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  contentId: string;

  @ApiProperty({
    description: 'Target language for translation',
    example: 'es',
    enum: ['en', 'es', 'fr', 'de', 'pt', 'it'],
  })
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'])
  targetLanguage: string;

  @ApiPropertyOptional({
    description: 'Whether to use human translation',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  useHumanTranslation?: boolean = false;

  @ApiPropertyOptional({
    description: 'Priority level for translation',
    example: 'normal',
    enum: ['low', 'normal', 'high', 'urgent'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string = 'normal';
}
