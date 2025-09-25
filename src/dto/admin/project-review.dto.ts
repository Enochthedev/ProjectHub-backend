import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReviewCriteria {
  TECHNICAL_FEASIBILITY = 'technical_feasibility',
  INNOVATION = 'innovation',
  SCOPE_CLARITY = 'scope_clarity',
  METHODOLOGY = 'methodology',
  RESOURCE_AVAILABILITY = 'resource_availability',
  ACADEMIC_VALUE = 'academic_value',
  MARKET_RELEVANCE = 'market_relevance',
}

export enum ReviewDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUEST_CHANGES = 'request_changes',
  NEEDS_DISCUSSION = 'needs_discussion',
}

export class ReviewCriteriaScoreDto {
  @ApiProperty({
    description: 'Review criteria being scored',
    enum: ReviewCriteria,
    example: ReviewCriteria.TECHNICAL_FEASIBILITY,
  })
  @IsEnum(ReviewCriteria)
  criteria: ReviewCriteria;

  @ApiProperty({
    description: 'Score for this criteria (1-10)',
    example: 8,
    minimum: 1,
    maximum: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  score: number;

  @ApiPropertyOptional({
    description: 'Comments for this criteria',
    example: 'Good technical approach but needs more detail on implementation',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comments?: string;
}

export class ProjectReviewDto {
  @ApiProperty({
    description: 'Review decision',
    enum: ReviewDecision,
    example: ReviewDecision.APPROVE,
  })
  @IsEnum(ReviewDecision)
  decision: ReviewDecision;

  @ApiProperty({
    description: 'Overall review comments',
    example:
      'Excellent project proposal with clear objectives and methodology.',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  @Transform(({ value }) => value?.trim())
  overallComments: string;

  @ApiProperty({
    description: 'Detailed scores for each review criteria',
    type: [ReviewCriteriaScoreDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewCriteriaScoreDto)
  criteriaScores: ReviewCriteriaScoreDto[];

  @ApiPropertyOptional({
    description: 'Specific improvement suggestions',
    example: [
      'Add more detail to the methodology section',
      'Clarify the expected deliverables',
      'Include a more detailed timeline',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  improvementSuggestions?: string[];

  @ApiPropertyOptional({
    description: 'Recommended changes before approval',
    example: [
      'Update the abstract to be more specific',
      'Add risk assessment section',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  recommendedChanges?: string[];

  @ApiPropertyOptional({
    description: 'Whether this project requires supervisor discussion',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresSupervisorDiscussion?: boolean;

  @ApiPropertyOptional({
    description: 'Priority level for follow-up (1-5, 5 being highest)',
    example: 3,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  followUpPriority?: number;
}

export class BulkProjectReviewDto {
  @ApiProperty({
    description: 'Array of project IDs to review',
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @IsString({ each: true })
  projectIds: string[];

  @ApiProperty({
    description: 'Bulk review decision',
    enum: ReviewDecision,
    example: ReviewDecision.APPROVE,
  })
  @IsEnum(ReviewDecision)
  decision: ReviewDecision;

  @ApiProperty({
    description: 'Bulk review comments',
    example: 'All projects meet the minimum requirements for approval.',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  comments: string;

  @ApiPropertyOptional({
    description: 'Whether to apply the same criteria scores to all projects',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  applySameScores?: boolean;

  @ApiPropertyOptional({
    description: 'Default criteria scores to apply if applySameScores is true',
    type: [ReviewCriteriaScoreDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewCriteriaScoreDto)
  defaultScores?: ReviewCriteriaScoreDto[];
}

export class ProjectQualityAssessmentDto {
  @ApiProperty({
    description: 'Project ID',
    example: 'uuid',
  })
  projectId: string;

  @ApiProperty({
    description: 'Overall quality score (1-100)',
    example: 85,
  })
  overallScore: number;

  @ApiProperty({
    description: 'Individual criteria scores',
    type: [ReviewCriteriaScoreDto],
  })
  criteriaScores: ReviewCriteriaScoreDto[];

  @ApiProperty({
    description: 'Quality assessment summary',
    example: 'High-quality project with excellent technical approach',
  })
  summary: string;

  @ApiProperty({
    description: 'Identified strengths',
    example: ['Clear objectives', 'Innovative approach', 'Good methodology'],
  })
  strengths: string[];

  @ApiProperty({
    description: 'Areas for improvement',
    example: ['Timeline could be more detailed', 'Risk assessment needed'],
  })
  improvements: string[];

  @ApiProperty({
    description: 'Recommendation for approval',
    example: true,
  })
  recommendApproval: boolean;

  @ApiProperty({
    description: 'Assessment timestamp',
    example: '2024-01-20T10:30:00Z',
  })
  assessedAt: Date;

  @ApiProperty({
    description: 'Reviewer ID',
    example: 'admin-uuid',
  })
  reviewerId: string;
}
