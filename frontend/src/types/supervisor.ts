// Supervisor-specific type definitions

export interface SupervisorProfile {
    id: string;
    name: string;
    specializations: string[];
    isAvailable: boolean;
    capacity: number;
    profileUpdatedAt: string;
}

export interface StudentProgressSummary {
    studentId: string;
    studentName: string;
    studentEmail: string;
    totalMilestones: number;
    completedMilestones: number;
    inProgressMilestones: number;
    overdueMilestones: number;
    blockedMilestones: number;
    completionRate: number;
    riskScore: number;
    nextMilestone: {
        id: string;
        title: string;
        dueDate: string;
        priority: 'low' | 'medium' | 'high';
    } | null;
    lastActivity: string | null;
    projectCount: number;
}

export interface AtRiskStudent {
    studentId: string;
    studentName: string;
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
    overdueMilestones: number;
    blockedMilestones: number;
    lastActivity: string | null;
    recommendedActions: string[];
    urgencyScore: number;
}

export interface SupervisorDashboardData {
    supervisorId: string;
    supervisorName: string;
    totalStudents: number;
    metrics: {
        totalMilestones: number;
        completedMilestones: number;
        overdueMilestones: number;
        blockedMilestones: number;
        overallCompletionRate: number;
        averageProgressVelocity: number;
        atRiskStudentCount: number;
    };
    studentSummaries: StudentProgressSummary[];
    atRiskStudents: AtRiskStudent[];
    recentActivity: Array<{
        studentId: string;
        studentName: string;
        activity: string;
        timestamp: string;
    }>;
    upcomingDeadlines: Array<{
        studentId: string;
        studentName: string;
        milestoneId: string;
        milestoneTitle: string;
        dueDate: string;
        priority: 'low' | 'medium' | 'high';
        daysUntilDue: number;
    }>;
    lastUpdated: string;
}

export interface SupervisorReport {
    reportId: string;
    supervisorId: string;
    generatedAt: string;
    reportPeriod: {
        startDate: string | null;
        endDate: string | null;
    };
    filters: ProgressReportFilters;
    metrics: {
        totalMilestones: number;
        completedMilestones: number;
        overdueMilestones: number;
        blockedMilestones: number;
        overallCompletionRate: number;
        averageProgressVelocity: number;
        atRiskStudentCount: number;
    };
    studentData: Array<{
        studentId: string;
        studentName: string;
        milestones: Array<{
            id: string;
            title: string;
            status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'blocked';
            priority: 'low' | 'medium' | 'high';
            dueDate: string;
            isOverdue: boolean;
            projectTitle: string;
        }>;
        progressSummary: StudentProgressSummary;
    }>;
    summary: {
        totalStudents: number;
        totalMilestones: number;
        completionRate: number;
        atRiskStudents: number;
    };
}

export interface ProgressReportFilters {
    studentIds?: string[];
    startDate?: string;
    endDate?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'blocked';
    priority?: 'low' | 'medium' | 'high';
}

export interface ExportableReport {
    reportId: string;
    format: 'pdf' | 'csv';
    filename: string;
    content: string;
    mimeType: string;
    size: number;
    generatedAt: string;
}

export interface StudentMilestoneOverview {
    studentId: string;
    studentName: string;
    studentEmail: string;
    milestones: Array<{
        id: string;
        title: string;
        description: string;
        status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'blocked';
        priority: 'low' | 'medium' | 'high';
        dueDate: string;
        estimatedHours: number;
        actualHours: number;
        isOverdue: boolean;
        projectTitle: string;
        notesCount: number;
        lastUpdated: string;
    }>;
    analytics: {
        completionRate: number;
        averageTimePerMilestone: number;
        productivityScore: number;
        riskScore: number;
    };
    progressSummary: StudentProgressSummary;
    lastUpdated: string;
}

export interface SupervisorAnalytics {
    supervisorId: string;
    totalStudents: number;
    overallMetrics: {
        totalMilestones: number;
        completedMilestones: number;
        overdueMilestones: number;
        blockedMilestones: number;
        overallCompletionRate: number;
        averageProgressVelocity: number;
        atRiskStudentCount: number;
    };
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
    trendAnalysis: {
        completionTrend: 'improving' | 'stable' | 'declining';
        velocityTrend: 'improving' | 'stable' | 'declining';
        riskTrend: 'decreasing' | 'stable' | 'increasing';
        monthlyProgress: Array<{
            month: string;
            completionRate: number;
        }>;
    };
    benchmarks: {
        departmentAverage: number;
        universityAverage: number;
        performanceRanking: 'excellent' | 'above_average' | 'average' | 'below_average';
    };
    insights: string[];
    generatedAt: string;
}

export interface AIInteractionOverview {
    id: string;
    studentId: string;
    studentName: string;
    conversationId: string;
    topic: string;
    timestamp: string;
    messageCount: number;
    requiresReview: boolean;
    escalationReason?: string;
    confidenceScore: number;
    category: string;
    lastMessage: string;
}

export interface SupervisorAvailability {
    id: string;
    supervisorId: string;
    isAvailable: boolean;
    capacity: number;
    currentStudents: number;
    availableSlots: number;
    specializations: string[];
    officeHours: Array<{
        day: string;
        startTime: string;
        endTime: string;
        location: string;
    }>;
    unavailablePeriods: Array<{
        startDate: string;
        endDate: string;
        reason: string;
    }>;
    lastUpdated: string;
}

// Additional types for supervisor - student relationships
export interface StudentRequest {
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    studentProfile: {
        year: number;
        specialization: string;
        gpa: number;
        skills: string[];
        interests: string[];
        previousProjects: Array<{
            title: string;
            description: string;
            technologies: string[];
            outcome: string;
        }>;
    };
    requestMessage: string;
    requestedAt: string;
    status: 'pending' | 'accepted' | 'rejected';
    priority: 'low' | 'normal' | 'high';
    matchScore: number;
    preferredProject?: {
        title: string;
        description: string;
        specialization: string;
    };
}

export interface SupervisorPublicProfile {
    id: string;
    name: string;
    email: string;
    specializations: string[];
    currentStudents: number;
    maxCapacity: number;
    isAvailable: boolean;
    averageRating: number;
    totalRatings: number;
    researchInterests: string[];
    officeLocation: string;
    officeHours: string;
    responseTime: string;
    successRate: number;
    recentProjects: Array<{
        title: string;
        year: number;
        outcome: string;
    }>;
    isPreferred?: boolean;
    requestStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
}