import { ApiProperty } from '@nestjs/swagger';
import { MilestoneStatus, Priority } from '../../common/enums';

export class MilestoneTimelineItemDto {
  @ApiProperty({
    description: 'Milestone ID',
    example: 'uuid-string',
  })
  id: string;

  @ApiProperty({
    description: 'Milestone title',
    example: 'Complete Literature Review',
  })
  title: string;

  @ApiProperty({
    description: 'Estimated start date',
    example: '2024-03-01',
  })
  startDate: string;

  @ApiProperty({
    description: 'Due date',
    example: '2024-03-15',
  })
  endDate: string;

  @ApiProperty({
    description: 'Milestone status',
    enum: MilestoneStatus,
  })
  status: MilestoneStatus;

  @ApiProperty({
    description: 'Milestone priority',
    enum: Priority,
  })
  priority: Priority;

  @ApiProperty({
    description: 'Progress percentage (0-100)',
    example: 50,
  })
  progress: number;

  @ApiProperty({
    description: 'Estimated hours to complete',
    example: 20,
  })
  estimatedHours: number;

  @ApiProperty({
    description: 'Actual hours spent',
    example: 15,
  })
  actualHours: number;

  @ApiProperty({
    description: 'Whether the milestone is overdue',
    example: false,
  })
  isOverdue: boolean;

  @ApiProperty({
    description: 'Associated project ID',
    example: 'project-uuid',
    nullable: true,
  })
  projectId: string | null;

  @ApiProperty({
    description: 'Associated project title',
    example: 'AI-Powered Recommendation System',
    nullable: true,
  })
  projectTitle: string | null;

  @ApiProperty({
    description: 'List of dependent milestone IDs',
    type: [String],
    example: ['milestone-1', 'milestone-2'],
  })
  dependencies: string[];

  @ApiProperty({
    description: 'Color code for visualization',
    example: '#007bff',
  })
  colorCode: string;
}

export class GanttChartDataDto {
  @ApiProperty({
    description: 'Timeline items for Gantt chart',
    type: [MilestoneTimelineItemDto],
  })
  items: MilestoneTimelineItemDto[];

  @ApiProperty({
    description: 'Date range for the chart',
    example: {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    },
  })
  dateRange: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty({
    description: 'Critical path milestone IDs',
    type: [String],
    example: ['milestone-1', 'milestone-3', 'milestone-5'],
  })
  criticalPath: string[];

  @ApiProperty({
    description: 'Total project duration in days',
    example: 180,
  })
  totalDuration: number;

  @ApiProperty({
    description: 'Chart metadata',
    example: {
      totalMilestones: 8,
      completedMilestones: 3,
      overdueMilestones: 1,
      criticalMilestones: 3,
    },
  })
  metadata: {
    totalMilestones: number;
    completedMilestones: number;
    overdueMilestones: number;
    criticalMilestones: number;
  };
}

export class CalendarEventDto {
  @ApiProperty({
    description: 'Event ID (milestone ID)',
    example: 'uuid-string',
  })
  id: string;

  @ApiProperty({
    description: 'Event title',
    example: 'Complete Literature Review',
  })
  title: string;

  @ApiProperty({
    description: 'Event date',
    example: '2024-03-15',
  })
  date: string;

  @ApiProperty({
    description: 'Milestone status',
    enum: MilestoneStatus,
  })
  status: MilestoneStatus;

  @ApiProperty({
    description: 'Milestone priority',
    enum: Priority,
  })
  priority: Priority;

  @ApiProperty({
    description: 'Whether the milestone is overdue',
    example: false,
  })
  isOverdue: boolean;

  @ApiProperty({
    description: 'Color code for calendar display',
    example: '#007bff',
  })
  colorCode: string;

  @ApiProperty({
    description: 'Associated project title',
    example: 'AI-Powered Recommendation System',
    nullable: true,
  })
  projectTitle: string | null;

  @ApiProperty({
    description: 'Estimated hours for the milestone',
    example: 20,
  })
  estimatedHours: number;
}

export class CalendarViewDataDto {
  @ApiProperty({
    description: 'Calendar year',
    example: 2024,
  })
  year: number;

  @ApiProperty({
    description: 'Calendar month (1-12)',
    example: 3,
  })
  month: number;

  @ApiProperty({
    description: 'All events in the month',
    type: [CalendarEventDto],
  })
  events: CalendarEventDto[];

  @ApiProperty({
    description: 'Events grouped by date',
    example: {
      '2024-03-15': [
        {
          id: 'milestone-1',
          title: 'Literature Review',
          date: '2024-03-15',
          status: 'in_progress',
          priority: 'high',
          isOverdue: false,
          colorCode: '#007bff',
          projectTitle: 'AI Project',
          estimatedHours: 20,
        },
      ],
    },
  })
  eventsByDate: Record<string, CalendarEventDto[]>;

  @ApiProperty({
    description: 'Daily workload in hours',
    example: {
      '2024-03-15': 20,
      '2024-03-20': 35,
    },
  })
  dailyWorkload: Record<string, number>;

  @ApiProperty({
    description: 'Month summary statistics',
    example: {
      totalEvents: 5,
      completedEvents: 2,
      overdueEvents: 1,
      highPriorityEvents: 3,
      totalEstimatedHours: 100,
    },
  })
  summary: {
    totalEvents: number;
    completedEvents: number;
    overdueEvents: number;
    highPriorityEvents: number;
    totalEstimatedHours: number;
  };
}

export class WorkloadPeriodDto {
  @ApiProperty({
    description: 'Period start date',
    example: '2024-03-11',
  })
  periodStart: string;

  @ApiProperty({
    description: 'Period end date',
    example: '2024-03-17',
  })
  periodEnd: string;

  @ApiProperty({
    description: 'Total estimated hours for the period',
    example: 45,
  })
  totalHours: number;

  @ApiProperty({
    description: 'Number of milestones in the period',
    example: 3,
  })
  milestoneCount: number;

  @ApiProperty({
    description: 'Number of high priority milestones',
    example: 2,
  })
  highPriorityCount: number;

  @ApiProperty({
    description: 'Whether the period is overloaded',
    example: true,
  })
  isOverloaded: boolean;

  @ApiProperty({
    description: 'Conflict level for the period',
    enum: ['low', 'medium', 'high'],
    example: 'high',
  })
  conflictLevel: 'low' | 'medium' | 'high';

  @ApiProperty({
    description: 'Milestones in this period',
    example: [
      {
        id: 'milestone-1',
        title: 'Literature Review',
        dueDate: '2024-03-15',
        priority: 'high',
        estimatedHours: 20,
      },
    ],
  })
  milestones: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: Priority;
    estimatedHours: number;
  }>;
}

export class WorkloadDistributionDto {
  @ApiProperty({
    description: 'Date range for analysis',
    example: {
      startDate: '2024-01-01',
      endDate: '2024-06-30',
    },
  })
  dateRange: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty({
    description: 'Weekly workload breakdown',
    type: [WorkloadPeriodDto],
  })
  weeklyWorkload: WorkloadPeriodDto[];

  @ApiProperty({
    description: 'Identified scheduling conflicts',
    example: [
      {
        date: '2024-03-15',
        type: 'workload_overload',
        description: 'Week of 2024-03-11: 3 milestones (45h estimated)',
        severity: 'high',
      },
    ],
  })
  conflicts: Array<{
    date: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;

  @ApiProperty({
    description: 'Workload analysis summary',
    example: {
      totalMilestones: 12,
      totalEstimatedHours: 240,
      averageWeeklyHours: 20,
      overloadedWeeks: 2,
      peakWorkloadWeek: {
        periodStart: '2024-03-11',
        periodEnd: '2024-03-17',
        totalHours: 45,
        milestoneCount: 3,
        highPriorityCount: 2,
        isOverloaded: true,
        conflictLevel: 'high',
        milestones: [],
      },
    },
  })
  summary: {
    totalMilestones: number;
    totalEstimatedHours: number;
    averageWeeklyHours: number;
    overloadedWeeks: number;
    peakWorkloadWeek: WorkloadPeriodDto;
  };
}

export class TimelineEventDto {
  @ApiProperty({
    description: 'Event ID',
    example: 'milestone-1',
  })
  id: string;

  @ApiProperty({
    description: 'Event title',
    example: 'Complete Literature Review',
  })
  title: string;

  @ApiProperty({
    description: 'Event date',
    example: '2024-03-15',
  })
  date: string;

  @ApiProperty({
    description: 'Event type',
    enum: ['milestone', 'alert'],
    example: 'milestone',
  })
  type: 'milestone' | 'alert';

  @ApiProperty({
    description: 'Event status',
    example: 'in_progress',
  })
  status: string;

  @ApiProperty({
    description: 'Event priority',
    enum: Priority,
  })
  priority: Priority;

  @ApiProperty({
    description: 'Event description',
    example: 'Due: 2024-03-15',
  })
  description: string;

  @ApiProperty({
    description: 'Color code for visualization',
    example: '#007bff',
  })
  colorCode: string;
}

export class TimelineVisualizationDto {
  @ApiProperty({
    description: 'Date range for timeline',
    example: {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    },
  })
  dateRange: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty({
    description: 'Timeline events (milestones and alerts)',
    type: [TimelineEventDto],
  })
  events: TimelineEventDto[];

  @ApiProperty({
    description: 'Gantt chart data',
    type: GanttChartDataDto,
  })
  ganttData: GanttChartDataDto;

  @ApiProperty({
    description: 'Workload distribution data',
    type: WorkloadDistributionDto,
  })
  workloadData: WorkloadDistributionDto;

  @ApiProperty({
    description: 'Timeline summary',
    example: {
      totalEvents: 15,
      milestoneEvents: 12,
      alertEvents: 3,
      criticalPathLength: 5,
      estimatedCompletionDate: '2024-06-15',
    },
  })
  summary: {
    totalEvents: number;
    milestoneEvents: number;
    alertEvents: number;
    criticalPathLength: number;
    estimatedCompletionDate: string | null;
  };
}
