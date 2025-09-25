import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SupervisorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
  OVERLOADED = 'overloaded',
  SUSPENDED = 'suspended',
}

export enum WorkloadStatus {
  UNDERUTILIZED = 'underutilized',
  OPTIMAL = 'optimal',
  NEAR_CAPACITY = 'near_capacity',
  OVERLOADED = 'overloaded',
  CRITICAL = 'critical',
}

export enum AssignmentAction {
  ASSIGN = 'assign',
  REASSIGN = 'reassign',
  UNASSIGN = 'unassign',
  TRANSFER = 'transfer',
}

export class SupervisorAssignmentDto {
  @ApiProperty({
    description: 'Student ID to assign/reassign',
    example: 'student-uuid',
  })
  @IsUUID()
  studentId: string;

  @ApiProperty({
    description: 'Target supervisor ID',
    example: 'supervisor-uuid',
  })
  @IsUUID()
  supervisorId: string;

  @ApiProperty({
    description: 'Assignment action',
    enum: AssignmentAction,
    example: AssignmentAction.ASSIGN,
  })
  @IsEnum(AssignmentAction)
  action: AssignmentAction;

  @ApiProperty({
    description: 'Reason for the assignment/reassignment',
    example: 'Student specialization matches supervisor expertise',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  reason: string;

  @ApiPropertyOptional({
    description: 'Previous supervisor ID (for reassignments)',
    example: 'previous-supervisor-uuid',
  })
  @IsOptional()
  @IsUUID()
  previousSupervisorId?: string;

  @ApiPropertyOptional({
    description: 'Whether to notify all parties involved',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyParties?: boolean;

  @ApiPropertyOptional({
    description: 'Effective date for the assignment',
    example: '2024-01-20T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}

export class BulkSupervisorAssignmentDto {
  @ApiProperty({
    description: 'Array of student IDs to assign',
    example: ['student1-uuid', 'student2-uuid'],
  })
  @IsArray()
  @IsUUID(4, { each: true })
  studentIds: string[];

  @ApiProperty({
    description: 'Target supervisor ID',
    example: 'supervisor-uuid',
  })
  @IsUUID()
  supervisorId: string;

  @ApiProperty({
    description: 'Assignment action',
    enum: AssignmentAction,
    example: AssignmentAction.ASSIGN,
  })
  @IsEnum(AssignmentAction)
  action: AssignmentAction;

  @ApiProperty({
    description: 'Reason for the bulk assignment',
    example: 'Balancing workload across supervisors',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  reason: string;

  @ApiPropertyOptional({
    description: 'Whether to check capacity before assignment',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  checkCapacity?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to notify all parties involved',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyParties?: boolean;
}

export class SupervisorCapacityUpdateDto {
  @ApiProperty({
    description: 'Maximum number of students the supervisor can handle',
    example: 15,
    minimum: 0,
    maximum: 50,
  })
  @IsNumber()
  @Min(0)
  @Max(50)
  maxStudents: number;

  @ApiPropertyOptional({
    description: 'Current availability status',
    enum: SupervisorStatus,
    example: SupervisorStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SupervisorStatus)
  status?: SupervisorStatus;

  @ApiPropertyOptional({
    description: 'Reason for capacity change',
    example: 'Supervisor requested increased capacity',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  reason?: string;

  @ApiPropertyOptional({
    description: 'Effective date for the capacity change',
    example: '2024-01-20T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}

export class SupervisorWorkloadAnalysisDto {
  @ApiProperty({
    description: 'Supervisor ID',
    example: 'supervisor-uuid',
  })
  supervisorId: string;

  @ApiProperty({
    description: 'Supervisor name',
    example: 'Dr. John Smith',
  })
  supervisorName: string;

  @ApiProperty({
    description: 'Current number of assigned students',
    example: 12,
  })
  currentStudents: number;

  @ApiProperty({
    description: 'Maximum capacity',
    example: 15,
  })
  maxCapacity: number;

  @ApiProperty({
    description: 'Capacity utilization percentage',
    example: 80,
  })
  utilizationPercentage: number;

  @ApiProperty({
    description: 'Workload status',
    enum: WorkloadStatus,
    example: WorkloadStatus.OPTIMAL,
  })
  workloadStatus: WorkloadStatus;

  @ApiProperty({
    description: 'Supervisor specializations',
    example: ['Web Development', 'Machine Learning'],
  })
  specializations: string[];

  @ApiProperty({
    description: 'Current supervisor status',
    enum: SupervisorStatus,
    example: SupervisorStatus.ACTIVE,
  })
  status: SupervisorStatus;

  @ApiProperty({
    description: 'Average project completion rate',
    example: 85.5,
  })
  completionRate: number;

  @ApiProperty({
    description: 'Student satisfaction rating (1-5)',
    example: 4.2,
  })
  satisfactionRating: number;

  @ApiProperty({
    description: 'Number of projects completed this year',
    example: 8,
  })
  projectsCompletedThisYear: number;

  @ApiProperty({
    description: 'Recommended action for workload optimization',
    example: 'Can accept 3 more students',
  })
  recommendation: string;
}

export class WorkloadDistributionDto {
  @ApiProperty({
    description: 'Total number of students needing supervision',
    example: 150,
  })
  totalStudents: number;

  @ApiProperty({
    description: 'Total number of active supervisors',
    example: 25,
  })
  totalSupervisors: number;

  @ApiProperty({
    description: 'Average students per supervisor',
    example: 6.0,
  })
  averageStudentsPerSupervisor: number;

  @ApiProperty({
    description: 'Workload distribution by status',
    example: {
      underutilized: 5,
      optimal: 15,
      near_capacity: 3,
      overloaded: 2,
      critical: 0,
    },
  })
  distributionByStatus: Record<WorkloadStatus, number>;

  @ApiProperty({
    description: 'Detailed supervisor workload analysis',
    type: [SupervisorWorkloadAnalysisDto],
  })
  supervisorAnalysis: SupervisorWorkloadAnalysisDto[];

  @ApiProperty({
    description: 'Recommendations for workload balancing',
    example: [
      'Reassign 2 students from Dr. Smith to Dr. Johnson',
      'Dr. Brown can accept 4 more students',
    ],
  })
  recommendations: string[];

  @ApiProperty({
    description: 'Unassigned students count',
    example: 8,
  })
  unassignedStudents: number;
}

export class SupervisorPerformanceDto {
  @ApiProperty({
    description: 'Supervisor ID',
    example: 'supervisor-uuid',
  })
  supervisorId: string;

  @ApiProperty({
    description: 'Performance metrics',
    example: {
      projectCompletionRate: 92.5,
      averageProjectGrade: 78.5,
      studentSatisfactionScore: 4.3,
      responseTime: 24, // hours
      meetingFrequency: 2.5, // per month
    },
  })
  metrics: {
    projectCompletionRate: number;
    averageProjectGrade: number;
    studentSatisfactionScore: number;
    responseTime: number;
    meetingFrequency: number;
  };

  @ApiProperty({
    description: 'Performance trends over time',
    example: {
      lastQuarter: 85.0,
      currentQuarter: 92.5,
      trend: 'improving',
    },
  })
  trends: {
    lastQuarter: number;
    currentQuarter: number;
    trend: 'improving' | 'declining' | 'stable';
  };

  @ApiProperty({
    description: 'Areas of strength',
    example: ['Technical guidance', 'Timely feedback', 'Student mentoring'],
  })
  strengths: string[];

  @ApiProperty({
    description: 'Areas for improvement',
    example: ['Meeting frequency could be increased'],
  })
  improvements: string[];

  @ApiProperty({
    description: 'Overall performance rating (1-5)',
    example: 4.2,
  })
  overallRating: number;
}

export class SupervisorAssignmentResultDto {
  @ApiProperty({
    description: 'Student ID that was assigned',
    example: 'student-uuid',
  })
  studentId: string;

  @ApiProperty({
    description: 'Supervisor ID assigned to',
    example: 'supervisor-uuid',
  })
  supervisorId: string;

  @ApiProperty({
    description: 'Assignment action performed',
    enum: AssignmentAction,
    example: AssignmentAction.ASSIGN,
  })
  action: AssignmentAction;

  @ApiProperty({
    description: 'Whether the assignment was successful',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Error message if assignment failed',
    example: 'Supervisor at capacity',
  })
  error?: string;

  @ApiProperty({
    description: 'Assignment timestamp',
    example: '2024-01-20T10:30:00Z',
  })
  assignedAt: Date;

  @ApiProperty({
    description: 'ID of the admin who performed the assignment',
    example: 'admin-uuid',
  })
  assignedBy: string;
}
