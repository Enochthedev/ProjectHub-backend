import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export enum QualityMetric {
  ACCURACY = 'accuracy',
  COMPLETENESS = 'completeness',
  CLARITY = 'clarity',
  RELEVANCE = 'relevance',
  USEFULNESS = 'usefulness',
}

export enum ReviewStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_REVISION = 'needs_revision',
}

export class ContentQualityAssessmentDto {
  @IsString()
  contentId: string;

  @IsString()
  contentType: 'knowledge' | 'template';

  @IsEnum(QualityMetric)
  metric: QualityMetric;

  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsString()
  reviewerId?: string;
}

export class ContentReviewDto {
  @IsString()
  contentId: string;

  @IsString()
  contentType: 'knowledge' | 'template';

  @IsEnum(ReviewStatus)
  status: ReviewStatus;

  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  improvementSuggestions?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  overallScore?: number;

  @IsString()
  reviewerId: string;
}

export class ContentQualityAnalyticsDto {
  @IsString()
  contentId: string;

  @IsString()
  contentType: 'knowledge' | 'template';

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usageCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  averageRating?: number;

  @IsOptional()
  @IsBoolean()
  isEffective?: boolean;
}
