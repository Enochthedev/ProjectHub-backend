import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsArray,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class UserAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for analytics period',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for analytics period',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by user role',
    enum: UserRole,
    example: UserRole.STUDENT,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Include inactive users in analytics',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  includeInactive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Group data by time period',
    enum: ['day', 'week', 'month'],
    default: 'day',
  })
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  groupBy?: 'day' | 'week' | 'month' = 'day';
}

export class UserReportOptionsDto extends UserAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Metrics to include in the report',
    example: ['growth', 'activity', 'engagement', 'demographics'],
    isArray: true,
    enum: ['growth', 'activity', 'engagement', 'demographics'],
  })
  @IsOptional()
  @IsArray()
  @IsIn(['growth', 'activity', 'engagement', 'demographics'], { each: true })
  metrics?: Array<'growth' | 'activity' | 'engagement' | 'demographics'> = [
    'growth',
    'activity',
    'engagement',
    'demographics',
  ];
}

export class UserGrowthAnalyticsDto {
  @ApiProperty({
    description: 'Total number of users',
    example: 1250,
  })
  totalUsers: number;

  @ApiProperty({
    description: 'Number of active users',
    example: 1180,
  })
  activeUsers: number;

  @ApiProperty({
    description: 'Number of verified users',
    example: 1100,
  })
  verifiedUsers: number;

  @ApiProperty({
    description: 'User count by role',
    example: {
      student: 1000,
      supervisor: 200,
      admin: 50,
    },
  })
  usersByRole: Record<UserRole, number>;

  @ApiProperty({
    description: 'Growth trend over time',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        date: { type: 'string', example: '2024-01-15' },
        totalUsers: { type: 'number', example: 1200 },
        newUsers: { type: 'number', example: 25 },
        activeUsers: { type: 'number', example: 1150 },
      },
    },
  })
  growthTrend: Array<{
    date: string;
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
  }>;

  @ApiProperty({
    description: 'Registrations by month and role',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        month: { type: 'string', example: '2024-01' },
        count: { type: 'number', example: 150 },
        role: { type: 'string', enum: ['student', 'supervisor', 'admin'] },
      },
    },
  })
  registrationsByMonth: Array<{
    month: string;
    count: number;
    role: UserRole;
  }>;
}

export class UserActivityMetricsDto {
  @ApiProperty({
    description: 'Daily active users',
    example: 450,
  })
  dailyActiveUsers: number;

  @ApiProperty({
    description: 'Weekly active users',
    example: 850,
  })
  weeklyActiveUsers: number;

  @ApiProperty({
    description: 'Monthly active users',
    example: 1100,
  })
  monthlyActiveUsers: number;

  @ApiProperty({
    description: 'Average session duration in minutes',
    example: 25.5,
  })
  averageSessionDuration: number;

  @ApiProperty({
    description: 'Top active users',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: 'uuid' },
        email: { type: 'string', example: 'user@ui.edu.ng' },
        name: { type: 'string', example: 'John Doe' },
        role: { type: 'string', enum: ['student', 'supervisor', 'admin'] },
        activityScore: { type: 'number', example: 150 },
        lastActive: { type: 'string', format: 'date-time' },
      },
    },
  })
  topActiveUsers: Array<{
    userId: string;
    email: string;
    name?: string;
    role: UserRole;
    activityScore: number;
    lastActive: Date;
  }>;

  @ApiProperty({
    description: 'Activity distribution by hour of day',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        hour: { type: 'number', example: 14 },
        count: { type: 'number', example: 125 },
      },
    },
  })
  activityByHour: Array<{
    hour: number;
    count: number;
  }>;

  @ApiProperty({
    description: 'Activity distribution by day of week',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        day: { type: 'string', example: 'Monday' },
        count: { type: 'number', example: 200 },
      },
    },
  })
  activityByDay: Array<{
    day: string;
    count: number;
  }>;
}

export class UserEngagementMetricsDto {
  @ApiProperty({
    description: 'Profile completion rate percentage',
    example: 85.5,
  })
  profileCompletionRate: number;

  @ApiProperty({
    description: 'Email verification rate percentage',
    example: 92.3,
  })
  emailVerificationRate: number;

  @ApiProperty({
    description: 'Average profile completeness percentage',
    example: 78.2,
  })
  averageProfileCompleteness: number;

  @ApiProperty({
    description: 'Engagement metrics by user role',
    example: {
      student: {
        totalUsers: 1000,
        activeUsers: 950,
        profileCompletionRate: 88.5,
        averageCompleteness: 82.1,
      },
      supervisor: {
        totalUsers: 200,
        activeUsers: 190,
        profileCompletionRate: 95.0,
        averageCompleteness: 91.5,
      },
    },
  })
  engagementByRole: Record<
    UserRole,
    {
      totalUsers: number;
      activeUsers: number;
      profileCompletionRate: number;
      averageCompleteness: number;
    }
  >;

  @ApiProperty({
    description: 'User retention rates',
    example: {
      day1: 85.2,
      day7: 72.8,
      day30: 65.4,
    },
  })
  retentionRates: {
    day1: number;
    day7: number;
    day30: number;
  };
}

export class UserDemographicAnalysisDto {
  @ApiProperty({
    description: 'Distribution of users by role',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['student', 'supervisor', 'admin'] },
        count: { type: 'number', example: 1000 },
        percentage: { type: 'number', example: 80.0 },
      },
    },
  })
  roleDistribution: Array<{
    role: UserRole;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({
    description: 'Student-specific analytics',
    example: {
      totalStudents: 1000,
      byYear: [
        { year: 1, count: 250 },
        { year: 2, count: 300 },
        { year: 3, count: 275 },
        { year: 4, count: 175 },
      ],
      byGpaRange: [
        { range: '3.5-4.0', count: 400 },
        { range: '3.0-3.49', count: 350 },
        { range: '2.5-2.99', count: 200 },
        { range: '2.0-2.49', count: 50 },
      ],
      topSkills: [
        { skill: 'JavaScript', count: 450 },
        { skill: 'Python', count: 380 },
        { skill: 'React', count: 320 },
      ],
      topInterests: [
        { interest: 'Web Development', count: 500 },
        { interest: 'AI/ML', count: 350 },
        { interest: 'Mobile Development', count: 280 },
      ],
      topSpecializations: [
        { specialization: 'Computer Science', count: 600 },
        { specialization: 'Software Engineering', count: 400 },
      ],
    },
  })
  studentAnalytics: {
    totalStudents: number;
    byYear: Array<{ year: number; count: number }>;
    byGpaRange: Array<{ range: string; count: number }>;
    topSkills: Array<{ skill: string; count: number }>;
    topInterests: Array<{ interest: string; count: number }>;
    topSpecializations: Array<{ specialization: string; count: number }>;
  };

  @ApiProperty({
    description: 'Supervisor-specific analytics',
    example: {
      totalSupervisors: 200,
      availableSupervisors: 180,
      averageCapacity: 6.5,
      capacityUtilization: 75.2,
      topSpecializations: [
        { specialization: 'Artificial Intelligence', count: 45 },
        { specialization: 'Web Development', count: 38 },
        { specialization: 'Data Science', count: 32 },
      ],
      byCapacityRange: [
        { range: '1-2', count: 20 },
        { range: '3-4', count: 50 },
        { range: '5-9', count: 100 },
        { range: '10+', count: 30 },
      ],
    },
  })
  supervisorAnalytics: {
    totalSupervisors: number;
    availableSupervisors: number;
    averageCapacity: number;
    capacityUtilization: number;
    topSpecializations: Array<{ specialization: string; count: number }>;
    byCapacityRange: Array<{ range: string; count: number }>;
  };
}

export class ComprehensiveUserReportDto {
  @ApiProperty({
    description: 'Unique report identifier',
    example: 'user-report-1640995200000',
  })
  reportId: string;

  @ApiProperty({
    description: 'Report generation timestamp',
    example: '2024-01-20T10:30:00Z',
  })
  generatedAt: Date;

  @ApiProperty({
    description: 'Report period',
    example: {
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-01-31T23:59:59Z',
    },
  })
  period: {
    startDate: Date;
    endDate: Date;
  };

  @ApiProperty({
    description: 'Report summary statistics',
    example: {
      totalUsers: 1250,
      activeUsers: 1180,
      newUsers: 85,
      growthRate: 7.3,
    },
  })
  summary: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    growthRate: number;
  };

  @ApiPropertyOptional({
    description: 'User growth analytics (if requested)',
    type: UserGrowthAnalyticsDto,
  })
  growth?: UserGrowthAnalyticsDto;

  @ApiPropertyOptional({
    description: 'User activity metrics (if requested)',
    type: UserActivityMetricsDto,
  })
  activity?: UserActivityMetricsDto;

  @ApiPropertyOptional({
    description: 'User engagement metrics (if requested)',
    type: UserEngagementMetricsDto,
  })
  engagement?: UserEngagementMetricsDto;

  @ApiPropertyOptional({
    description: 'User demographic analysis (if requested)',
    type: UserDemographicAnalysisDto,
  })
  demographics?: UserDemographicAnalysisDto;
}
