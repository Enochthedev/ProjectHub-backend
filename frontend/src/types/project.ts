// Project-related type definitions

export interface Project {
    id: string;
    title: string;
    abstract: string;
    specialization: string;
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
    year: number;
    tags: string[];
    technologyStack: string[];
    isGroupProject: boolean;
    approvalStatus: 'pending' | 'approved' | 'rejected' | 'archived';
    githubUrl?: string;
    demoUrl?: string;
    supervisor: {
        id: string;
        name: string;
        specializations: string[];
    };
    viewCount: number;
    bookmarkCount: number;

    // Project Success Metrics
    successScore?: number; // 0-100 overall project success score
    completionRate?: number; // 0-100 percentage of students who completed this project
    averageGrade?: number; // 0-100 average grade students received
    studentSatisfaction?: number; // 1-5 student satisfaction rating
    difficultyRating?: number; // 1-5 actual difficulty as rated by students
    recommendationScore?: number; // AI-calculated recommendation score

    // Completion Status
    isCompleted?: boolean;
    completedAt?: string;

    createdAt: string;
    updatedAt: string;
}

export interface ProjectSearchParams {
    query?: string;
    specialization?: string;
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
    year?: number;
    tags?: string[];
    technologyStack?: string[];
    isGroupProject?: boolean;
    supervisorId?: string;
    page?: number;
    limit?: number;
    sortBy?: 'relevance' | 'title' | 'createdAt' | 'viewCount' | 'bookmarkCount' | 'successScore' | 'averageGrade' | 'studentSatisfaction';
    sortOrder?: 'asc' | 'desc';
}

export interface ProjectSearchResponse {
    projects: Project[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    filters: {
        specializations: string[];
        years: number[];
        tags: string[];
        technologyStack: string[];
        supervisors: Array<{
            id: string;
            name: string;
            projectCount: number;
        }>;
    };
}

export interface ProjectFilters {
    specializations: string[];
    difficultyLevels: ('beginner' | 'intermediate' | 'advanced')[];
    years: number[];
    tags: string[];
    technologyStack: string[];
    isGroupProject?: boolean;
    supervisorIds: string[];
}

export interface CreateProjectData {
    title: string;
    abstract: string;
    specialization: string;
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
    year: number;
    tags: string[];
    technologyStack: string[];
    isGroupProject: boolean;
    githubUrl?: string;
    demoUrl?: string;
}

export interface UpdateProjectData extends Partial<CreateProjectData> {
    approvalStatus?: 'pending' | 'approved' | 'rejected' | 'archived';
}

// Bookmark-related types
export interface Bookmark {
    id: string;
    projectId: string;
    notes?: string;
    category?: BookmarkCategory;
    createdAt: string;
    project: Project;
}

export interface BookmarkCategory {
    id: string;
    name: string;
    description?: string;
    color?: string;
    bookmarkCount: number;
}

export interface CreateBookmarkData {
    projectId: string;
    notes?: string;
    categoryId?: string;
}

export interface UpdateBookmarkData {
    notes?: string;
    categoryId?: string;
}

// Project Scoring Types
export interface ProjectScore {
    id: string;
    projectId: string;
    studentId: string;
    supervisorId: string;

    // Core Scores
    finalGrade: number; // 0-100
    completionStatus: 'completed' | 'incomplete' | 'dropped';

    // Student Feedback
    difficultyRating: number; // 1-5 (how difficult was it actually)
    satisfactionRating: number; // 1-5 (how satisfied with the project)
    wouldRecommend: boolean; // would recommend to other students

    // Optional feedback
    feedback?: string;
    strengths?: string[];
    challenges?: string[];

    // Timestamps
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ProjectAnalytics {
    projectId: string;

    // Calculated Metrics
    successScore: number; // 0-100 overall success score
    completionRate: number; // percentage of students who completed
    averageGrade: number; // average final grade
    averageSatisfaction: number; // average satisfaction rating
    averageDifficulty: number; // average difficulty rating
    recommendationRate: number; // percentage who would recommend

    // Counts
    totalStudents: number;
    completedStudents: number;
    droppedStudents: number;

    // Trends
    gradeDistribution: {
        'A': number; // 90-100
        'B': number; // 80-89
        'C': number; // 70-79
        'D': number; // 60-69
        'F': number; // 0-59
    };

    // Last updated
    lastCalculated: string;
}

export interface SupervisorRanking {
    supervisorId: string;
    supervisorName: string;

    // Performance Metrics
    averageProjectSuccess: number; // average success score across all projects
    averageStudentSatisfaction: number; // average satisfaction across all students
    completionRate: number; // percentage of students who complete projects
    averageGrade: number; // average grade students receive

    // Project Counts
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;

    // Rankings
    overallRank?: number;
    satisfactionRank?: number;
    completionRank?: number;

    // Calculated at
    lastUpdated: string;
}

// Current Project Management Types
export interface CurrentProject extends Project {
    // Assignment Details
    assignedAt: string;
    startDate: string;
    expectedEndDate: string;
    actualEndDate?: string;

    // Status Tracking
    projectStatus: 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
    overallProgress: number; // 0-100 calculated from milestones

    // Student Information
    student: {
        id: string;
        name: string;
        email: string;
        studentId: string;
    };

    // Milestone Integration
    totalMilestones: number;
    completedMilestones: number;
    overdueMilestones: number;
    upcomingDeadlines: Array<{
        milestoneId: string;
        title: string;
        dueDate: string;
        priority: 'low' | 'medium' | 'high';
    }>;

    // Communication
    lastCommunication?: {
        type: 'message' | 'meeting' | 'milestone_update' | 'status_change';
        timestamp: string;
        from: 'student' | 'supervisor';
        summary: string;
    };

    // Progress Tracking
    weeklyProgress: Array<{
        week: string; // ISO week format (YYYY-WW)
        hoursWorked: number;
        milestonesCompleted: number;
        progressPercentage: number;
        notes?: string;
    }>;

    // Notifications
    hasUnreadUpdates: boolean;
    pendingApprovals: number;
}

export interface ProjectAssignment {
    id: string;
    projectId: string;
    studentId: string;
    supervisorId: string;
    assignedAt: string;
    status: 'pending' | 'accepted' | 'declined' | 'active' | 'completed';

    // Assignment Details
    expectedStartDate: string;
    expectedEndDate: string;
    actualStartDate?: string;
    actualEndDate?: string;

    // Terms and Conditions
    terms?: string;
    requirements?: string[];
    deliverables?: string[];

    // Responses
    studentResponse?: {
        status: 'accepted' | 'declined';
        message?: string;
        respondedAt: string;
    };

    supervisorNotes?: string;

    createdAt: string;
    updatedAt: string;
}

export interface ProjectStatusUpdate {
    id: string;
    projectId: string;
    studentId: string;
    supervisorId?: string;

    // Update Details
    previousStatus: string;
    newStatus: string;
    reason?: string;
    description: string;

    // Attachments and Evidence
    attachments?: Array<{
        id: string;
        name: string;
        url: string;
        type: string;
        size: number;
    }>;

    // Approval Workflow
    requiresApproval: boolean;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: string;
    approvalNotes?: string;

    // Visibility
    isVisibleToStudent: boolean;
    isVisibleToSupervisor: boolean;

    createdAt: string;
    updatedAt: string;
}

export interface ProjectCommunication {
    id: string;
    projectId: string;

    // Participants
    fromUserId: string;
    fromUserType: 'student' | 'supervisor';
    toUserId: string;
    toUserType: 'student' | 'supervisor';

    // Message Details
    type: 'message' | 'meeting_request' | 'milestone_feedback' | 'status_inquiry' | 'urgent';
    subject: string;
    content: string;

    // Attachments
    attachments?: Array<{
        id: string;
        name: string;
        url: string;
        type: string;
        size: number;
    }>;

    // Status
    isRead: boolean;
    readAt?: string;
    isUrgent: boolean;
    requiresResponse: boolean;

    // Threading
    parentMessageId?: string;
    threadId?: string;

    // Meeting Details (if type is meeting_request)
    meetingDetails?: {
        proposedTimes: string[];
        duration: number; // minutes
        location?: string;
        isVirtual: boolean;
        meetingUrl?: string;
        agenda?: string;
    };

    createdAt: string;
    updatedAt: string;
}

export interface ProjectProgressVisualization {
    projectId: string;

    // Timeline Data
    timeline: Array<{
        date: string;
        event: string;
        type: 'milestone' | 'status_change' | 'communication' | 'deadline';
        description: string;
        progress: number;
    }>;

    // Progress Metrics
    overallProgress: number;
    milestoneProgress: {
        completed: number;
        total: number;
        percentage: number;
    };

    // Time Tracking
    timeMetrics: {
        totalHoursWorked: number;
        estimatedHours: number;
        efficiency: number; // actual vs estimated
        weeklyHours: Array<{
            week: string;
            hours: number;
        }>;
    };

    // Performance Indicators
    performanceIndicators: {
        onTrack: boolean;
        riskLevel: 'low' | 'medium' | 'high';
        predictedCompletionDate: string;
        delayDays: number;
        qualityScore: number; // 0-100
    };

    // Milestone Breakdown
    milestoneBreakdown: Array<{
        milestoneId: string;
        title: string;
        status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
        progress: number;
        dueDate: string;
        completedDate?: string;
        daysOverdue?: number;
    }>;

    lastUpdated: string;
}

export interface ProjectDeadlineNotification {
    id: string;
    projectId: string;
    milestoneId?: string;

    // Notification Details
    type: 'upcoming_deadline' | 'overdue' | 'milestone_due' | 'status_reminder';
    title: string;
    message: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';

    // Recipients
    recipientIds: string[];
    recipientTypes: ('student' | 'supervisor')[];

    // Timing
    scheduledFor: string;
    sentAt?: string;

    // Delivery Channels
    channels: ('email' | 'in_app' | 'sms')[];
    deliveryStatus: {
        email?: 'pending' | 'sent' | 'delivered' | 'failed';
        inApp?: 'pending' | 'sent' | 'read' | 'dismissed';
        sms?: 'pending' | 'sent' | 'delivered' | 'failed';
    };

    // Actions
    actionRequired: boolean;
    actionType?: 'update_status' | 'submit_milestone' | 'schedule_meeting' | 'provide_feedback';
    actionUrl?: string;

    // Tracking
    isRead: boolean;
    readAt?: string;
    isDismissed: boolean;
    dismissedAt?: string;

    createdAt: string;
    updatedAt: string;
}