import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContentType } from '../../common/enums';

export class SearchKnowledgeDto {
  @IsString()
  @IsOptional()
  query?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'])
  language?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  @IsIn(['relevance', 'rating', 'usage', 'created_at', 'updated_at'])
  sortBy?: string = 'relevance';

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
