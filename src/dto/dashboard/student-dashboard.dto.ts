import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';

export class CurrentProjectDto {
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
        description: 'Project abstract',
        example: 'A machine learning system that provides personalized recommendations...',
    })
    abstract: string;

    @ApiProperty({
        description: 'Supervisor name',
        example: 'Dr. Jane Smith',
    })
    supervisorName: string;

    @ApiProperty({
        description: 'Project progress percentage',
        example: 65,
    })
    progressPercentage: number;

    @ApiProperty({
        description: 'Next milestone due date',
        example: '2024-04-15',
        nullable: true,
    })
    nextMilestoneDue: string | null;

    @ApiProperty({
        description: 'Application status',
        enum: ['pending', 'approved', 'rejected'],
        example: 'approved',
    })
    applicationStatus: string;
}

export class RecentActivityDto {
    @ApiProperty({
        description: 'Activity ID',
        example: 'activity-123',
    })
    id: string;

    @ApiProperty({
        description: 'Activity type',
        example: 'milestone_update',
    })
    type: string;

    @ApiProperty({
        description: 'Activity description',
        example: 'Updated milestone: Literature Review',
    })
    description: string;

    @ApiProperty({
        description: 'Activity timestamp',
        example: '2024-03-15T10:30:00Z',
    })
    timestamp: string;

    @ApiProperty({
        description: 'Related entity ID (project, milestone, etc.)',
        example: 'milestone-456',
        nullable: true,
    })
    relatedEntityId: string | null;
}

export class BookmarkedProjectDto {
    @ApiProperty({
        description: 'Project ID',
        example: 'project-789',
    })
    id: string;

    @ApiProperty({
        description: 'Project title',
        example: 'Blockchain-based Voting System',
    })
    title: string;

    @ApiProperty({
        description: 'Project specialization',
        example: 'Software Engineering',
    })
    specialization: string;

    @ApiProperty({
        description: 'Difficulty level',
        example: 'intermediate',
    })
    difficultyLevel: string;

    @ApiProperty({
        description: 'Supervisor name',
        example: 'Dr. John Doe',
    })
    supervisorName: string;

    @ApiProperty({
        description: 'Bookmark creation date',
        example: '2024-03-10T14:20:00Z',
    })
    bookmarkedAt: string;
}

export class UpcomingMilestoneDto {
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
        description: 'Due date',
        example: '2024-04-15',
    })
    dueDate: string;

    @ApiProperty({
        description: 'Priority level',
        example: 'high',
    })
    priority: string;

    @ApiProperty({
        description: 'Days until due',
        example: 5,
    })
    daysUntilDue: number;

    @ApiProperty({
        description: 'Current status',
        example: 'in_progress',
    })
    status: string;
}

export class RecommendationDto {
    @ApiProperty({
        description: 'Recommendation ID',
        example: 'rec-123',
    })
    id: string;

    @ApiProperty({
        description: 'Recommendation type',
        example: 'project',
    })
    type: string;

    @ApiProperty({
        description: 'Recommended project ID',
        example: 'project-999',
    })
    projectId: string;

    @ApiProperty({
        description: 'Project title',
        example: 'IoT Smart Home System',
    })
    title: string;

    @ApiProperty({
        description: 'Recommendation reason',
        example: 'Based on your interest in IoT and embedded systems',
    })
    reason: string;

    @ApiProperty({
        description: 'Confidence score (0-100)',
        example: 85,
    })
    confidenceScore: number;
}

export class StudentDashboardDto {
    @ApiProperty({
        description: 'Student ID',
        example: 'student-123',
    })
    studentId: string;

    @ApiProperty({
        description: 'Student name',
        example: 'John Doe',
    })
    studentName: string;

    @ApiProperty({
        description: 'Current project information',
        type: CurrentProjectDto,
        nullable: true,
    })
    currentProject: CurrentProjectDto | null;

    @ApiProperty({
        description: 'Recent activities',
        type: [RecentActivityDto],
    })
    recentActivities: RecentActivityDto[];

    @ApiProperty({
        description: 'Bookmarked projects',
        type: [BookmarkedProjectDto],
    })
    bookmarkedProjects: BookmarkedProjectDto[];

    @ApiProperty({
        description: 'Upcoming milestones',
        type: [UpcomingMilestoneDto],
    })
    upcomingMilestones: UpcomingMilestoneDto[];

    @ApiProperty({
        description: 'AI-generated recommendations',
        type: [RecommendationDto],
    })
    recommendations: RecommendationDto[];

    @ApiProperty({
        description: 'Quick stats',
        example: {
            totalBookmarks: 5,
            completedMilestones: 8,
            totalMilestones: 12,
            averageProgress: 67,
        },
    })
    quickStats: {
        totalBookmarks: number;
        completedMilestones: number;
        totalMilestones: number;
        averageProgress: number;
    };

    @ApiProperty({
        description: 'Last updated timestamp',
        example: '2024-03-15T10:30:00Z',
    })
    lastUpdated: string;
}