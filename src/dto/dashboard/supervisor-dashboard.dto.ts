import { ApiProperty } from '@nestjs/swagger';

export class StudentProgressDto {
    @ApiProperty({
        description: 'Student ID',
        example: 'student-123',
    })
    id: string;

    @ApiProperty({
        description: 'Student name',
        example: 'John Doe',
    })
    name: string;

    @ApiProperty({
        description: 'Student email',
        example: 'john.doe@university.edu',
    })
    email: string;

    @ApiProperty({
        description: 'Current project information',
        example: {
            id: 'project-123',
            title: 'AI-Powered Recommendation System',
            progressPercentage: 65,
        },
        nullable: true,
    })
    currentProject: {
        id: string;
        title: string;
        progressPercentage: number;
    } | null;

    @ApiProperty({
        description: 'Completed milestones count',
        example: 8,
    })
    completedMilestones: number;

    @ApiProperty({
        description: 'Total milestones count',
        example: 12,
    })
    totalMilestones: number;

    @ApiProperty({
        description: 'Overdue milestones count',
        example: 1,
    })
    overdueMilestones: number;

    @ApiProperty({
        description: 'Last activity timestamp',
        example: '2024-03-15T10:30:00Z',
    })
    lastActivity: string;

    @ApiProperty({
        description: 'Risk level based on progress',
        enum: ['low', 'medium', 'high'],
        example: 'medium',
    })
    riskLevel: 'low' | 'medium' | 'high';
}

export class SupervisorProjectDto {
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
        description: 'Assigned student information',
        example: {
            id: 'student-123',
            name: 'John Doe',
        },
        nullable: true,
    })
    assignedStudent: {
        id: string;
        name: string;
    } | null;

    @ApiProperty({
        description: 'Project progress percentage',
        example: 65,
    })
    progressPercentage: number;

    @ApiProperty({
        description: 'Number of pending applications',
        example: 3,
    })
    pendingApplications: number;

    @ApiProperty({
        description: 'Next milestone due date',
        example: '2024-04-15',
        nullable: true,
    })
    nextMilestoneDue: string | null;

    @ApiProperty({
        description: 'Project status',
        example: 'active',
    })
    status: string;
}

export class UpcomingDeadlineDto {
    @ApiProperty({
        description: 'Milestone ID',
        example: 'milestone-456',
    })
    id: string;

    @ApiProperty({
        description: 'Milestone title',
        example: 'System Testing',
    })
    title: string;

    @ApiProperty({
        description: 'Student name',
        example: 'John Doe',
    })
    studentName: string;

    @ApiProperty({
        description: 'Project title',
        example: 'AI-Powered Recommendation System',
    })
    projectTitle: string;

    @ApiProperty({
        description: 'Due date',
        example: '2024-04-15',
    })
    dueDate: string;

    @ApiProperty({
        description: 'Days until due (negative if overdue)',
        example: 5,
    })
    daysUntilDue: number;

    @ApiProperty({
        description: 'Priority level',
        example: 'high',
    })
    priority: string;

    @ApiProperty({
        description: 'Current status',
        example: 'in_progress',
    })
    status: string;
}

export class AIInteractionSummaryDto {
    @ApiProperty({
        description: 'Total AI conversations supervised',
        example: 45,
    })
    totalConversations: number;

    @ApiProperty({
        description: 'Conversations requiring review',
        example: 3,
    })
    conversationsNeedingReview: number;

    @ApiProperty({
        description: 'Average confidence score',
        example: 87.5,
    })
    averageConfidenceScore: number;

    @ApiProperty({
        description: 'Common question categories',
        example: [
            { category: 'Technical Implementation', count: 15 },
            { category: 'Project Planning', count: 12 },
            { category: 'Literature Review', count: 8 },
        ],
    })
    commonCategories: Array<{
        category: string;
        count: number;
    }>;

    @ApiProperty({
        description: 'Recent escalated conversations',
        example: [
            {
                id: 'conv-123',
                studentName: 'John Doe',
                topic: 'Complex algorithm implementation',
                timestamp: '2024-03-15T10:30:00Z',
            },
        ],
    })
    recentEscalations: Array<{
        id: string;
        studentName: string;
        topic: string;
        timestamp: string;
    }>;
}

export class SupervisorMetricsDto {
    @ApiProperty({
        description: 'Total students supervised',
        example: 8,
    })
    totalStudents: number;

    @ApiProperty({
        description: 'Active projects count',
        example: 6,
    })
    activeProjects: number;

    @ApiProperty({
        description: 'Completed projects this year',
        example: 12,
    })
    completedProjectsThisYear: number;

    @ApiProperty({
        description: 'Pending applications to review',
        example: 5,
    })
    pendingApplications: number;

    @ApiProperty({
        description: 'Overdue milestones across all students',
        example: 3,
    })
    overdueMilestones: number;

    @ApiProperty({
        description: 'Students at risk (behind schedule)',
        example: 2,
    })
    studentsAtRisk: number;

    @ApiProperty({
        description: 'Average student progress percentage',
        example: 72.5,
    })
    averageStudentProgress: number;

    @ApiProperty({
        description: 'Response time to student queries (hours)',
        example: 4.2,
    })
    averageResponseTime: number;
}

export class SupervisorDashboardDto {
    @ApiProperty({
        description: 'Supervisor ID',
        example: 'supervisor-123',
    })
    supervisorId: string;

    @ApiProperty({
        description: 'Supervisor name',
        example: 'Dr. Jane Smith',
    })
    supervisorName: string;

    @ApiProperty({
        description: 'Key metrics overview',
        type: SupervisorMetricsDto,
    })
    metrics: SupervisorMetricsDto;

    @ApiProperty({
        description: 'Student progress summaries',
        type: [StudentProgressDto],
    })
    studentProgress: StudentProgressDto[];

    @ApiProperty({
        description: 'Supervisor\'s projects',
        type: [SupervisorProjectDto],
    })
    projects: SupervisorProjectDto[];

    @ApiProperty({
        description: 'Upcoming deadlines across all students',
        type: [UpcomingDeadlineDto],
    })
    upcomingDeadlines: UpcomingDeadlineDto[];

    @ApiProperty({
        description: 'AI interaction oversight summary',
        type: AIInteractionSummaryDto,
    })
    aiInteractionSummary: AIInteractionSummaryDto;

    @ApiProperty({
        description: 'Recent activities from students',
        example: [
            {
                id: 'activity-123',
                studentName: 'John Doe',
                type: 'milestone_update',
                description: 'Completed Literature Review milestone',
                timestamp: '2024-03-15T10:30:00Z',
            },
        ],
    })
    recentActivities: Array<{
        id: string;
        studentName: string;
        type: string;
        description: string;
        timestamp: string;
    }>;

    @ApiProperty({
        description: 'Last updated timestamp',
        example: '2024-03-15T10:30:00Z',
    })
    lastUpdated: string;
}