import { ApiProperty } from '@nestjs/swagger';
import { MilestoneStatus, Priority } from '../../common/enums';

export class VelocityTrendDto {
  @ApiProperty({
    description: 'Week start date',
    example: '2024-03-11',
  })
  weekStart: string;

  @ApiProperty({
    description: 'Week end date',
    example: '2024-03-17',
  })
  weekEnd: string;

  @ApiProperty({
    description: 'Number of milestones completed in this week',
    example: 2,
  })
  completedMilestones: number;

  @ApiProperty({
    description: 'Velocity for this week',
    example: 2.0,
  })
  velocity: number;
}

export class ProgressPredictionDto {
  @ApiProperty({
    description: 'Estimated weeks to complete all remaining milestones',
    example: 8.5,
    nullable: true,
  })
  estimatedWeeksToCompletion: number | null;

  @ApiProperty({
    description: 'Estimated completion date',
    example: '2024-06-15',
    nullable: true,
  })
  estimatedCompletionDate: string | null;

  @ApiProperty({
    description: 'Confidence level of the prediction',
    enum: ['low', 'medium', 'high'],
    example: 'medium',
  })
  confidence: 'low' | 'medium' | 'high';

  @ApiProperty({
    description: 'Assumptions used in the prediction',
    type: [String],
    example: ['Current velocity remains constant', 'No major blockers'],
  })
  assumptions: string[];
}

export class CompletionVelocityDto {
  @ApiProperty({
    description: 'Analysis period in days',
    example: 90,
  })
  periodDays: number;

  @ApiProperty({
    description: 'Total number of milestones',
    example: 12,
  })
  totalMilestones: number;

  @ApiProperty({
    description: 'Number of completed milestones in the period',
    example: 8,
  })
  completedMilestones: number;

  @ApiProperty({
    description: 'Completion rate as percentage',
    example: 66.67,
  })
  completionRate: number;

  @ApiProperty({
    description: 'Average milestones completed per week',
    example: 1.5,
  })
  weeklyVelocity: number;

  @ApiProperty({
    description: 'Average time to complete a milestone in days',
    example: 12.5,
  })
  averageCompletionTime: number;

  @ApiProperty({
    description: 'Velocity trend over the period',
    type: [VelocityTrendDto],
  })
  velocityTrend: VelocityTrendDto[];

  @ApiProperty({
    description: 'Future completion prediction',
    type: ProgressPredictionDto,
  })
  prediction: ProgressPredictionDto;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-03-15T10:30:00Z',
  })
  lastUpdated: string;
}

export class TrendAnalysisDto {
  @ApiProperty({
    description: 'Analysis period in days',
    example: 90,
  })
  periodDays: number;

  @ApiProperty({
    description: 'Completion trend analysis',
    example: {
      totalMilestones: 12,
      completedMilestones: 8,
      completionRate: 66.67,
      trend: 'improving',
    },
  })
  completionTrend: {
    totalMilestones: number;
    completedMilestones: number;
    completionRate: number;
    trend: 'improving' | 'stable' | 'declining';
  };

  @ApiProperty({
    description: 'Workload trend analysis',
    example: {
      totalEstimatedHours: 240,
      totalActualHours: 200,
      efficiencyRatio: 0.83,
      trend: 'improving',
    },
  })
  workloadTrend: {
    totalEstimatedHours: number;
    totalActualHours: number;
    efficiencyRatio: number;
    trend: 'improving' | 'stable' | 'declining';
  };

  @ApiProperty({
    description: 'Quality trend analysis',
    example: {
      avgNotesPerMilestone: 2.5,
      documentationScore: 50,
      trend: 'stable',
    },
  })
  qualityTrend: {
    avgNotesPerMilestone: number;
    documentationScore: number;
    trend: 'improving' | 'stable' | 'declining';
  };

  @ApiProperty({
    description: 'Priority distribution trend',
    example: {
      distribution: {
        low: 3,
        medium: 6,
        high: 2,
        critical: 1,
      },
      highPriorityRatio: 0.25,
      trend: 'stable',
    },
  })
  priorityTrend: {
    distribution: Record<string, number>;
    highPriorityRatio: number;
    trend: 'improving' | 'stable' | 'declining';
  };

  @ApiProperty({
    description: 'Overall trend indicators',
    example: {
      completionTrend: 'positive',
      qualityTrend: 'stable',
      velocityTrend: 'stable',
      riskTrend: 'stable',
    },
  })
  trendIndicators: {
    completionTrend: 'positive' | 'neutral' | 'negative';
    qualityTrend: 'positive' | 'neutral' | 'negative';
    velocityTrend: 'positive' | 'neutral' | 'negative';
    riskTrend: 'decreasing' | 'stable' | 'increasing';
  };

  @ApiProperty({
    description: 'Generated insights from trend analysis',
    type: [String],
    example: [
      'Completion rate is improving',
      'Consider reviewing high-priority milestones',
    ],
  })
  insights: string[];

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-03-15T10:30:00Z',
  })
  lastUpdated: string;
}

export class CriticalMilestoneDto {
  @ApiProperty({
    description: 'Milestone ID',
    example: 'milestone-1',
  })
  id: string;

  @ApiProperty({
    description: 'Milestone title',
    example: 'Complete Literature Review',
  })
  title: string;

  @ApiProperty({
    description: 'Due date',
    example: '2024-03-15',
  })
  dueDate: string;

  @ApiProperty({
    description: 'Priority level',
    enum: Priority,
  })
  priority: Priority;

  @ApiProperty({
    description: 'Current status',
    enum: MilestoneStatus,
  })
  status: MilestoneStatus;

  @ApiProperty({
    description: 'Estimated hours to complete',
    example: 20,
  })
  estimatedHours: number;

  @ApiProperty({
    description: 'Whether the milestone is overdue',
    example: false,
  })
  isOverdue: boolean;

  @ApiProperty({
    description: 'Risk level assessment',
    enum: ['low', 'medium', 'high'],
    example: 'medium',
  })
  riskLevel: 'low' | 'medium' | 'high';

  @ApiProperty({
    description: 'Dependent milestone IDs',
    type: [String],
    example: ['milestone-2', 'milestone-3'],
  })
  dependencies: string[];
}

export class CriticalPathAnalysisDto {
  @ApiProperty({
    description: 'Critical milestones requiring immediate attention',
    type: [CriticalMilestoneDto],
  })
  criticalMilestones: CriticalMilestoneDto[];

  @ApiProperty({
    description: 'Critical path milestone IDs in order',
    type: [String],
    example: ['milestone-1', 'milestone-3', 'milestone-5'],
  })
  criticalPath: string[];

  @ApiProperty({
    description: 'Identified bottlenecks',
    example: [
      {
        milestoneId: 'milestone-2',
        title: 'System Design',
        blockingReason: 'Waiting for supervisor approval',
        daysBlocked: 5,
      },
    ],
  })
  bottlenecks: Array<{
    milestoneId: string;
    title: string;
    blockingReason: string;
    daysBlocked: number;
  }>;

  @ApiProperty({
    description: 'Risk factor analysis',
    example: {
      overdueMilestones: 2,
      blockedMilestones: 1,
      highPriorityMilestones: 3,
      riskScore: 0.6,
    },
  })
  riskFactors: {
    overdueMilestones: number;
    blockedMilestones: number;
    highPriorityMilestones: number;
    riskScore: number;
  };

  @ApiProperty({
    description: 'Recommendations for critical path optimization',
    type: [String],
    example: ['Focus on completing critical priority milestones first'],
  })
  recommendations: string[];

  @ApiProperty({
    description: 'Total estimated hours for critical milestones',
    example: 120,
  })
  totalCriticalHours: number;

  @ApiProperty({
    description: 'Estimated completion date for critical path',
    example: '2024-06-15',
    nullable: true,
  })
  estimatedCompletionDate: string | null;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-03-15T10:30:00Z',
  })
  lastUpdated: string;
}

export class TemplateBenchmarkDto {
  @ApiProperty({
    description: 'Template ID used for benchmarking',
    example: 'template-1',
  })
  templateId: string;

  @ApiProperty({
    description: 'Template name',
    example: 'AI/ML Project Template',
  })
  templateName: string;

  @ApiProperty({
    description: 'Benchmark score (0-100)',
    example: 75,
  })
  benchmarkScore: number;

  @ApiProperty({
    description: 'Comparison metrics against template',
    example: {
      completionRate: 70,
      averageVelocity: 1.5,
      qualityScore: 80,
    },
  })
  comparisonMetrics: {
    completionRate: number;
    averageVelocity: number;
    qualityScore: number;
  };

  @ApiProperty({
    description: 'Recommendations based on template comparison',
    type: [String],
    example: ['Follow template milestone sequence'],
  })
  recommendations: string[];
}

export class ProgressComparisonDto {
  @ApiProperty({
    description: 'Template ID used for comparison',
    example: 'template-1',
  })
  templateId: string;

  @ApiProperty({
    description: 'Template name',
    example: 'AI/ML Project Template',
  })
  templateName: string;

  @ApiProperty({
    description: 'Current progress metrics',
    example: {
      completedMilestones: 8,
      totalMilestones: 12,
      completionRate: 66.67,
      averageCompletionTime: 12.5,
    },
  })
  currentProgress: {
    completedMilestones: number;
    totalMilestones: number;
    completionRate: number;
    averageCompletionTime: number;
  };

  @ApiProperty({
    description: 'Expected progress based on template',
    example: {
      expectedMilestones: 10,
      expectedCompletionRate: 70,
      expectedDuration: 20,
    },
  })
  expectedProgress: {
    expectedMilestones: number;
    expectedCompletionRate: number;
    expectedDuration: number;
  };

  @ApiProperty({
    description: 'Comparison analysis',
    example: {
      completionRateDifference: -3.33,
      milestoneDifference: 2,
      performanceRatio: 0.95,
    },
  })
  comparison: {
    completionRateDifference: number;
    milestoneDifference: number;
    performanceRatio: number;
  };

  @ApiProperty({
    description: 'Template benchmark data',
    type: TemplateBenchmarkDto,
  })
  benchmark: TemplateBenchmarkDto;

  @ApiProperty({
    description: 'Identified deviations from template',
    example: [
      {
        type: 'completion_rate',
        severity: 'medium',
        description: 'Completion rate differs by -3.3%',
      },
    ],
  })
  deviations: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;

  @ApiProperty({
    description: 'Recommendations for improvement',
    type: [String],
    example: ['Consider increasing milestone completion velocity'],
  })
  recommendations: string[];

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-03-15T10:30:00Z',
  })
  lastUpdated: string;
}

export class AnalyticsMetricsDto {
  @ApiProperty({
    description: 'Student ID',
    example: 'student-1',
  })
  studentId: string;

  @ApiProperty({
    description: 'Completion velocity analysis',
    type: CompletionVelocityDto,
  })
  velocity: CompletionVelocityDto;

  @ApiProperty({
    description: 'Trend analysis',
    type: TrendAnalysisDto,
  })
  trends: TrendAnalysisDto;

  @ApiProperty({
    description: 'Critical path analysis',
    type: CriticalPathAnalysisDto,
  })
  criticalPath: CriticalPathAnalysisDto;

  @ApiProperty({
    description: 'Progress comparison with template',
    type: ProgressComparisonDto,
    nullable: true,
  })
  comparison: ProgressComparisonDto | null;

  @ApiProperty({
    description: 'Overall performance score (0-100)',
    example: 78,
  })
  performanceScore: number;

  @ApiProperty({
    description: 'Productivity metrics',
    example: {
      totalEstimatedHours: 240,
      totalActualHours: 200,
      efficiencyRatio: 0.83,
      productivityScore: 75,
      timeAccuracy: 17,
    },
  })
  productivityMetrics: {
    totalEstimatedHours: number;
    totalActualHours: number;
    efficiencyRatio: number;
    productivityScore: number;
    timeAccuracy: number;
  };

  @ApiProperty({
    description: 'Key insights and recommendations',
    type: [String],
    example: [
      'Excellent milestone completion rate',
      'Strong weekly completion velocity',
    ],
  })
  keyInsights: string[];

  @ApiProperty({
    description: 'Timestamp when analytics were generated',
    example: '2024-03-15T10:30:00Z',
  })
  generatedAt: string;
}

export class MilestoneAnalyticsDto {
  @ApiProperty({
    description: 'Milestone ID',
    example: 'milestone-1',
  })
  id: string;

  @ApiProperty({
    description: 'Milestone title',
    example: 'Complete Literature Review',
  })
  title: string;

  @ApiProperty({
    description: 'Analytics data for this milestone',
    example: {
      timeToComplete: 12,
      efficiencyScore: 85,
      qualityScore: 90,
      riskLevel: 'low',
    },
  })
  analytics: {
    timeToComplete: number;
    efficiencyScore: number;
    qualityScore: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
}
