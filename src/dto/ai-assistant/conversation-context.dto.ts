import {
  IsObject,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectContextDto {
  @ApiPropertyOptional({
    description: 'Project ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Project title',
    example: 'Machine Learning for Predictive Analytics',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Project type',
    example: 'research',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Current project phase',
    example: 'literature_review',
  })
  @IsOptional()
  @IsString()
  phase?: string;

  @ApiPropertyOptional({
    description: 'Project specialization',
    example: 'machine_learning',
  })
  @IsOptional()
  @IsString()
  specialization?: string;
}

export class MilestoneContextDto {
  @ApiPropertyOptional({
    description: 'Current milestone ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  currentMilestoneId?: string;

  @ApiPropertyOptional({
    description: 'Current milestone title',
    example: 'Complete Literature Review',
  })
  @IsOptional()
  @IsString()
  currentMilestoneTitle?: string;

  @ApiPropertyOptional({
    description: 'Days until current milestone deadline',
    example: 7,
  })
  @IsOptional()
  daysUntilDeadline?: number;

  @ApiPropertyOptional({
    description: 'Overdue milestones',
    example: ['Proposal Submission', 'Initial Research'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  overdueMilestones?: string[];

  @ApiPropertyOptional({
    description: 'Upcoming milestones',
    example: ['Methodology Design', 'Data Collection'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  upcomingMilestones?: string[];
}

export class ConversationContextDto {
  @ApiPropertyOptional({
    description: 'Project context information',
    type: ProjectContextDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectContextDto)
  project?: ProjectContextDto;

  @ApiPropertyOptional({
    description: 'Milestone context information',
    type: MilestoneContextDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MilestoneContextDto)
  milestone?: MilestoneContextDto;

  @ApiPropertyOptional({
    description: 'Previous conversation topics',
    example: ['literature_review', 'methodology', 'data_collection'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  previousTopics?: string[];

  @ApiPropertyOptional({
    description: 'User preferences',
    example: { detailLevel: 'comprehensive', responseStyle: 'academic' },
  })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Conversation summary for long conversations',
    example:
      'Discussion about literature review methodology and citation practices',
  })
  @IsOptional()
  @IsString()
  summary?: string;
}
