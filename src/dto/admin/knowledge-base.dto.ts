import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContentType } from '../../common/enums';

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_REVISION = 'needs_revision',
}

export enum ContentVersion {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export class CreateKnowledgeBaseEntryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  content: string;

  @IsString()
  @MaxLength(100)
  category: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsArray()
  @IsString({ each: true })
  keywords: string[];

  @IsEnum(ContentType)
  contentType: ContentType;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  source?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedEntries?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateKnowledgeBaseEntryDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  source?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedEntries?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class KnowledgeBaseEntryResponseDto {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  keywords: string[];
  contentType: ContentType;
  language: string;
  summary?: string;
  source?: string;
  relatedEntries: string[];
  isActive: boolean;
  usageCount: number;
  averageRating: number;
  approvalStatus: ApprovalStatus;
  version: ContentVersion;
  versionNumber: number;
  createdBy: string;
  updatedBy: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
}

export class ContentApprovalDto {
  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  suggestedChanges?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ContentVersionDto {
  id: string;
  entryId: string;
  versionNumber: number;
  title: string;
  content: string;
  status: ContentVersion;
  changes: string;
  createdBy: string;
  createdAt: Date;
}

export class BulkKnowledgeBaseOperationDto {
  @IsArray()
  @IsString({ each: true })
  entryIds: string[];

  @IsEnum(['approve', 'reject', 'activate', 'deactivate', 'delete', 'archive'])
  operation:
    | 'approve'
    | 'reject'
    | 'activate'
    | 'deactivate'
    | 'delete'
    | 'archive';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;
}

export class KnowledgeBaseFiltersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @IsOptional()
  @IsEnum(ApprovalStatus)
  approvalStatus?: ApprovalStatus;

  @IsOptional()
  @IsEnum(ContentVersion)
  version?: ContentVersion;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

export class KnowledgeBaseContentAnalyticsDto {
  entryId: string;
  title: string;
  category: string;
  contentType: ContentType;
  usageStats: {
    totalViews: number;
    uniqueUsers: number;
    averageTimeSpent: number;
    searchAppearances: number;
    clickThroughRate: number;
  };
  ratingStats: {
    averageRating: number;
    totalRatings: number;
    ratingDistribution: {
      [rating: number]: number;
    };
  };
  performanceMetrics: {
    helpfulnessScore: number;
    accuracyScore: number;
    completenessScore: number;
    clarityScore: number;
  };
  timeRange: {
    start: Date;
    end: Date;
  };
}

export class ContentQualityMetricsDto {
  totalEntries: number;
  approvedEntries: number;
  pendingApproval: number;
  rejectedEntries: number;
  averageApprovalTime: number;
  contentByType: {
    [type: string]: number;
  };
  contentByCategory: {
    [category: string]: number;
  };
  languageDistribution: {
    [language: string]: number;
  };
  qualityScores: {
    averageRating: number;
    highQualityContent: number;
    lowQualityContent: number;
    outdatedContent: number;
  };
  usageMetrics: {
    totalViews: number;
    averageViewsPerEntry: number;
    mostViewedEntries: Array<{
      id: string;
      title: string;
      views: number;
    }>;
    leastViewedEntries: Array<{
      id: string;
      title: string;
      views: number;
    }>;
  };
}

export class ContentWorkflowDto {
  @IsString()
  entryId: string;

  @IsEnum([
    'submit_for_review',
    'request_changes',
    'approve',
    'reject',
    'publish',
    'archive',
  ])
  action:
    | 'submit_for_review'
    | 'request_changes'
    | 'approve'
    | 'reject'
    | 'publish'
    | 'archive';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reviewers?: string[];

  @IsOptional()
  @IsDateString()
  scheduledPublishDate?: string;
}

export class ContentImportDto {
  @IsString()
  source: string;

  @IsEnum(['csv', 'json', 'markdown', 'html'])
  format: 'csv' | 'json' | 'markdown' | 'html';

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  defaultCategory?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultTags?: string[];

  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean;

  @IsOptional()
  @IsString()
  language?: string;
}

export class ContentExportDto {
  @IsArray()
  @IsString({ each: true })
  entryIds: string[];

  @IsEnum(['csv', 'json', 'markdown', 'html', 'pdf'])
  format: 'csv' | 'json' | 'markdown' | 'html' | 'pdf';

  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean;

  @IsOptional()
  @IsBoolean()
  includeVersionHistory?: boolean;

  @IsOptional()
  @IsBoolean()
  includeAnalytics?: boolean;
}

export class PaginatedKnowledgeBaseDto {
  entries: KnowledgeBaseEntryResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: KnowledgeBaseFiltersDto;
}

export class ContentRecommendationDto {
  entryId: string;
  title: string;
  category: string;
  contentType: ContentType;
  relevanceScore: number;
  reason: string;
  suggestedActions: string[];
}

export class ContentDuplicationCheckDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class ContentDuplicationResultDto {
  isDuplicate: boolean;
  similarityScore: number;
  duplicateEntries: Array<{
    id: string;
    title: string;
    similarityScore: number;
    category: string;
  }>;
  suggestions: string[];
}
