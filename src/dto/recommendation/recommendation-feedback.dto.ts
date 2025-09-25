import {
  IsEnum,
  IsOptional,
  IsNumber,
  IsString,
  Min,
  Max,
  IsArray,
  IsDate,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { FeedbackType } from '../../common/enums/feedback-type.enum';

export class RecommendationFeedbackDto {
  @ApiProperty({
    description: 'Type of feedback',
    enum: FeedbackType,
  })
  @IsEnum(FeedbackType)
  feedbackType: FeedbackType;

  @ApiProperty({
    description: 'Rating score (1.0 to 5.0, required for RATING feedback type)',
    minimum: 1.0,
    maximum: 5.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  rating?: number;

  @ApiProperty({
    description: 'Optional comment about the recommendation',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class RecommendationExplanationDto {
  @ApiProperty({ description: 'Project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'Detailed explanation of why this project was recommended',
  })
  @IsString()
  explanation: string;

  @ApiProperty({
    description: 'Similarity score breakdown',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  scoreBreakdown?: {
    skillsMatch: number;
    interestsMatch: number;
    specializationMatch: number;
    difficultyMatch: number;
    supervisorMatch: number;
    diversityBoost: number;
    totalScore: number;
  };

  @ApiProperty({
    description: 'Specific matching elements',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  matchingElements?: {
    skills: string[];
    interests: string[];
    specializations: string[];
    keywords: string[];
  };

  @ApiProperty({
    description: 'Suggestions for improving match',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsString({ each: true })
  improvementSuggestions?: string[];
}

// Analytics DTOs for supervisor and admin reporting

export class ProjectRecommendationAnalyticsDto {
  @ApiProperty({ description: 'Project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'Project title' })
  @IsString()
  projectTitle: string;

  @ApiProperty({ description: 'Total number of times recommended' })
  @IsNumber()
  recommendationCount: number;

  @ApiProperty({ description: 'Average similarity score when recommended' })
  @IsNumber()
  averageSimilarityScore: number;

  @ApiProperty({
    description: 'Number of positive feedback (likes, bookmarks)',
  })
  @IsNumber()
  positiveFeedbackCount: number;

  @ApiProperty({
    description: 'Number of negative feedback (dislikes, dismissals)',
  })
  @IsNumber()
  negativeFeedbackCount: number;

  @ApiProperty({ description: 'Average rating from student feedback' })
  @IsOptional()
  @IsNumber()
  averageRating?: number;

  @ApiProperty({ description: 'Number of students who viewed the project' })
  @IsNumber()
  viewCount: number;

  @ApiProperty({
    description: 'Conversion rate from recommendation to bookmark',
  })
  @IsNumber()
  conversionRate: number;

  @ApiProperty({ description: 'Most common matching skills' })
  @IsArray()
  @IsString({ each: true })
  topMatchingSkills: string[];

  @ApiProperty({ description: 'Most common matching interests' })
  @IsArray()
  @IsString({ each: true })
  topMatchingInterests: string[];
}

export class SupervisorRecommendationAnalyticsDto {
  @ApiProperty({ description: 'Supervisor ID' })
  @IsString()
  supervisorId: string;

  @ApiProperty({ description: 'Supervisor name' })
  @IsString()
  supervisorName: string;

  @ApiProperty({ description: 'Total projects by this supervisor' })
  @IsNumber()
  totalProjects: number;

  @ApiProperty({ description: 'Projects with active recommendations' })
  @IsNumber()
  projectsWithRecommendations: number;

  @ApiProperty({
    description: 'Total recommendation count across all projects',
  })
  @IsNumber()
  totalRecommendations: number;

  @ApiProperty({
    description: 'Average similarity score across all recommendations',
  })
  @IsNumber()
  averageSimilarityScore: number;

  @ApiProperty({
    description: 'Student engagement rate (feedback/recommendations)',
  })
  @IsNumber()
  engagementRate: number;

  @ApiProperty({ description: 'Most successful project (highest engagement)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectRecommendationAnalyticsDto)
  topProject?: ProjectRecommendationAnalyticsDto;

  @ApiProperty({ description: 'Trending skills in student matches' })
  @IsArray()
  @IsString({ each: true })
  trendingSkills: string[];

  @ApiProperty({ description: 'Recommended specializations for new projects' })
  @IsArray()
  @IsString({ each: true })
  recommendedSpecializations: string[];
}

export class SystemRecommendationAnalyticsDto {
  @ApiProperty({ description: 'Total recommendations generated' })
  @IsNumber()
  totalRecommendations: number;

  @ApiProperty({ description: 'Recommendations served from cache' })
  @IsNumber()
  cachedRecommendations: number;

  @ApiProperty({ description: 'Cache hit rate percentage' })
  @IsNumber()
  cacheHitRate: number;

  @ApiProperty({ description: 'Average recommendation generation time (ms)' })
  @IsNumber()
  averageGenerationTime: number;

  @ApiProperty({ description: 'AI API usage count' })
  @IsNumber()
  aiApiUsage: number;

  @ApiProperty({ description: 'Fallback recommendations count' })
  @IsNumber()
  fallbackRecommendations: number;

  @ApiProperty({ description: 'Success rate of AI recommendations' })
  @IsNumber()
  aiSuccessRate: number;

  @ApiProperty({ description: 'Average user satisfaction score' })
  @IsNumber()
  averageUserSatisfaction: number;

  @ApiProperty({
    description: 'Most popular specializations in recommendations',
  })
  @IsArray()
  @IsString({ each: true })
  popularSpecializations: string[];

  @ApiProperty({ description: 'Peak usage hours' })
  @IsArray()
  @IsNumber({}, { each: true })
  peakUsageHours: number[];

  @ApiProperty({ description: 'Recommendation accuracy trend over time' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccuracyTrendDto)
  accuracyTrend: AccuracyTrendDto[];
}

export class AccuracyTrendDto {
  @ApiProperty({ description: 'Date of the measurement' })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiProperty({ description: 'Accuracy score for that period' })
  @IsNumber()
  accuracyScore: number;

  @ApiProperty({ description: 'Number of recommendations in that period' })
  @IsNumber()
  recommendationCount: number;
}

export class RecommendationFeedbackSummaryDto {
  @ApiProperty({ description: 'Total feedback entries' })
  @IsNumber()
  totalFeedback: number;

  @ApiProperty({ description: 'Breakdown by feedback type' })
  @IsOptional()
  feedbackBreakdown?: {
    likes: number;
    dislikes: number;
    bookmarks: number;
    views: number;
    ratings: number;
  };

  @ApiProperty({ description: 'Average rating across all feedback' })
  @IsOptional()
  @IsNumber()
  averageRating?: number;

  @ApiProperty({ description: 'Most common feedback comments themes' })
  @IsArray()
  @IsString({ each: true })
  commonThemes: string[];

  @ApiProperty({
    description: 'Improvement suggestions from feedback analysis',
  })
  @IsArray()
  @IsString({ each: true })
  improvementSuggestions: string[];
}
