import {
  IsString,
  IsNumber,
  IsDate,
  IsArray,
  IsOptional,
  IsEnum,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
  MinLength,
  MaxLength,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '../../common/enums';

export class CreateKnowledgeEntryDto {
  @ApiProperty({ description: 'Knowledge entry title' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Knowledge entry content' })
  @IsString()
  @MinLength(50)
  @MaxLength(5000)
  content: string;

  @ApiProperty({ description: 'Content category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Content tags', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags: string[];

  @ApiProperty({ description: 'Search keywords', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  keywords: string[];

  @ApiProperty({ description: 'Content type', enum: ContentType })
  @IsEnum(ContentType)
  contentType: ContentType;

  @ApiPropertyOptional({ description: 'Content language' })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'])
  language?: string = 'en';
}

export class UpdateKnowledgeEntryDto {
  @ApiPropertyOptional({ description: 'Knowledge entry title' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Knowledge entry content' })
  @IsOptional()
  @IsString()
  @MinLength(50)
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({ description: 'Content category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Content tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({ description: 'Search keywords', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Content type', enum: ContentType })
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @ApiPropertyOptional({ description: 'Content language' })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'])
  language?: string;

  @ApiPropertyOptional({ description: 'Whether entry is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class KnowledgeEntryResponseDto {
  @ApiProperty({ description: 'Entry ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Entry title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Entry content' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Content category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Content tags', type: [String] })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({ description: 'Search keywords', type: [String] })
  @IsArray()
  @IsString({ each: true })
  keywords: string[];

  @ApiProperty({ description: 'Content type', enum: ContentType })
  @IsEnum(ContentType)
  contentType: ContentType;

  @ApiProperty({ description: 'Content language' })
  @IsString()
  language: string;

  @ApiProperty({ description: 'Whether entry is active' })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Usage count' })
  @IsNumber()
  usageCount: number;

  @ApiProperty({ description: 'Average rating' })
  @IsNumber()
  @Min(0)
  @Max(5)
  averageRating: number;

  @ApiProperty({ description: 'Created by user ID' })
  @IsString()
  createdBy: string;

  @ApiProperty({ description: 'Creation date' })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}

export class CreateResponseTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Template content with variables' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  template: string;

  @ApiProperty({ description: 'Template category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Trigger keywords', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  triggerKeywords: string[];

  @ApiPropertyOptional({ description: 'Template variables' })
  @IsOptional()
  variables?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Template language' })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'])
  language?: string = 'en';
}

export class UpdateResponseTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Template content with variables' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  template?: string;

  @ApiPropertyOptional({ description: 'Template category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Trigger keywords', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  triggerKeywords?: string[];

  @ApiPropertyOptional({ description: 'Template variables' })
  @IsOptional()
  variables?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Template language' })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'es', 'fr', 'de', 'pt', 'it'])
  language?: string;

  @ApiPropertyOptional({ description: 'Whether template is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResponseTemplateResponseDto {
  @ApiProperty({ description: 'Template ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Template content' })
  @IsString()
  template: string;

  @ApiProperty({ description: 'Template category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Trigger keywords', type: [String] })
  @IsArray()
  @IsString({ each: true })
  triggerKeywords: string[];

  @ApiProperty({ description: 'Template variables' })
  variables: Record<string, any>;

  @ApiProperty({ description: 'Template language' })
  @IsString()
  language: string;

  @ApiProperty({ description: 'Whether template is active' })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Usage count' })
  @IsNumber()
  usageCount: number;

  @ApiProperty({ description: 'Creation date' })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}

export class QualityMetricsDto {
  @ApiProperty({ description: 'Average knowledge rating' })
  @IsNumber()
  @Min(0)
  @Max(5)
  averageKnowledgeRating: number;

  @ApiProperty({ description: 'Low-rated knowledge entries count' })
  @IsNumber()
  lowRatedKnowledgeCount: number;

  @ApiProperty({ description: 'Unused knowledge entries count' })
  @IsNumber()
  unusedKnowledgeCount: number;

  @ApiProperty({ description: 'Unused templates count' })
  @IsNumber()
  unusedTemplateCount: number;

  @ApiProperty({ description: 'Content coverage gaps' })
  @IsArray()
  @IsString({ each: true })
  contentGaps: string[];

  @ApiProperty({ description: 'Recommended improvements' })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];
}

export class AIContentAnalyticsDto {
  @ApiProperty({ description: 'Total knowledge base entries' })
  @IsNumber()
  totalKnowledgeEntries: number;

  @ApiProperty({ description: 'Active knowledge base entries' })
  @IsNumber()
  activeKnowledgeEntries: number;

  @ApiProperty({ description: 'Total response templates' })
  @IsNumber()
  totalTemplates: number;

  @ApiProperty({ description: 'Active response templates' })
  @IsNumber()
  activeTemplates: number;

  @ApiProperty({ description: 'Most used knowledge entries' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KnowledgeUsageDto)
  mostUsedKnowledge: KnowledgeUsageDto[];

  @ApiProperty({ description: 'Most used templates' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateUsageDto)
  mostUsedTemplates: TemplateUsageDto[];

  @ApiProperty({ description: 'Content by category' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryStatsDto)
  categoryStats: CategoryStatsDto[];

  @ApiProperty({ description: 'Content by language' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageStatsDto)
  languageStats: LanguageStatsDto[];

  @ApiProperty({ description: 'Quality metrics' })
  @ValidateNested()
  @Type(() => QualityMetricsDto)
  qualityMetrics: QualityMetricsDto;

  @ApiProperty({ description: 'Usage trends over time' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UsageTrendDto)
  usageTrends: UsageTrendDto[];
}

export class KnowledgeUsageDto {
  @ApiProperty({ description: 'Knowledge entry ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Entry title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Entry category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Usage count' })
  @IsNumber()
  usageCount: number;

  @ApiProperty({ description: 'Average rating' })
  @IsNumber()
  @Min(0)
  @Max(5)
  averageRating: number;

  @ApiProperty({ description: 'Last used date' })
  @IsDate()
  @Type(() => Date)
  lastUsed: Date;
}

export class TemplateUsageDto {
  @ApiProperty({ description: 'Template ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Template category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Usage count' })
  @IsNumber()
  usageCount: number;

  @ApiProperty({ description: 'Last used date' })
  @IsDate()
  @Type(() => Date)
  lastUsed: Date;
}

export class CategoryStatsDto {
  @ApiProperty({ description: 'Category name' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Number of knowledge entries' })
  @IsNumber()
  knowledgeCount: number;

  @ApiProperty({ description: 'Number of templates' })
  @IsNumber()
  templateCount: number;

  @ApiProperty({ description: 'Total usage count' })
  @IsNumber()
  totalUsage: number;

  @ApiProperty({ description: 'Average rating' })
  @IsNumber()
  @Min(0)
  @Max(5)
  averageRating: number;
}

export class LanguageStatsDto {
  @ApiProperty({ description: 'Language code' })
  @IsString()
  language: string;

  @ApiProperty({ description: 'Number of knowledge entries' })
  @IsNumber()
  knowledgeCount: number;

  @ApiProperty({ description: 'Number of templates' })
  @IsNumber()
  templateCount: number;

  @ApiProperty({ description: 'Total usage count' })
  @IsNumber()
  totalUsage: number;
}

export class UsageTrendDto {
  @ApiProperty({ description: 'Date' })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiProperty({ description: 'Knowledge usage count' })
  @IsNumber()
  knowledgeUsage: number;

  @ApiProperty({ description: 'Template usage count' })
  @IsNumber()
  templateUsage: number;

  @ApiProperty({ description: 'New entries created' })
  @IsNumber()
  newEntries: number;
}

export class AdminContentFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by language' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Filter by content type',
    enum: ContentType,
  })
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by minimum usage count' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minUsage?: number;

  @ApiPropertyOptional({ description: 'Filter by minimum rating' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsOptional()
  @IsString()
  @IsIn([
    'title',
    'category',
    'usageCount',
    'averageRating',
    'createdAt',
    'updatedAt',
  ])
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Limit number of results' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
