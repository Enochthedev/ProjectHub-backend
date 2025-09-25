import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsIn,
  IsBoolean,
} from 'class-validator';

export class CreateTranslationDto {
  @IsString()
  sourceId: string;

  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'])
  targetLanguage: string;

  @IsString()
  translatedTitle: string;

  @IsString()
  translatedContent: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  translatedKeywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  translatedTags?: string[];
}

export class UpdateTranslationDto {
  @IsOptional()
  @IsString()
  translatedTitle?: string;

  @IsOptional()
  @IsString()
  translatedContent?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  translatedKeywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  translatedTags?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  qualityScore?: number;

  @IsOptional()
  @IsBoolean()
  isReviewed?: boolean;
}
