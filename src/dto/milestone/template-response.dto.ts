import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectType, Priority } from '../../common/enums';

export class TemplateMilestoneResponseDto {
  @ApiProperty({
    description: 'Milestone title',
    example: 'Literature Review',
  })
  title: string;

  @ApiProperty({
    description: 'Milestone description',
    example:
      'Conduct comprehensive literature review on recent advances in machine learning',
  })
  description: string;

  @ApiProperty({
    description: 'Days from project start when this milestone is due',
    example: 14,
  })
  daysFromStart: number;

  @ApiProperty({
    description: 'Priority level of the milestone',
    example: Priority.HIGH,
    enum: Priority,
  })
  priority: Priority;

  @ApiProperty({
    description: 'Estimated hours to complete',
    example: 40,
  })
  estimatedHours: number;

  @ApiPropertyOptional({
    description: 'Dependencies on other milestones',
    example: ['Project Setup', 'Research Proposal'],
    type: [String],
  })
  dependencies?: string[];

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    example: ['research', 'literature-review'],
    type: [String],
  })
  tags?: string[];
}

export class TemplateConfigurationResponseDto {
  @ApiProperty({
    description: 'Whether customization is allowed',
    example: true,
  })
  allowCustomization: boolean;

  @ApiProperty({
    description: 'Minimum duration in weeks',
    example: 8,
  })
  minimumDurationWeeks: number;

  @ApiProperty({
    description: 'Maximum duration in weeks',
    example: 20,
  })
  maximumDurationWeeks: number;

  @ApiProperty({
    description: 'Required milestone titles',
    example: ['Literature Review', 'Methodology', 'Final Report'],
    type: [String],
  })
  requiredMilestones: string[];

  @ApiProperty({
    description: 'Optional milestone titles',
    example: ['Prototype Development', 'User Testing'],
    type: [String],
  })
  optionalMilestones: string[];
}

export class TemplateResponseDto {
  @ApiProperty({
    description: 'Template ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Template name',
    example: 'AI/ML Research Project Template',
  })
  name: string;

  @ApiProperty({
    description: 'Template description',
    example:
      'Comprehensive template for artificial intelligence and machine learning research projects',
  })
  description: string;

  @ApiProperty({
    description: 'Specialization area',
    example: 'Artificial Intelligence',
  })
  specialization: string;

  @ApiProperty({
    description: 'Project type',
    example: ProjectType.INDIVIDUAL,
    enum: ProjectType,
  })
  projectType: ProjectType;

  @ApiProperty({
    description: 'Estimated duration in weeks',
    example: 16,
  })
  estimatedDurationWeeks: number;

  @ApiProperty({
    description: 'Whether the template is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Number of times this template has been used',
    example: 25,
  })
  usageCount: number;

  @ApiProperty({
    description: 'Template milestones',
    type: [TemplateMilestoneResponseDto],
  })
  milestoneItems: TemplateMilestoneResponseDto[];

  @ApiPropertyOptional({
    description: 'Template configuration settings',
    type: TemplateConfigurationResponseDto,
  })
  configuration?: TemplateConfigurationResponseDto;

  @ApiPropertyOptional({
    description: 'Template tags',
    example: ['research', 'ai', 'machine-learning'],
    type: [String],
  })
  tags?: string[];

  @ApiProperty({
    description: 'Template creator name',
    example: 'Dr. John Smith',
  })
  createdByName: string;

  @ApiProperty({
    description: 'When the template was created',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'When the template was last updated',
    example: '2024-02-20T14:45:00Z',
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Average rating from users (1-5 scale)',
    example: 4.2,
  })
  averageRating?: number;

  @ApiPropertyOptional({
    description: 'Number of ratings received',
    example: 15,
  })
  ratingCount?: number;
}

export class PaginatedTemplateResponseDto {
  @ApiProperty({
    description: 'Array of templates',
    type: [TemplateResponseDto],
  })
  templates: TemplateResponseDto[];

  @ApiProperty({
    description: 'Total number of templates matching the criteria',
    example: 45,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrevious: boolean;
}
