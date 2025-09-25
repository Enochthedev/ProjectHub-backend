import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ModerationAction {
  APPROVE = 'approve',
  REJECT = 'reject',
  EDIT = 'edit',
  ARCHIVE = 'archive',
  FLAG = 'flag',
  UNFLAG = 'unflag',
  REQUIRE_CHANGES = 'require_changes',
}

export enum ContentFlag {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  PLAGIARISM = 'plagiarism',
  POOR_QUALITY = 'poor_quality',
  INCOMPLETE = 'incomplete',
  MISLEADING = 'misleading',
  OUTDATED = 'outdated',
  DUPLICATE = 'duplicate',
  SPAM = 'spam',
}

export enum ContentQualityLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  UNACCEPTABLE = 'unacceptable',
}

export class ContentModerationDto {
  @ApiProperty({
    description: 'Moderation action to take',
    enum: ModerationAction,
    example: ModerationAction.APPROVE,
  })
  @IsEnum(ModerationAction)
  action: ModerationAction;

  @ApiProperty({
    description: 'Reason for the moderation action',
    example:
      'Content meets quality standards and is appropriate for publication',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  reason: string;

  @ApiPropertyOptional({
    description: 'Content flags to apply',
    enum: ContentFlag,
    isArray: true,
    example: [ContentFlag.POOR_QUALITY],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ContentFlag, { each: true })
  flags?: ContentFlag[];

  @ApiPropertyOptional({
    description: 'Quality assessment of the content',
    enum: ContentQualityLevel,
    example: ContentQualityLevel.GOOD,
  })
  @IsOptional()
  @IsEnum(ContentQualityLevel)
  qualityLevel?: ContentQualityLevel;

  @ApiPropertyOptional({
    description: 'Specific feedback for content improvement',
    example: [
      'Abstract needs more clarity',
      'Add more technical details',
      'Improve grammar and formatting',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  feedback?: string[];

  @ApiPropertyOptional({
    description: 'Whether to notify the content creator',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyCreator?: boolean;

  @ApiPropertyOptional({
    description: 'Priority level for follow-up (1-5)',
    example: 3,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;
}

export class ContentEditDto {
  @ApiPropertyOptional({
    description: 'Updated title',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated abstract',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) => value?.trim())
  abstract?: string;

  @ApiPropertyOptional({
    description: 'Updated tags',
    example: ['web-development', 'react', 'nodejs'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Updated technology stack',
    example: ['React', 'Node.js', 'PostgreSQL'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  technologyStack?: string[];

  @ApiProperty({
    description: 'Reason for the edit',
    example: 'Corrected grammar and improved clarity',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  editReason: string;

  @ApiPropertyOptional({
    description: 'Whether to notify the original author',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyAuthor?: boolean;
}

export class BulkContentModerationDto {
  @ApiProperty({
    description: 'Array of project IDs to moderate',
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @IsString({ each: true })
  projectIds: string[];

  @ApiProperty({
    description: 'Bulk moderation action',
    enum: ModerationAction,
    example: ModerationAction.APPROVE,
  })
  @IsEnum(ModerationAction)
  action: ModerationAction;

  @ApiProperty({
    description: 'Bulk moderation reason',
    example: 'All projects meet content quality standards',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  reason: string;

  @ApiPropertyOptional({
    description: 'Common flags to apply to all projects',
    enum: ContentFlag,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ContentFlag, { each: true })
  commonFlags?: ContentFlag[];

  @ApiPropertyOptional({
    description: 'Whether to notify all content creators',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyCreators?: boolean;
}

export class ContentQualityAssessmentDto {
  @ApiProperty({
    description: 'Project ID',
    example: 'uuid',
  })
  projectId: string;

  @ApiProperty({
    description: 'Overall content quality score (1-100)',
    example: 78,
  })
  qualityScore: number;

  @ApiProperty({
    description: 'Quality level assessment',
    enum: ContentQualityLevel,
    example: ContentQualityLevel.GOOD,
  })
  qualityLevel: ContentQualityLevel;

  @ApiProperty({
    description: 'Detected issues',
    example: ['Grammar errors', 'Unclear methodology'],
  })
  issues: string[];

  @ApiProperty({
    description: 'Content strengths',
    example: ['Clear objectives', 'Good structure'],
  })
  strengths: string[];

  @ApiProperty({
    description: 'Improvement suggestions',
    example: ['Add more technical details', 'Improve abstract clarity'],
  })
  suggestions: string[];

  @ApiProperty({
    description: 'Automated flags detected',
    enum: ContentFlag,
    isArray: true,
    example: [ContentFlag.POOR_QUALITY],
  })
  automatedFlags: ContentFlag[];

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
}

export class ContentModerationResultDto {
  @ApiProperty({
    description: 'Project ID that was moderated',
    example: 'uuid',
  })
  projectId: string;

  @ApiProperty({
    description: 'Action that was taken',
    enum: ModerationAction,
    example: ModerationAction.APPROVE,
  })
  action: ModerationAction;

  @ApiProperty({
    description: 'Whether the action was successful',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Error message if action failed',
    example: 'Project not found',
  })
  @IsOptional()
  error?: string;

  @ApiProperty({
    description: 'Timestamp of the moderation action',
    example: '2024-01-20T10:30:00Z',
  })
  moderatedAt: Date;

  @ApiProperty({
    description: 'ID of the moderator',
    example: 'admin-uuid',
  })
  moderatorId: string;
}
