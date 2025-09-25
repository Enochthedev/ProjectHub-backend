import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { MilestoneStatus, Priority } from '../../common/enums';
import { AnalyticsMetricsDto } from './analytics.dto';

export class ProgressReportFiltersDto {
  @ApiProperty({
    description: 'Filter by specific student IDs',
    type: [String],
    required: false,
    example: ['student-1', 'student-2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentIds?: string[];

  @ApiProperty({
    description: 'Start date for milestone filtering',
    required: false,
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for milestone filtering',
    required: false,
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Filter by milestone status',
    enum: MilestoneStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @ApiProperty({
    description: 'Filter by milestone priority',
    enum: Priority,
    required: false,
  })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}

export class ReportMetricsDto {
  @ApiProperty({
    description: 'Total number of milestones',
    example: 45,
  })
  totalMilestones: number;

  @ApiProperty({
    description: 'Number of completed milestones',
    example: 30,
  })
  completedMilestones: number;

  @ApiProperty({
    description: 'Number of overdue milestones',
    example: 5,
  })
  overdueMilestones: number;

  @ApiProperty({
    description: 'Number of blocked milestones',
    example: 2,
  })
  blockedMilestones: number;

  @ApiProperty({
    description: 'Overall completion rate as percentage',
    example: 66.67,
  })
  overallCompletionRate: number;

  @ApiProperty({
    description: 'Average progress velocity (milestones per week)',
    example: 1.5,
  })
  averageProgressVelocity: number;

  @ApiProperty({
    description: 'Number of students at risk',
    example: 3,
  })
  atRiskStudentCount: number;
}

export class StudentProgressSummaryDto {
  @ApiProperty({
    description: 'Student ID',
    example: 'student-1',
  })
  studentId: string;

  @ApiProperty({
    description: 'Student full name',
    example: 'John Doe',
  })
  studentName: string;

  @ApiProperty({
    description: 'Student email address',
    example: 'john.doe@university.edu',
  })
  studentEmail: string;

  @ApiProperty({
    description: 'Total number of milestones',
    example: 12,
  })
  totalMilestones: number;

  @ApiProperty({
    description: 'Number of completed milestones',
    example: 8,
  })
  completedMilestones: number;

  @ApiProperty({
    description: 'Number of in-progress milestones',
    example: 2,
  })
  inProgressMilestones: number;

  @ApiProperty({
    description: 'Number of overdue milestones',
    example: 1,
  })
  overdueMilestones: number;

  @ApiProperty({
    description: 'Number of blocked milestones',
    example: 1,
  })
  blockedMilestones: number;

  @ApiProperty({
    description: 'Completion rate as percentage',
    example: 66.67,
  })
  completionRate: number;

  @ApiProperty({
    description: 'Risk score (0-1 scale)',
    example: 0.3,
  })
  riskScore: number;

  @ApiProperty({
    description: 'Next upcoming milestone',
    nullable: true,
    example: {
      id: 'milestone-5',
      title: 'System Testing',
      dueDate: '2024-04-15',
      priority: 'high',
    },
  })
  nextMilestone: {
    id: string;
    title: string;
    dueDate: string;
    priority: Priority;
  } | null;

  @ApiProperty({
    description: 'Last activity timestamp',
    nullable: true,
    example: '2024-03-15T10:30:00Z',
  })
  lastActivity: string | null;

  @ApiProperty({
    description: 'Number of projects student is involved in',
    example: 1,
  })
  projectCount: number;
}

export class AtRiskStudentDto {
  @ApiProperty({
    description: 'Student ID',
    example: 'student-1',
  })
  studentId: string;

  @ApiProperty({
    description: 'Student full name',
    example: 'John Doe',
  })
  studentName: string;

  @ApiProperty({
    description: 'Risk level assessment',
    enum: ['low', 'medium', 'high'],
    example: 'high',
  })
  riskLevel: 'low' | 'medium' | 'high';

  @ApiProperty({
    description: 'Identified risk factors',
    type: [String],
    example: [
      '2 overdue milestones',
      '1 blocked milestone',
      'No recent activity',
    ],
  })
  riskFactors: string[];

  @ApiProperty({
    description: 'Number of overdue milestones',
    example: 2,
  })
  overdueMilestones: number;

  @ApiProperty({
    description: 'Number of blocked milestones',
    example: 1,
  })
  blockedMilestones: number;

  @ApiProperty({
    description: 'Last activity timestamp',
    nullable: true,
    example: '2024-03-10T14:20:00Z',
  })
  lastActivity: string | null;

  @ApiProperty({
    description: 'Recommended actions for supervisor',
    type: [String],
    example: [
      'Schedule meeting to discuss overdue milestones',
      'Help resolve blocked milestones',
    ],
  })
  recommendedActions: string[];

  @ApiProperty({
    description: 'Urgency score (0-100)',
    example: 85,
  })
  urgencyScore: number;
}

export class SupervisorDashboardDto {
  @ApiProperty({
    description: 'Supervisor ID',
    example: 'supervisor-1',
  })
  supervisorId: string;

  @ApiProperty({
    description: 'Supervisor full name',
    example: 'Dr. Jane Smith',
  })
  supervisorName: string;

  @ApiProperty({
    description: 'Total number of supervised students',
    example: 8,
  })
  totalStudents: number;

  @ApiProperty({
    description: 'Overall metrics for all supervised students',
    type: ReportMetricsDto,
  })
  metrics: ReportMetricsDto;

  @ApiProperty({
    description: 'Progress summaries for all students',
    type: [StudentProgressSummaryDto],
  })
  studentSummaries: StudentProgressSummaryDto[];

  @ApiProperty({
    description: 'Students identified as at-risk',
    type: [AtRiskStudentDto],
  })
  atRiskStudents: AtRiskStudentDto[];

  @ApiProperty({
    description: 'Recent activity from all students',
    example: [
      {
        studentId: 'student-1',
        studentName: 'John Doe',
        activity: 'Updated milestone: Literature Review',
        timestamp: '2024-03-15T10:30:00Z',
      },
    ],
  })
  recentActivity: Array<{
    studentId: string;
    studentName: string;
    activity: string;
    timestamp: string;
  }>;

  @ApiProperty({
    description: 'Upcoming deadlines across all students',
    example: [
      {
        studentId: 'student-1',
        studentName: 'John Doe',
        milestoneId: 'milestone-5',
        milestoneTitle: 'System Testing',
        dueDate: '2024-03-20',
        priority: 'high',
        daysUntilDue: 5,
      },
    ],
  })
  upcomingDeadlines: Array<{
    studentId: string;
    studentName: string;
    milestoneId: string;
    milestoneTitle: string;
    dueDate: string;
    priority: Priority;
    daysUntilDue: number;
  }>;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-03-15T10:30:00Z',
  })
  lastUpdated: string;
}

export class SupervisorReportDto {
  @ApiProperty({
    description: 'Unique report ID',
    example: 'report-1710504600000',
  })
  reportId: string;

  @ApiProperty({
    description: 'Supervisor ID who generated the report',
    example: 'supervisor-1',
  })
  supervisorId: string;

  @ApiProperty({
    description: 'Report generation timestamp',
    example: '2024-03-15T10:30:00Z',
  })
  generatedAt: string;

  @ApiProperty({
    description: 'Report period',
    example: {
      startDate: '2024-01-01',
      endDate: '2024-03-31',
    },
  })
  reportPeriod: {
    startDate: string | null;
    endDate: string | null;
  };

  @ApiProperty({
    description: 'Applied filters',
    type: ProgressReportFiltersDto,
  })
  filters: ProgressReportFiltersDto;

  @ApiProperty({
    description: 'Report metrics',
    type: ReportMetricsDto,
  })
  metrics: ReportMetricsDto;

  @ApiProperty({
    description: 'Student-specific data',
    example: [
      {
        studentId: 'student-1',
        studentName: 'John Doe',
        milestones: [
          {
            id: 'milestone-1',
            title: 'Literature Review',
            status: 'completed',
            priority: 'high',
            dueDate: '2024-03-15',
            isOverdue: false,
            projectTitle: 'AI Research Project',
          },
        ],
        progressSummary: {
          studentId: 'student-1',
          studentName: 'John Doe',
          studentEmail: 'john.doe@university.edu',
          totalMilestones: 12,
          completedMilestones: 8,
          inProgressMilestones: 2,
          overdueMilestones: 1,
          blockedMilestones: 1,
          completionRate: 66.67,
          riskScore: 0.3,
          nextMilestone: null,
          lastActivity: '2024-03-15T10:30:00Z',
          projectCount: 1,
        },
      },
    ],
  })
  studentData: Array<{
    studentId: string;
    studentName: string;
    milestones: Array<{
      id: string;
      title: string;
      status: MilestoneStatus;
      priority: Priority;
      dueDate: string;
      isOverdue: boolean;
      projectTitle: string;
    }>;
    progressSummary: StudentProgressSummaryDto;
  }>;

  @ApiProperty({
    description: 'Report summary',
    example: {
      totalStudents: 8,
      totalMilestones: 96,
      completionRate: 70.5,
      atRiskStudents: 2,
    },
  })
  summary: {
    totalStudents: number;
    totalMilestones: number;
    completionRate: number;
    atRiskStudents: number;
  };
}

export class ExportableReportDto {
  @ApiProperty({
    description: 'Report ID',
    example: 'report-1710504600000',
  })
  reportId: string;

  @ApiProperty({
    description: 'Export format',
    enum: ['pdf', 'csv'],
    example: 'pdf',
  })
  format: 'pdf' | 'csv';

  @ApiProperty({
    description: 'Generated filename',
    example: 'supervisor-report-1710504600000.pdf',
  })
  filename: string;

  @ApiProperty({
    description: 'File content (base64 encoded for binary formats)',
    example: 'JVBERi0xLjQKJcOkw7zDtsO...',
  })
  content: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf',
  })
  mimeType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 2048,
  })
  size: number;

  @ApiProperty({
    description: 'Generation timestamp',
    example: '2024-03-15T10:30:00Z',
  })
  generatedAt: string;
}

export class StudentMilestoneOverviewDto {
  @ApiProperty({
    description: 'Student ID',
    example: 'student-1',
  })
  studentId: string;

  @ApiProperty({
    description: 'Student full name',
    example: 'John Doe',
  })
  studentName: string;

  @ApiProperty({
    description: 'Student email address',
    example: 'john.doe@university.edu',
  })
  studentEmail: string;

  @ApiProperty({
    description: 'Detailed milestone information',
    example: [
      {
        id: 'milestone-1',
        title: 'Literature Review',
        description: 'Complete comprehensive literature review',
        status: 'completed',
        priority: 'high',
        dueDate: '2024-03-15',
        estimatedHours: 20,
        actualHours: 18,
        isOverdue: false,
        projectTitle: 'AI Research Project',
        notesCount: 3,
        lastUpdated: '2024-03-15T10:30:00Z',
      },
    ],
  })
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    status: MilestoneStatus;
    priority: Priority;
    dueDate: string;
    estimatedHours: number;
    actualHours: number;
    isOverdue: boolean;
    projectTitle: string;
    notesCount: number;
    lastUpdated: string;
  }>;

  @ApiProperty({
    description: 'Student analytics data',
    type: AnalyticsMetricsDto,
  })
  analytics: AnalyticsMetricsDto;

  @ApiProperty({
    description: 'Progress summary',
    type: StudentProgressSummaryDto,
  })
  progressSummary: StudentProgressSummaryDto;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-03-15T10:30:00Z',
  })
  lastUpdated: string;
}

export class SupervisorAnalyticsDto {
  @ApiProperty({
    description: 'Supervisor ID',
    example: 'supervisor-1',
  })
  supervisorId: string;

  @ApiProperty({
    description: 'Total number of supervised students',
    example: 8,
  })
  totalStudents: number;

  @ApiProperty({
    description: 'Overall metrics across all students',
    type: ReportMetricsDto,
  })
  overallMetrics: ReportMetricsDto;

  @ApiProperty({
    description: 'Student performance analysis',
    example: {
      topPerformers: [
        { studentId: 'student-1', studentName: 'John Doe', completionRate: 95 },
      ],
      strugglingStudents: [
        {
          studentId: 'student-2',
          studentName: 'Jane Smith',
          completionRate: 45,
        },
      ],
      averageCompletionRate: 72.5,
      performanceDistribution: {
        excellent: 2,
        good: 3,
        average: 2,
        poor: 1,
      },
    },
  })
  studentPerformance: {
    topPerformers: Array<{
      studentId: string;
      studentName: string;
      completionRate: number;
    }>;
    strugglingStudents: Array<{
      studentId: string;
      studentName: string;
      completionRate: number;
    }>;
    averageCompletionRate: number;
    performanceDistribution: {
      excellent: number;
      good: number;
      average: number;
      poor: number;
    };
  };

  @ApiProperty({
    description: 'Trend analysis over time',
    example: {
      completionTrend: 'improving',
      velocityTrend: 'stable',
      riskTrend: 'decreasing',
      monthlyProgress: [
        { month: '2024-01', completionRate: 65 },
        { month: '2024-02', completionRate: 70 },
        { month: '2024-03', completionRate: 75 },
      ],
    },
  })
  trendAnalysis: {
    completionTrend: 'improving' | 'stable' | 'declining';
    velocityTrend: 'improving' | 'stable' | 'declining';
    riskTrend: 'decreasing' | 'stable' | 'increasing';
    monthlyProgress: Array<{
      month: string;
      completionRate: number;
    }>;
  };

  @ApiProperty({
    description: 'Benchmark comparisons',
    example: {
      departmentAverage: 70,
      universityAverage: 65,
      performanceRanking: 'above_average',
    },
  })
  benchmarks: {
    departmentAverage: number;
    universityAverage: number;
    performanceRanking:
      | 'excellent'
      | 'above_average'
      | 'average'
      | 'below_average';
  };

  @ApiProperty({
    description: 'Generated insights and recommendations',
    type: [String],
    example: [
      'Students are performing well with high completion rates',
      'Consider additional support for struggling students',
    ],
  })
  insights: string[];

  @ApiProperty({
    description: 'Analytics generation timestamp',
    example: '2024-03-15T10:30:00Z',
  })
  generatedAt: string;
}
