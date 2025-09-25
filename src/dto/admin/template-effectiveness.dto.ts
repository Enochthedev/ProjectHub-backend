import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsInt,
    Min,
    Max,
    IsOptional,
    IsBoolean,
    IsArray,
    ValidateNested,
    IsNumber,
    IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

// Student feedback DTO
export class StudentFeedbackDto {
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @IsString()
    @IsNotEmpty()
    feedback: string;

    @IsBoolean()
    isRecommended: boolean;

    @IsOptional()
    @ValidateNested()
    @Type(() => DifficultyRatingsDto)
    difficultyRatings?: DifficultyRatingsDto;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ImprovementSuggestionDto)
    improvementSuggestions?: ImprovementSuggestionDto[];
}

export class DifficultyRatingsDto {
    @IsInt()
    @Min(1)
    @Max(5)
    overall: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MilestoneDifficultyDto)
    milestones: MilestoneDifficultyDto[];
}

export class MilestoneDifficultyDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsInt()
    @Min(1)
    @Max(5)
    difficulty: number;
}

export class ImprovementSuggestionDto {
    @IsEnum(['timeline', 'milestones', 'resources', 'guidance', 'other'])
    category: 'timeline' | 'milestones' | 'resources' | 'guidance' | 'other';

    @IsString()
    @IsNotEmpty()
    suggestion: string;

    @IsEnum(['low', 'medium', 'high'])
    priority: 'low' | 'medium' | 'high';
}

// Milestone progress update DTO
export class MilestoneProgressUpdateDto {
    @IsUUID()
    projectId: string;

    @IsString()
    @IsNotEmpty()
    milestoneTitle: string;

    @IsEnum(['completed', 'overdue', 'pending'])
    status: 'completed' | 'overdue' | 'pending';

    @IsOptional()
    @IsInt()
    @Min(0)
    actualDays?: number;
}

// Template usage tracking DTO
export class TrackTemplateUsageDto {
    @IsUUID()
    templateId: string;

    @IsUUID()
    projectId: string;

    @IsUUID()
    studentId: string;
}

// Template effectiveness query DTO
export class TemplateEffectivenessQueryDto {
    @IsOptional()
    @IsString()
    specialization?: string;

    @IsOptional()
    @IsString()
    projectType?: string;

    @IsOptional()
    @IsEnum(['beginner', 'intermediate', 'advanced'])
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(52)
    maxDurationWeeks?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    minUsages?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    minCompletionRate?: number;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(5)
    minStudentRating?: number;
}

// Template recommendation request DTO
export class TemplateRecommendationRequestDto {
    @IsString()
    @IsNotEmpty()
    specialization: string;

    @IsOptional()
    @IsString()
    projectType?: string;

    @IsOptional()
    @IsEnum(['beginner', 'intermediate', 'advanced'])
    studentLevel?: 'beginner' | 'intermediate' | 'advanced';

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(52)
    maxDurationWeeks?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(20)
    limit?: number;
}

// Template comparison request DTO
export class TemplateComparisonRequestDto {
    @IsArray()
    @IsUUID(undefined, { each: true })
    templateIds: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    comparisonCriteria?: string[];
}

// Effectiveness analytics filters DTO
export class EffectivenessAnalyticsFiltersDto {
    @IsOptional()
    @IsString()
    dateFrom?: string;

    @IsOptional()
    @IsString()
    dateTo?: string;

    @IsOptional()
    @IsString()
    specialization?: string;

    @IsOptional()
    @IsString()
    projectType?: string;

    @IsOptional()
    @IsEnum(['not_started', 'in_progress', 'completed', 'abandoned'])
    completionStatus?: 'not_started' | 'in_progress' | 'completed' | 'abandoned';

    @IsOptional()
    @IsBoolean()
    includeAbandoned?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;
}

// Bulk effectiveness update DTO
export class BulkEffectivenessUpdateDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MilestoneProgressUpdateDto)
    updates: MilestoneProgressUpdateDto[];

    @IsOptional()
    @IsString()
    reason?: string;
}

// Template effectiveness export DTO
export class TemplateEffectivenessExportDto {
    @IsOptional()
    @IsArray()
    @IsUUID(undefined, { each: true })
    templateIds?: string[];

    @IsEnum(['json', 'csv', 'xlsx'])
    format: 'json' | 'csv' | 'xlsx';

    @IsOptional()
    @ValidateNested()
    @Type(() => EffectivenessAnalyticsFiltersDto)
    filters?: EffectivenessAnalyticsFiltersDto;

    @IsOptional()
    @IsBoolean()
    includeStudentFeedback?: boolean;

    @IsOptional()
    @IsBoolean()
    includeDetailedMetrics?: boolean;

    @IsOptional()
    @IsBoolean()
    anonymizeData?: boolean;
}

// Response DTOs
export class TemplateEffectivenessStatsResponseDto {
    templateId: string;
    templateName: string;
    totalUsages: number;
    completionRate: number;
    averageCompletionTime: number | null;
    averageTimeVariance: number | null;
    averageDurationVariance: number | null;
    averageStudentRating: number | null;
    recommendationRate: number;
    effectivenessScore: number;
    commonCustomizations: Array<{
        type: string;
        frequency: number;
        description: string;
    }>;
    improvementSuggestions: Array<{
        category: string;
        suggestions: string[];
        priority: 'low' | 'medium' | 'high';
        frequency: number;
    }>;
    difficultyAnalysis: {
        overallDifficulty: number | null;
        milestoneDifficulty: Array<{
            title: string;
            averageDifficulty: number;
            completionRate: number;
        }>;
    };
}

export class TemplateRecommendationResponseDto {
    templateId: string;
    templateName: string;
    recommendationScore: number;
    reasons: string[];
    suitabilityFactors: {
        specialization: string;
        projectType: string;
        difficultyLevel: string;
        estimatedDuration: number;
    };
    similarSuccessfulProjects: Array<{
        projectId: string;
        completionRate: number;
        studentRating: number;
    }>;
}

export class TemplateComparisonResponseDto {
    templates: Array<{
        templateId: string;
        templateName: string;
        effectivenessScore: number;
        completionRate: number;
        studentSatisfaction: number;
        timeEfficiency: number;
    }>;
    recommendations: {
        mostEffective: string;
        bestForBeginners: string;
        fastestCompletion: string;
        highestSatisfaction: string;
    };
}

export class EffectivenessAnalyticsResponseDto {
    totalTemplates: number;
    totalProjects: number;
    overallCompletionRate: number;
    averageEffectivenessScore: number;
    topPerformingTemplates: Array<{
        templateId: string;
        templateName: string;
        effectivenessScore: number;
        usageCount: number;
    }>;
    improvementOpportunities: Array<{
        templateId: string;
        templateName: string;
        issues: string[];
        suggestedActions: string[];
    }>;
    trendAnalysis: {
        completionRateTrend: 'improving' | 'declining' | 'stable';
        satisfactionTrend: 'improving' | 'declining' | 'stable';
        usageTrend: 'increasing' | 'decreasing' | 'stable';
    };
}

export class StudentProgressSummaryDto {
    projectId: string;
    templateId: string;
    templateName: string;
    studentId: string;
    studentName: string;
    completionStatus: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
    completionPercentage: number;
    isOnTrack: boolean;
    effectivenessScore: number;
    lastActivityAt: Date | null;
    estimatedCompletionDate: Date | null;
    riskFactors: string[];
}
