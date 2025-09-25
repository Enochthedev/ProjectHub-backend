import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
  IsIn,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TemplateMatchDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'])
  language?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 3;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  minMatchScore?: number = 0.3;

  @IsOptional()
  @IsObject()
  substitutions?: Record<string, string>;
}

export class ProcessTemplateDto {
  @IsString()
  templateId: string;

  @IsOptional()
  @IsObject()
  substitutions?: Record<string, string>;
}
