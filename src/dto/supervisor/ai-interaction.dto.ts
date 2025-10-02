import { ApiProperty } from '@nestjs/swagger';
import {
    IsEnum,
    IsString,
    IsOptional,
    IsArray,
    IsBoolean,
    IsNumber,
    Min,
    Max,
} from 'class-validator';
import { ReviewStatus, ReviewCategory } from '../../entities/ai-interaction-review.entity';

export class CreateAIInteractionReviewDto {
    @ApiProperty({
        description: 'Conversation ID to review',
        example: 'conversation-1',
    })
    @IsString()
    conversationId: string;

    @ApiProperty({
        description: 'Review status',
        enum: ReviewStatus,
        example: ReviewStatus.PENDING,
    })
    @IsEnum(ReviewStatus)
    status: ReviewStatus;

    @ApiProperty({
        description: 'Review categories',
        enum: ReviewCategory,
        isArray: true,
        example: [ReviewCategory.ACCURACY, ReviewCategory.APPROPRIATENESS],
    })
    @IsArray()
    @IsEnum(ReviewCategory, { each: true })
    categories: ReviewCategory[];

    @ApiProperty({
        description: 'Confidence score (0-1)',
        required: false,
        example: 0.85,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    confidenceScore?: number;

    @ApiProperty({
        description: 'Review notes',
        required: false,
        example: 'AI response was accurate but could be more detailed',
    })
    @IsOptional()
    @IsString()
    reviewNotes?: string;

    @ApiProperty({
        description: 'Supervisor feedback',
        required: false,
        example: 'Student needs additional guidance on this topic',
    })
    @IsOptional()
    @IsString()
    supervisorFeedback?: string;

    @ApiProperty({
        description: 'Whether this requires follow-up',
        required: false,
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    requiresFollowUp?: boolean;
}

export class UpdateAIInteractionReviewDto {
    @ApiProperty({
        description: 'Review status',
        enum: ReviewStatus,
        required: false,
    })
    @IsOptional()
    @IsEnum(ReviewStatus)
    status?: ReviewStatus;

    @ApiProperty({
        description: 'Review categories',
        enum: ReviewCategory,
        isArray: true,
        required: false,
    })
    @IsOptional()
    @IsArray()
    @IsEnum(ReviewCategory, { each: true })
    categories?: ReviewCategory[];

    @ApiProperty({
        description: 'Confidence score (0-1)',
        required: false,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    confidenceScore?: number;

    @ApiProperty({
        description: 'Review notes',
        required: false,
    })
    @IsOptional()
    @IsString()
    reviewNotes?: string;

    @ApiProperty({
        description: 'Supervisor feedback',
        required: false,
    })
    @IsOptional()
    @IsString()
    supervisorFeedback?: string;

    @ApiProperty({
        description: 'Whether this requires follow-up',
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    requiresFollowUp?: boolean;

    @ApiProperty({
        description: 'Review timestamp',
        required: false,
    })
    @IsOptional()
    reviewedAt?: Date;
}

export class AIInteractionReviewResponseDto {
    @ApiProperty({
        description: 'Review ID',
        example: 'review-1',
    })
    id: string;

    @ApiProperty({
        description: 'Conversation ID',
        example: 'conversation-1',
    })
    conversationId: string;

    @ApiProperty({
        description: 'Student ID',
        example: 'student-1',
    })
    studentId: string;

    @ApiProperty({
        description: 'Student name',
        example: 'John Doe',
    })
    studentName: string;

    @ApiProperty({
        description: 'Review status',
        enum: ReviewStatus,
        example: ReviewStatus.PENDING,
    })
    status: ReviewStatus;

    @ApiProperty({
        description: 'Review categories',
        enum: ReviewCategory,
        isArray: true,
        example: [ReviewCategory.ACCURACY, ReviewCategory.APPROPRIATENESS],
    })
    categories: ReviewCategory[];

    @ApiProperty({
        description: 'Confidence score',
        nullable: true,
        example: 0.85,
    })
    confidenceScore: number | null;

    @ApiProperty({
        description: 'Review notes',
        nullable: true,
        example: 'AI response was accurate but could be more detailed',
    })
    reviewNotes: string | null;

    @ApiProperty({
        description: 'Supervisor feedback',
        nullable: true,
        example: 'Student needs additional guidance on this topic',
    })
    supervisorFeedback: string | null;

    @ApiProperty({
        description: 'Whether this requires follow-up',
        example: true,
    })
    requiresFollowUp: boolean;

    @ApiProperty({
        description: 'Review timestamp',
        nullable: true,
        example: '2024-03-15T10:30:00Z',
    })
    reviewedAt: string | null;

    @ApiProperty({
        description: 'Resolution timestamp',
        nullable: true,
        example: '2024-03-15T11:30:00Z',
    })
    resolvedAt: string | null;

    @ApiProperty({
        description: 'Creation timestamp',
        example: '2024-03-15T10:30:00Z',
    })
    createdAt: string;

    @ApiProperty({
        description: 'Last update timestamp',
        example: '2024-03-15T10:30:00Z',
    })
    updatedAt: string;
}

export class AIInteractionStatsDto {
    @ApiProperty({
        description: 'Total conversations reviewed',
        example: 45,
    })
    totalReviewed: number;

    @ApiProperty({
        description: 'Pending reviews',
        example: 8,
    })
    pendingReviews: number;

    @ApiProperty({
        description: 'Escalated conversations',
        example: 3,
    })
    escalatedConversations: number;

    @ApiProperty({
        description: 'Flagged conversations',
        example: 2,
    })
    flaggedConversations: number;

    @ApiProperty({
        description: 'Average confidence score',
        example: 0.82,
    })
    averageConfidenceScore: number;

    @ApiProperty({
        description: 'Most common categories',
        example: [
            { category: 'accuracy', count: 15 },
            { category: 'appropriateness', count: 12 },
        ],
    })
    commonCategories: Array<{
        category: ReviewCategory;
        count: number;
    }>;

    @ApiProperty({
        description: 'Review trends over time',
        example: [
            { date: '2024-03-01', approved: 5, escalated: 1, flagged: 0 },
            { date: '2024-03-02', approved: 7, escalated: 0, flagged: 1 },
        ],
    })
    reviewTrends: Array<{
        date: string;
        approved: number;
        escalated: number;
        flagged: number;
    }>;
}

export class AIInteractionOverviewDto {
    @ApiProperty({
        description: 'Supervisor ID',
        example: 'supervisor-1',
    })
    supervisorId: string;

    @ApiProperty({
        description: 'AI interaction statistics',
        type: AIInteractionStatsDto,
    })
    stats: AIInteractionStatsDto;

    @ApiProperty({
        description: 'Recent reviews requiring attention',
        type: [AIInteractionReviewResponseDto],
    })
    recentReviews: AIInteractionReviewResponseDto[];

    @ApiProperty({
        description: 'High-priority conversations needing review',
        type: [AIInteractionReviewResponseDto],
    })
    priorityReviews: AIInteractionReviewResponseDto[];

    @ApiProperty({
        description: 'Last updated timestamp',
        example: '2024-03-15T10:30:00Z',
    })
    lastUpdated: string;
}