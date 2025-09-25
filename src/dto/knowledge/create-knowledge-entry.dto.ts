import {
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';
import { ContentType } from '../../common/enums';

export class CreateKnowledgeEntryDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(50)
  @MaxLength(5000)
  content: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  category: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  keywords: string[];

  @IsEnum(ContentType)
  contentType: ContentType;

  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'])
  language?: string = 'en';
}
