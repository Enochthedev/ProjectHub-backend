import {
    IsString,
    IsNotEmpty,
    MinLength,
    MaxLength,
    IsEnum,
    IsArray,
    ValidateNested,
    IsInt,
    Min,
    Max,
    IsOptional,
    IsBoolean,
    IsUUID,
    IsObject,
    IsNumber,
    IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectType, Priority } from '../../common/enums';
import { TemplateMilestone } from '../../entities/interfaces/template-milestone.interface';

// Enhanced template milestone for drag-and-drop builder
export class TemplateBuilderMilestoneDto implements TemplateMilestone {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(200)
    title: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(1000)
    description: string;

    @IsInt()
    @Min(0)
    @Max(365)
    daysFromStart: number;

    @IsEnum(Priority)
    priority: Priority;

    @IsInt()
    @Min(1)
    @Max(1000)
    estimatedHours: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    dependencies?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    // Builder-specific properties
    @IsOptional()
    @IsString()
    id?: string; // Temporary ID for builder

    @IsOptional()
    @IsNumber()
    sortOrder?: number; // For drag-and-drop ordering

    @IsOptional()
    @IsObject()
    position?: { x: number; y: number }; // For visual builder

    @IsOptional()
    @IsString()
    category?: string; // Milestone category for grouping

    @IsOptional()
    @IsBoolean()
    isRequired?: boolean; // Whether milestone is required

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    deliverables?: string[]; // Expected deliverables

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    resources?: string[]; // Required resources
}

// Template versioning DTO
export class TemplateVersionDto {
    @IsUUID()
    templateId: string;

    @IsInt()
    @Min(1)
    version: number;

    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    changeDescription: string;

    @IsString()
    @IsNotEmpty()
    changedBy: string;

    @IsDateString()
    changedAt: string;

    @IsObject()
    changes: Record<string, any>; // Detailed change log

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

// Enhanced template creation with versioning
export class CreateAdminTemplateDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(200)
    name: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(1000)
    description: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(100)
    specialization: string;

    @IsEnum(ProjectType)
    projectType: ProjectType;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TemplateBuilderMilestoneDto)
    milestoneItems: TemplateBuilderMilestoneDto[];

    @IsInt()
    @Min(1)
    @Max(52)
    estimatedDurationWeeks: number;

    @IsOptional()
    @IsObject()
    configuration?: {
        allowCustomization: boolean;
        minimumDurationWeeks: number;
        maximumDurationWeeks: number;
        requiredMilestones: string[];
        optionalMilestones: string[];
        autoAdjustToCalendar?: boolean;
        notificationSettings?: {
            reminderDays: number[];
            escalationDays: number[];
        };
    };

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsString()
    @MaxLength(500)
    initialVersionNote?: string;

    @IsOptional()
    @IsBoolean()
    isDraft?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    targetAudience?: string[]; // Student levels, specializations, etc.

    @IsOptional()
    @IsObject()
    builderMetadata?: {
        layout: 'linear' | 'gantt' | 'kanban';
        theme: string;
        customProperties: Record<string, any>;
    };
}

// Template update with change tracking
export class UpdateAdminTemplateDto {
    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(200)
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(10)
    @MaxLength(1000)
    description?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    specialization?: string;

    @IsOptional()
    @IsEnum(ProjectType)
    projectType?: ProjectType;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TemplateBuilderMilestoneDto)
    milestoneItems?: TemplateBuilderMilestoneDto[];

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(52)
    estimatedDurationWeeks?: number;

    @IsOptional()
    @IsObject()
    configuration?: {
        allowCustomization?: boolean;
        minimumDurationWeeks?: number;
        maximumDurationWeeks?: number;
        requiredMilestones?: string[];
        optionalMilestones?: string[];
        autoAdjustToCalendar?: boolean;
        notificationSettings?: {
            reminderDays: number[];
            escalationDays: number[];
        };
    };

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsBoolean()
    isDraft?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    targetAudience?: string[];

    @IsOptional()
    @IsObject()
    builderMetadata?: {
        layout?: 'linear' | 'gantt' | 'kanban';
        theme?: string;
        customProperties?: Record<string, any>;
    };

    // Change tracking
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    changeDescription: string;

    @IsOptional()
    @IsBoolean()
    createNewVersion?: boolean; // Whether to create a new version or update current
}

// Template builder state DTO
export class TemplateBuilderStateDto {
    @IsUUID()
    templateId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TemplateBuilderMilestoneDto)
    milestones: TemplateBuilderMilestoneDto[];

    @IsObject()
    layout: {
        type: 'linear' | 'gantt' | 'kanban';
        zoom: number;
        viewMode: 'edit' | 'preview';
        selectedMilestone?: string;
    };

    @IsOptional()
    @IsObject()
    validationResults?: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };

    @IsOptional()
    @IsBoolean()
    hasUnsavedChanges?: boolean;

    @IsOptional()
    @IsDateString()
    lastSaved?: string;
}

// Template categorization DTO
export class TemplateCategorizationDto {
    @IsUUID()
    templateId: string;

    @IsString()
    @IsNotEmpty()
    primaryCategory: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    secondaryCategories?: string[];

    @IsOptional()
    @IsString()
    difficulty?: 'beginner' | 'intermediate' | 'advanced';

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    complexityRating?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    prerequisites?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    learningOutcomes?: string[];
}

// Bulk template operations DTO
export class BulkTemplateOperationDto {
    @IsArray()
    @IsUUID(undefined, { each: true })
    templateIds: string[];

    @IsEnum(['activate', 'deactivate', 'archive', 'delete', 'categorize', 'tag'])
    operation: 'activate' | 'deactivate' | 'archive' | 'delete' | 'categorize' | 'tag';

    @IsOptional()
    @IsObject()
    operationData?: {
        category?: string;
        tags?: string[];
        reason?: string;
    };

    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    reason: string;
}

// Template comparison DTO
export class TemplateComparisonDto {
    @IsUUID()
    templateId1: string;

    @IsUUID()
    templateId2: string;

    @IsOptional()
    @IsInt()
    version1?: number;

    @IsOptional()
    @IsInt()
    version2?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    compareFields?: string[]; // Specific fields to compare
}

// Template export/import DTOs
export class TemplateExportDto {
    @IsArray()
    @IsUUID(undefined, { each: true })
    templateIds: string[];

    @IsEnum(['json', 'csv', 'xlsx'])
    format: 'json' | 'csv' | 'xlsx';

    @IsOptional()
    @IsBoolean()
    includeVersionHistory?: boolean;

    @IsOptional()
    @IsBoolean()
    includeUsageStats?: boolean;
}

export class TemplateImportDto {
    @IsString()
    @IsNotEmpty()
    data: string; // Base64 encoded file data

    @IsEnum(['json', 'csv', 'xlsx'])
    format: 'json' | 'csv' | 'xlsx';

    @IsOptional()
    @IsBoolean()
    overwriteExisting?: boolean;

    @IsOptional()
    @IsString()
    targetSpecialization?: string;

    @IsOptional()
    @IsObject()
    importOptions?: {
        validateBeforeImport: boolean;
        createBackup: boolean;
        skipDuplicates: boolean;
    };
}
