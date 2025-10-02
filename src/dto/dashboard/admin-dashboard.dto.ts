import { ApiProperty } from '@nestjs/swagger';

export class PlatformMetricsDto {
    @ApiProperty({
        description: 'Total number of users',
        example: 1250,
    })
    totalUsers: number;

    @ApiProperty({
        description: 'Active users in the last 24 hours',
        example: 320,
    })
    activeUsers: number;

    @ApiProperty({
        description: 'New users registered today',
        example: 15,
    })
    newUsersToday: number;

    @ApiProperty({
        description: 'Total number of projects',
        example: 450,
    })
    totalProjects: number;

    @ApiProperty({
        description: 'Projects pending approval',
        example: 25,
    })
    pendingProjects: number;

    @ApiProperty({
        description: 'Approved projects',
        example: 380,
    })
    approvedProjects: number;

    @ApiProperty({
        description: 'Total milestones across all projects',
        example: 2100,
    })
    totalMilestones: number;

    @ApiProperty({
        description: 'Completed milestones',
        example: 1450,
    })
    completedMilestones: number;

    @ApiProperty({
        description: 'Overdue milestones',
        example: 85,
    })
    overdueMilestones: number;

    @ApiProperty({
        description: 'System health score (0-100)',
        example: 95,
    })
    systemHealthScore: number;
}

export class UserGrowthDataDto {
    @ApiProperty({
        description: 'Date',
        example: '2024-03-15',
    })
    date: string;

    @ApiProperty({
        description: 'Number of new users',
        example: 12,
    })
    newUsers: number;

    @ApiProperty({
        description: 'Total users up to this date',
        example: 1250,
    })
    totalUsers: number;
}

export class ProjectStatusDistributionDto {
    @ApiProperty({
        description: 'Status name',
        example: 'approved',
    })
    status: string;

    @ApiProperty({
        description: 'Number of projects with this status',
        example: 380,
    })
    count: number;

    @ApiProperty({
        description: 'Percentage of total projects',
        example: 84.4,
    })
    percentage: number;
}

export class SystemAlertDto {
    @ApiProperty({
        description: 'Alert ID',
        example: 'alert-123',
    })
    id: string;

    @ApiProperty({
        description: 'Alert type',
        enum: ['info', 'warning', 'error'],
        example: 'warning',
    })
    type: 'info' | 'warning' | 'error';

    @ApiProperty({
        description: 'Alert title',
        example: 'High Pending Projects',
    })
    title: string;

    @ApiProperty({
        description: 'Alert message',
        example: '25 projects are pending approval',
    })
    message: string;

    @ApiProperty({
        description: 'Alert timestamp',
        example: '2024-03-15T10:30:00Z',
    })
    timestamp: string;

    @ApiProperty({
        description: 'Alert severity (1-5)',
        example: 3,
    })
    severity: number;
}

export class RecentSystemActivityDto {
    @ApiProperty({
        description: 'Activity ID',
        example: 'activity-456',
    })
    id: string;

    @ApiProperty({
        description: 'Activity type',
        example: 'user_registration',
    })
    type: string;

    @ApiProperty({
        description: 'Activity description',
        example: 'New user registered: john.doe@university.edu',
    })
    description: string;

    @ApiProperty({
        description: 'User who performed the activity',
        example: 'John Doe',
        nullable: true,
    })
    userName: string | null;

    @ApiProperty({
        description: 'Activity timestamp',
        example: '2024-03-15T10:30:00Z',
    })
    timestamp: string;
}

export class TopPerformingProjectDto {
    @ApiProperty({
        description: 'Project ID',
        example: 'project-123',
    })
    id: string;

    @ApiProperty({
        description: 'Project title',
        example: 'AI-Powered Recommendation System',
    })
    title: string;

    @ApiProperty({
        description: 'Supervisor name',
        example: 'Dr. Jane Smith',
    })
    supervisorName: string;

    @ApiProperty({
        description: 'Number of views',
        example: 245,
    })
    viewCount: number;

    @ApiProperty({
        description: 'Number of bookmarks',
        example: 38,
    })
    bookmarkCount: number;

    @ApiProperty({
        description: 'Number of applications',
        example: 12,
    })
    applicationCount: number;
}

export class AdminDashboardDto {
    @ApiProperty({
        description: 'Platform-wide metrics',
        type: PlatformMetricsDto,
    })
    metrics: PlatformMetricsDto;

    @ApiProperty({
        description: 'User growth data for the last 30 days',
        type: [UserGrowthDataDto],
    })
    userGrowthData: UserGrowthDataDto[];

    @ApiProperty({
        description: 'Project status distribution',
        type: [ProjectStatusDistributionDto],
    })
    projectStatusDistribution: ProjectStatusDistributionDto[];

    @ApiProperty({
        description: 'System alerts requiring attention',
        type: [SystemAlertDto],
    })
    systemAlerts: SystemAlertDto[];

    @ApiProperty({
        description: 'Recent system activities',
        type: [RecentSystemActivityDto],
    })
    recentActivities: RecentSystemActivityDto[];

    @ApiProperty({
        description: 'Top performing projects',
        type: [TopPerformingProjectDto],
    })
    topPerformingProjects: TopPerformingProjectDto[];

    @ApiProperty({
        description: 'Pending approvals count by type',
        example: {
            projects: 25,
            users: 8,
            reports: 3,
        },
    })
    pendingApprovals: {
        projects: number;
        users: number;
        reports: number;
    };

    @ApiProperty({
        description: 'Last updated timestamp',
        example: '2024-03-15T10:30:00Z',
    })
    lastUpdated: string;
}