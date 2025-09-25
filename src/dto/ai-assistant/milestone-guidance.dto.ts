import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Priority } from '../../common/enums';

export class MilestoneDeadlineAwarenessDto {
  @ApiProperty({ description: 'Milestone ID' })
  @IsString()
  milestoneId: string;

  @ApiProperty({ description: 'Milestone title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Due date' })
  @IsDateString()
  dueDate: Date;

  @ApiProperty({ description: 'Days until due date' })
  @IsNumber()
  daysUntilDue: number;

  @ApiProperty({
    description: 'Urgency level',
    enum: ['critical', 'urgent', 'moderate', 'low'],
  })
  @IsEnum(['critical', 'urgent', 'moderate', 'low'])
  urgencyLevel: 'critical' | 'urgent' | 'moderate' | 'low';

  @ApiProperty({ description: 'Deadline-specific guidance', type: [String] })
  @IsArray()
  @IsString({ each: true })
  deadlineGuidance: string[];

  @ApiProperty({ description: 'Time management tips', type: [String] })
  @IsArray()
  @IsString({ each: true })
  timeManagementTips: string[];

  @ApiProperty({ description: 'Escalation recommendations', type: [String] })
  @IsArray()
  @IsString({ each: true })
  escalationRecommendations: string[];
}

export class TimeAllocationDto {
  @ApiProperty({ description: 'Recommended daily hours' })
  @IsNumber()
  dailyHours: number;

  @ApiProperty({ description: 'Recommended weekly hours' })
  @IsNumber()
  weeklyHours: number;

  @ApiProperty({ description: 'Total estimated hours' })
  @IsNumber()
  totalEstimatedHours: number;
}

export class PriorityGuidanceDto {
  @ApiProperty({ description: 'Milestone ID' })
  @IsString()
  milestoneId: string;

  @ApiProperty({ description: 'Milestone title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Current priority', enum: Priority })
  @IsEnum(Priority)
  currentPriority: Priority;

  @ApiProperty({ description: 'Suggested priority', enum: Priority })
  @IsEnum(Priority)
  suggestedPriority: Priority;

  @ApiProperty({ description: 'Reason for priority suggestion' })
  @IsString()
  priorityReason: string;

  @ApiProperty({ description: 'Action items', type: [String] })
  @IsArray()
  @IsString({ each: true })
  actionItems: string[];

  @ApiProperty({
    description: 'Time allocation recommendations',
    type: TimeAllocationDto,
  })
  timeAllocation: TimeAllocationDto;

  @ApiProperty({ description: 'Dependencies', type: [String] })
  @IsArray()
  @IsString({ each: true })
  dependencies: string[];
}

export class ProactiveSuggestionDto {
  @ApiProperty({
    description: 'Suggestion type',
    enum: [
      'preparation',
      'optimization',
      'risk_mitigation',
      'resource_planning',
    ],
  })
  @IsEnum([
    'preparation',
    'optimization',
    'risk_mitigation',
    'resource_planning',
  ])
  type:
    | 'preparation'
    | 'optimization'
    | 'risk_mitigation'
    | 'resource_planning';

  @ApiProperty({ description: 'Suggestion title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Target milestone ID' })
  @IsString()
  targetMilestone: string;

  @ApiProperty({
    description: 'Timeframe for action',
    enum: ['immediate', 'this_week', 'next_week', 'this_month'],
  })
  @IsEnum(['immediate', 'this_week', 'next_week', 'this_month'])
  timeframe: 'immediate' | 'this_week' | 'next_week' | 'this_month';

  @ApiProperty({
    description: 'Priority level',
    enum: ['high', 'medium', 'low'],
  })
  @IsEnum(['high', 'medium', 'low'])
  priority: 'high' | 'medium' | 'low';

  @ApiProperty({ description: 'Action steps', type: [String] })
  @IsArray()
  @IsString({ each: true })
  actionSteps: string[];

  @ApiProperty({ description: 'Required resources', type: [String] })
  @IsArray()
  @IsString({ each: true })
  resources: string[];

  @ApiProperty({ description: 'Estimated time required in hours' })
  @IsNumber()
  estimatedTimeRequired: number;
}

export class CriticalPathItemDto {
  @ApiProperty({ description: 'Milestone ID' })
  @IsString()
  milestoneId: string;

  @ApiProperty({ description: 'Milestone title' })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Impact level',
    enum: ['high', 'medium', 'low'],
  })
  @IsEnum(['high', 'medium', 'low'])
  impact: 'high' | 'medium' | 'low';

  @ApiProperty({ description: 'Buffer days available' })
  @IsNumber()
  bufferDays: number;
}

export class BottleneckDto {
  @ApiProperty({ description: 'Milestone ID' })
  @IsString()
  milestoneId: string;

  @ApiProperty({ description: 'Milestone title' })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Bottleneck type',
    enum: ['resource', 'dependency', 'complexity', 'external'],
  })
  @IsEnum(['resource', 'dependency', 'complexity', 'external'])
  bottleneckType: 'resource' | 'dependency' | 'complexity' | 'external';

  @ApiProperty({ description: 'Suggested solutions', type: [String] })
  @IsArray()
  @IsString({ each: true })
  suggestedSolutions: string[];
}

export class TimelineRecommendationsDto {
  @ApiProperty({ description: 'Immediate actions', type: [String] })
  @IsArray()
  @IsString({ each: true })
  immediate: string[];

  @ApiProperty({ description: 'Short-term actions', type: [String] })
  @IsArray()
  @IsString({ each: true })
  shortTerm: string[];

  @ApiProperty({ description: 'Long-term actions', type: [String] })
  @IsArray()
  @IsString({ each: true })
  longTerm: string[];
}

export class RiskFactorDto {
  @ApiProperty({ description: 'Risk factor description' })
  @IsString()
  factor: string;

  @ApiProperty({
    description: 'Severity level',
    enum: ['high', 'medium', 'low'],
  })
  @IsEnum(['high', 'medium', 'low'])
  severity: 'high' | 'medium' | 'low';

  @ApiProperty({ description: 'Mitigation strategies', type: [String] })
  @IsArray()
  @IsString({ each: true })
  mitigation: string[];
}

export class TimelineAnalysisDto {
  @ApiProperty({ description: 'Project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ description: 'Student ID' })
  @IsString()
  studentId: string;

  @ApiProperty({
    description: 'Overall project status',
    enum: ['on_track', 'at_risk', 'behind_schedule', 'ahead_of_schedule'],
  })
  @IsEnum(['on_track', 'at_risk', 'behind_schedule', 'ahead_of_schedule'])
  overallStatus:
    | 'on_track'
    | 'at_risk'
    | 'behind_schedule'
    | 'ahead_of_schedule';

  @ApiProperty({
    description: 'Critical path milestones',
    type: [CriticalPathItemDto],
  })
  @IsArray()
  criticalPath: CriticalPathItemDto[];

  @ApiProperty({ description: 'Identified bottlenecks', type: [BottleneckDto] })
  @IsArray()
  bottlenecks: BottleneckDto[];

  @ApiProperty({
    description: 'Timeline recommendations',
    type: TimelineRecommendationsDto,
  })
  recommendations: TimelineRecommendationsDto;

  @ApiProperty({ description: 'Risk factors', type: [RiskFactorDto] })
  @IsArray()
  riskFactors: RiskFactorDto[];
}

export class MilestoneGuidanceQueryDto {
  @ApiProperty({
    description: 'Project ID (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'Include deadline awareness',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeDeadlineAwareness?: boolean = true;

  @ApiProperty({
    description: 'Include priority guidance',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includePriorityGuidance?: boolean = true;

  @ApiProperty({
    description: 'Include proactive suggestions',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeProactiveSuggestions?: boolean = true;

  @ApiProperty({
    description: 'Include timeline analysis',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeTimelineAnalysis?: boolean = true;
}

export class MilestoneSpecificGuidanceDto {
  @ApiProperty({
    description: 'Context for guidance',
    enum: ['deadline', 'priority', 'progress', 'blocking'],
  })
  @IsEnum(['deadline', 'priority', 'progress', 'blocking'])
  context: 'deadline' | 'priority' | 'progress' | 'blocking';
}

export class ComprehensiveMilestoneGuidanceDto {
  @ApiProperty({
    description: 'Deadline awareness',
    type: [MilestoneDeadlineAwarenessDto],
  })
  @IsArray()
  deadlineAwareness: MilestoneDeadlineAwarenessDto[];

  @ApiProperty({
    description: 'Priority guidance',
    type: [PriorityGuidanceDto],
  })
  @IsArray()
  priorityGuidance: PriorityGuidanceDto[];

  @ApiProperty({
    description: 'Proactive suggestions',
    type: [ProactiveSuggestionDto],
  })
  @IsArray()
  proactiveSuggestions: ProactiveSuggestionDto[];

  @ApiProperty({ description: 'Timeline analysis', type: TimelineAnalysisDto })
  timelineAnalysis: TimelineAnalysisDto;
}
