import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsDateString,
  IsIn,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ContentUsageAnalyticsDto {
  @IsOptional()
  @IsString()
  @IsIn(['knowledge', 'template'])
  contentType?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 50;
}

export class ContentPerformanceDto {
  id: string;
  title: string;
  contentType: 'knowledge' | 'template';
  language: string;
  category: string;
  usageCount: number;
  averageRating: number;
  effectivenessScore?: number;
  lastUsed: Date;
  createdAt: Date;
  isPopular: boolean;
  isEffective: boolean;
}

export class ContentOptimizationRecommendationDto {
  contentId: string;
  contentType: 'knowledge' | 'template';
  recommendations: {
    type: 'keyword' | 'content' | 'structure' | 'translation';
    priority: 'high' | 'medium' | 'low';
    description: string;
    suggestedAction: string;
  }[];
  currentMetrics: {
    usageCount: number;
    averageRating: number;
    effectivenessScore?: number;
    languageCount: number;
  };
  potentialImpact: {
    estimatedUsageIncrease: number;
    estimatedRatingImprovement: number;
  };
}

export class MultilingualContentStatsDto {
  totalContent: number;
  languageDistribution: {
    language: string;
    count: number;
    percentage: number;
  }[];
  translationCoverage: {
    sourceLanguage: string;
    targetLanguages: {
      language: string;
      translatedCount: number;
      coveragePercentage: number;
    }[];
  }[];
  qualityMetrics: {
    language: string;
    averageQualityScore: number;
    reviewedCount: number;
    pendingReviewCount: number;
  }[];
}
