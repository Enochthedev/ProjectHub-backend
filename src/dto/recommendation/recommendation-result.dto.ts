import {
  IsArray,
  IsString,
  IsNumber,
  IsBoolean,
  IsDate,
  IsObject,
  ValidateNested,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SupervisorSummaryDto {
  @ApiProperty({
    description: 'Unique identifier for the supervisor',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Full name of the project supervisor',
    example: 'Dr. Sarah Johnson',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Primary specialization area of the supervisor',
    example: 'Artificial Intelligence',
    enum: [
      'AI',
      'WebDev',
      'Mobile',
      'DataScience',
      'Cybersecurity',
      'Hardware',
      'GameDev',
      'IoT',
    ],
  })
  @IsString()
  specialization: string;
}

export class ProjectRecommendationDto {
  @ApiProperty({
    description: 'Unique identifier for the recommended project',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'Title of the recommended project',
    example: 'AI-Powered Healthcare Diagnosis System',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description:
      'Detailed abstract describing the project scope and objectives',
    example:
      'Develop a machine learning system that can assist medical professionals in diagnosing diseases from medical imaging data using deep learning techniques.',
  })
  @IsString()
  abstract: string;

  @ApiProperty({
    description: 'Primary specialization area of the project',
    example: 'AI',
    enum: [
      'AI',
      'WebDev',
      'Mobile',
      'DataScience',
      'Cybersecurity',
      'Hardware',
      'GameDev',
      'IoT',
    ],
  })
  @IsString()
  specialization: string;

  @ApiProperty({
    description:
      'Difficulty level indicating the complexity and required experience',
    example: 'advanced',
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
  })
  @IsString()
  difficultyLevel: string;

  @ApiProperty({
    description:
      'Similarity score indicating how well the project matches the student profile (0.0 = no match, 1.0 = perfect match)',
    minimum: 0.0,
    maximum: 1.0,
    example: 0.87,
  })
  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  similarityScore: number;

  @ApiProperty({
    description:
      'List of technical skills that match between the student profile and project requirements',
    type: [String],
    example: ['Python', 'TensorFlow', 'Computer Vision', 'Deep Learning'],
  })
  @IsArray()
  @IsString({ each: true })
  matchingSkills: string[];

  @ApiProperty({
    description:
      'List of interest areas that align between the student and the project domain',
    type: [String],
    example: ['Healthcare Technology', 'Machine Learning', 'Medical Imaging'],
  })
  @IsArray()
  @IsString({ each: true })
  matchingInterests: string[];

  @ApiProperty({
    description:
      'Human-readable explanation of why this project was recommended to the student',
    example:
      'This project aligns perfectly with your expertise in Python and machine learning, while offering opportunities to apply AI in healthcare - an area you expressed strong interest in. The advanced difficulty level matches your academic performance and technical background.',
  })
  @IsString()
  reasoning: string;

  @ApiProperty({
    description: 'Information about the project supervisor',
    type: SupervisorSummaryDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => SupervisorSummaryDto)
  supervisor: SupervisorSummaryDto;

  @ApiProperty({
    description:
      'Additional score boost applied to promote diversity across specializations (0.0-1.0)',
    required: false,
    example: 0.15,
  })
  @IsOptional()
  @IsNumber()
  diversityBoost?: number;
}

export class RecommendationMetadata {
  @ApiProperty({
    description: 'Algorithm method used for generating recommendations',
    example: 'ai',
    enum: ['ai', 'fallback', 'cached', 'hybrid'],
  })
  @IsString()
  method: string;

  @ApiProperty({
    description:
      'Indicates if rule-based fallback was used due to AI service unavailability',
    example: false,
  })
  @IsBoolean()
  fallback: boolean;

  @ApiProperty({
    description:
      'Total number of projects analyzed during recommendation generation',
    example: 156,
  })
  @IsNumber()
  projectsAnalyzed: number;

  @ApiProperty({
    description:
      'Percentage of cache hits during the recommendation process (0.0-1.0)',
    example: 0.73,
  })
  @IsNumber()
  cacheHitRate: number;

  @ApiProperty({
    description: 'Total time taken to generate recommendations in milliseconds',
    example: 2847,
  })
  @IsNumber()
  processingTimeMs: number;

  @ApiProperty({
    description:
      'Original timestamp when cached recommendations were first generated',
    required: false,
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  originalGenerationTime?: Date;

  @ApiProperty({
    description:
      'Error message if recommendation generation encountered issues',
    required: false,
    example:
      'AI service temporarily unavailable, using fallback recommendations',
  })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiProperty({
    description: 'Classification of error type for debugging purposes',
    required: false,
    example: 'AI_SERVICE_TIMEOUT',
    enum: [
      'AI_SERVICE_ERROR',
      'RATE_LIMIT_EXCEEDED',
      'INSUFFICIENT_PROFILE_DATA',
      'NETWORK_ERROR',
    ],
  })
  @IsOptional()
  @IsString()
  errorType?: string;

  @ApiProperty({
    description: 'Indicates if error recovery mechanisms were activated',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  recoveryUsed?: boolean;

  @ApiProperty({
    description: 'Description of recovery actions taken',
    required: false,
    example: 'Switched to rule-based recommendations after AI service timeout',
  })
  @IsOptional()
  @IsString()
  recoveryMessage?: string;
}

export class RecommendationResultDto {
  @ApiProperty({
    description:
      'Array of personalized project recommendations ranked by relevance',
    type: [ProjectRecommendationDto],
    example: [
      {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'AI-Powered Healthcare Diagnosis System',
        abstract: 'Develop a machine learning system for medical diagnosis...',
        specialization: 'AI',
        difficultyLevel: 'advanced',
        similarityScore: 0.87,
        matchingSkills: ['Python', 'TensorFlow', 'Computer Vision'],
        matchingInterests: ['Healthcare Technology', 'Machine Learning'],
        reasoning: 'Perfect match for your AI and healthcare interests...',
        supervisor: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Dr. Sarah Johnson',
          specialization: 'Artificial Intelligence',
        },
        diversityBoost: 0.15,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectRecommendationDto)
  recommendations: ProjectRecommendationDto[];

  @ApiProperty({
    description:
      'High-level explanation of the recommendation strategy and rationale',
    example:
      'Based on your strong background in Python and machine learning, combined with your expressed interest in healthcare applications, these recommendations focus on AI projects with real-world impact. The selection includes both challenging technical projects and opportunities for interdisciplinary collaboration.',
  })
  @IsString()
  reasoning: string;

  @ApiProperty({
    description:
      'Mean similarity score across all recommended projects (0.0-1.0)',
    minimum: 0.0,
    maximum: 1.0,
    example: 0.78,
  })
  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  averageSimilarityScore: number;

  @ApiProperty({
    description:
      'True if recommendations were retrieved from cache, false if freshly generated',
    example: false,
  })
  @IsBoolean()
  fromCache: boolean;

  @ApiProperty({
    description: 'ISO timestamp when these recommendations were generated',
    example: '2024-01-15T14:30:00.000Z',
  })
  @IsDate()
  @Type(() => Date)
  generatedAt: Date;

  @ApiProperty({
    description:
      'ISO timestamp when these recommendations will expire and should be refreshed',
    required: false,
    example: '2024-01-15T15:30:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @ApiProperty({
    description:
      'Technical metadata about the recommendation generation process',
    type: RecommendationMetadata,
    example: {
      method: 'ai',
      fallback: false,
      projectsAnalyzed: 156,
      cacheHitRate: 0.73,
      processingTimeMs: 2847,
    },
  })
  @IsObject()
  @ValidateNested()
  @Type(() => RecommendationMetadata)
  metadata: RecommendationMetadata;
}
