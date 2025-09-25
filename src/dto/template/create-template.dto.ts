import {
  IsString,
  IsArray,
  IsOptional,
  IsObject,
  MinLength,
  MaxLength,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  template: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  category: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  triggerKeywords: string[];

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'])
  language?: string = 'en';
}
