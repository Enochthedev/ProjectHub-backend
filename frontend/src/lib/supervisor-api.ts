import { api } from './api';
import {
    SupervisorDashboardData,
    StudentProgressSummary,
    AtRiskStudent,
    SupervisorReport,
    ProgressReportFilters,
    ExportableReport,
    StudentMilestoneOverview,
    SupervisorAnalytics,
    AIInteractionOverview,
    SupervisorAvailability
} from '@/types/supervisor';

export const supervisorApi = {
    // Dashboard
    getDashboard: async (): Promise<SupervisorDashboardData> => {
        try {
            const response = await api.get('/supervisor/dashboard');
            return response;
        } catch (error) {
            console.warn('Supervisor dashboard endpoint not available, using mock data');
            return {
                supervisorId: 'supervisor-1',
                supervisorName: 'Dr. Sarah Johnson',
                totalStudents: 3,
                metrics: {
                    totalMilestones: 15,
                    completedMilestones: 10,
                    overdueMilestones: 1,
                    blockedMilestones: 1,
                    overallCompletionRate: 66.7,
                    averageProgressVelocity: 2.3,
                    atRiskStudentCount: 1
                },
                studentSummaries: [], // Will be populated by getStudentProgress
                atRiskStudents: [], // Will be populated by getAtRiskStudents
                recentActivity: [
                    {
                        studentId: 'student-1',
                        studentName: 'Alice Johnson',
                        activity: 'Submitted milestone 3: Implementation complete',
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
                    },
                    {
                        studentId: 'student-2',
                        studentName: 'Bob Smith',
                        activity: 'AI conversation escalated: Security question needs review',
                        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
                    },
                    {
                        studentId: 'student-3',
                        studentName: 'Carol Davis',
                        activity: 'Scheduled weekly check-in for tomorrow',
                        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
                    }
                ],
                upcomingDeadlines: [
                    {
                        studentId: 'student-2',
                        studentName: 'Bob Smith',
                        milestoneId: 'milestone-3',
                        milestoneTitle: 'Design Phase Complete',
                        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                        priority: 'high' as const,
                        daysUntilDue: 3
                    },
                    {
                        studentId: 'student-1',
                        studentName: 'Alice Johnson',
                        milestoneId: 'milestone-4',
                        milestoneTitle: 'Final Implementation',
                        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        priority: 'high' as const,
                        daysUntilDue: 7
                    }
                ],
                lastUpdated: new Date().toISOString()
            };
        }
    },

    // Student Progress Management
    getStudentProgress: async (): Promise<StudentProgressSummary[]> => {
        try {
            const response = await api.get('/supervisor/students/progress');
            return response;
        } catch (error) {
            // Return mock data when endpoint is not available
            console.warn('Supervisor students endpoint not available, using mock data');
            return [
                {
                    studentId: 'student-1',
                    studentName: 'Alice Johnson',
                    studentEmail: 'alice.johnson@university.edu',
                    totalMilestones: 4,
                    completedMilestones: 3,
                    inProgressMilestones: 1,
                    overdueMilestones: 0,
                    blockedMilestones: 0,
                    completionRate: 75,
                    riskScore: 0.2,
                    nextMilestone: {
                        id: 'milestone-4',
                        title: 'Final Implementation',
                        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        priority: 'high' as const
                    },
                    lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    projectCount: 1
                },
                {
                    studentId: 'student-2',
                    studentName: 'Bob Smith',
                    studentEmail: 'bob.smith@university.edu',
                    totalMilestones: 5,
                    completedMilestones: 2,
                    inProgressMilestones: 1,
                    overdueMilestones: 1,
                    blockedMilestones: 1,
                    completionRate: 40,
                    riskScore: 0.8,
                    nextMilestone: {
                        id: 'milestone-3',
                        title: 'Design Phase Complete',
                        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                        priority: 'high' as const
                    },
                    lastActivity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    projectCount: 1
                },
                {
                    studentId: 'student-3',
                    studentName: 'Carol Davis',
                    studentEmail: 'carol.davis@university.edu',
                    totalMilestones: 6,
                    completedMilestones: 5,
                    inProgressMilestones: 1,
                    overdueMilestones: 0,
                    blockedMilestones: 0,
                    completionRate: 83,
                    riskScore: 0.1,
                    nextMilestone: {
                        id: 'milestone-6',
                        title: 'Final Testing',
                        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                        priority: 'medium' as const
                    },
                    lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    projectCount: 1
                }
            ];
        }
    },

    getStudentOverview: async (studentId: string): Promise<StudentMilestoneOverview> => {
        const response = await api.get(`/supervisor/students/${studentId}/overview`);
        return response;
    },

    // At-Risk Student Management
    getAtRiskStudents: async (): Promise<AtRiskStudent[]> => {
        try {
            const response = await api.get('/supervisor/alerts');
            return response;
        } catch (error) {
            console.warn('Supervisor alerts endpoint not available, using mock data');
            return [
                {
                    studentId: 'student-2',
                    studentName: 'Bob Smith',
                    riskLevel: 'high' as const,
                    riskFactors: [
                        'Missed last meeting',
                        'Behind on milestones',
                        'Low communication frequency',
                        'Overdue deliverables'
                    ],
                    overdueMilestones: 1,
                    blockedMilestones: 1,
                    lastActivity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    recommendedActions: [
                        'Schedule urgent meeting',
                        'Review project scope',
                        'Provide additional support',
                        'Consider deadline extension'
                    ],
                    urgencyScore: 0.8
                },
                {
                    studentId: 'student-4',
                    studentName: 'David Wilson',
                    riskLevel: 'medium' as const,
                    riskFactors: [
                        'Slow progress velocity',
                        'Technical difficulties'
                    ],
                    overdueMilestones: 0,
                    blockedMilestones: 1,
                    lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    recommendedActions: [
                        'Provide technical guidance',
                        'Check in weekly'
                    ],
                    urgencyScore: 0.5
                }
            ];
        }
    },

    // Report Generation
    generateReport: async (filters: ProgressReportFilters): Promise<SupervisorReport> => {
        const params = new URLSearchParams();

        if (filters.studentIds && filters.studentIds.length > 0) {
            filters.studentIds.forEach(id => params.append('studentIds', id));
        }
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.status) params.append('status', filters.status);
        if (filters.priority) params.append('priority', filters.priority);

        const response = await api.get(`/supervisor/reports?${params.toString()}`);
        return response;
    },

    exportReport: async (
        format: 'pdf' | 'csv',
        filters: ProgressReportFilters
    ): Promise<ExportableReport> => {
        const params = new URLSearchParams();
        params.append('format', format);

        if (filters.studentIds && filters.studentIds.length > 0) {
            filters.studentIds.forEach(id => params.append('studentIds', id));
        }
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.status) params.append('status', filters.status);
        if (filters.priority) params.append('priority', filters.priority);

        const response = await api.get(`/supervisor/reports/export?${params.toString()}`);
        return response;
    },

    // Analytics
    getAnalytics: async (): Promise<SupervisorAnalytics> => {
        try {
            const response = await api.get('/supervisor/analytics');
            return response;
        } catch (error) {
            // Return mock analytics data when endpoint is not available
            console.warn('Supervisor analytics endpoint not available, using mock data');
            return {
                id: 'analytics-1',
                supervisorId: 'supervisor-1',
                totalStudents: 8,
                activeProjects: 5,
                completedProjects: 12,
                averageProjectSuccess: 78,
                studentSatisfactionScore: 4.2,
                averageProjectDuration: 6.5,
                onTimeCompletionRate: 85,
                studentProgressDistribution: {
                    onTrack: 5,
                    atRisk: 2,
                    delayed: 1,
                    completed: 0
                },
                monthlyMetrics: [
                    { month: 'Jan', studentsSupervised: 6, projectsCompleted: 2, averageGrade: 82 },
                    { month: 'Feb', studentsSupervised: 7, projectsCompleted: 1, averageGrade: 79 },
                    { month: 'Mar', studentsSupervised: 8, projectsCompleted: 3, averageGrade: 85 },
                    { month: 'Apr', studentsSupervised: 8, projectsCompleted: 2, averageGrade: 81 },
                    { month: 'May', studentsSupervised: 8, projectsCompleted: 1, averageGrade: 77 },
                    { month: 'Jun', studentsSupervised: 8, projectsCompleted: 3, averageGrade: 83 }
                ],
                topPerformingProjects: [
                    { id: 'p1', title: 'AI Learning Analytics', grade: 92, student: 'Alice Johnson' },
                    { id: 'p2', title: 'Smart Campus System', grade: 88, student: 'Carol Davis' },
                    { id: 'p3', title: 'IoT Health Monitor', grade: 85, student: 'David Wilson' }
                ],
                commonChallenges: [
                    { challenge: 'Time Management', frequency: 6, severity: 'medium' },
                    { challenge: 'Technical Complexity', frequency: 4, severity: 'high' },
                    { challenge: 'Communication', frequency: 3, severity: 'low' }
                ],
                aiInteractionStats: {
                    totalInteractions: 156,
                    escalatedInteractions: 8,
                    averageConfidenceScore: 0.82,
                    commonTopics: ['Implementation', 'Debugging', 'Design Patterns']
                },
                generatedAt: new Date().toISOString()
            };
        }
    },

    // AI Interaction Monitoring
    getAIInteractions: async (): Promise<AIInteractionOverview[]> => {
        try {
            // Try to get AI interactions from supervisor endpoint
            const response = await api.get('/supervisor/ai-interactions');
            return response;
        } catch (error) {
            // Fallback to AI assistant endpoint if supervisor-specific endpoint doesn't exist
            try {
                const conversations = await api.get('/ai-assistant/conversations');

                // Transform conversations to AI interaction overview format
                return conversations.map((conv: any) => ({
                    id: conv.id,
                    studentId: conv.studentId,
                    studentName: conv.studentName || 'Unknown Student',
                    conversationId: conv.id,
                    topic: conv.title || 'General Discussion',
                    timestamp: conv.lastMessageAt || conv.createdAt,
                    messageCount: conv.messageCount || 0,
                    requiresReview: conv.status === 'escalated' || false,
                    escalationReason: conv.escalationReason,
                    confidenceScore: conv.averageConfidenceScore || 0.8,
                    category: conv.category || 'general',
                    lastMessage: conv.lastMessage || 'No messages yet',
                }));
            } catch (fallbackError) {
                console.warn('AI interactions endpoints not available, using mock data');
                return [
                    {
                        id: 'ai-1',
                        studentId: 'student-1',
                        studentName: 'Alice Johnson',
                        conversationId: 'conv-1',
                        topic: 'React State Management',
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                        messageCount: 8,
                        requiresReview: false,
                        escalationReason: undefined,
                        confidenceScore: 0.92,
                        category: 'technical',
                        lastMessage: 'Thank you! That explanation of useReducer vs useState really helped.'
                    },
                    {
                        id: 'ai-2',
                        studentId: 'student-2',
                        studentName: 'Bob Smith',
                        conversationId: 'conv-2',
                        topic: 'Database Design Questions',
                        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                        messageCount: 12,
                        requiresReview: true,
                        escalationReason: 'Student asking about sensitive data handling',
                        confidenceScore: 0.65,
                        category: 'architecture',
                        lastMessage: 'How should I handle user passwords in my database?'
                    },
                    {
                        id: 'ai-3',
                        studentId: 'student-3',
                        studentName: 'Carol Davis',
                        conversationId: 'conv-3',
                        topic: 'Project Planning Help',
                        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                        messageCount: 5,
                        requiresReview: false,
                        escalationReason: undefined,
                        confidenceScore: 0.88,
                        category: 'planning',
                        lastMessage: 'The milestone breakdown you suggested looks perfect!'
                    }
                ];
            }
        }
    },

    getEscalatedInteractions: async (): Promise<AIInteractionOverview[]> => {
        try {
            const response = await api.get('/supervisor/ai-interactions?status=escalated');
            return response;
        } catch (error) {
            // Fallback to filtering all interactions
            const allInteractions = await supervisorApi.getAIInteractions();
            return allInteractions.filter(interaction => interaction.requiresReview);
        }
    },

    reviewAIInteraction: async (interactionId: string, action: 'approve' | 'escalate' | 'flag'): Promise<void> => {
        await api.post(`/supervisor/ai-interactions/${interactionId}/review`, { action });
    },

    // Availability Management
    getAvailability: async (): Promise<SupervisorAvailability> => {
        try {
            const response = await api.get('/supervisor/availability');
            return response;
        } catch (error) {
            // Return mock availability data when endpoint is not available
            console.warn('Supervisor availability endpoint not available, using mock data');
            return {
                id: 'availability-1',
                supervisorId: 'supervisor-1',
                isAvailable: true,
                capacity: 8,
                currentStudents: 5,
                availableSlots: 3,
                specializations: ['Software Engineering', 'Machine Learning', 'Web Development'],
                officeHours: [
                    {
                        id: 'oh-1',
                        dayOfWeek: 'Monday',
                        startTime: '10:00',
                        endTime: '12:00',
                        location: 'Office 301',
                        isRecurring: true
                    },
                    {
                        id: 'oh-2',
                        dayOfWeek: 'Wednesday',
                        startTime: '14:00',
                        endTime: '16:00',
                        location: 'Office 301',
                        isRecurring: true
                    },
                    {
                        id: 'oh-3',
                        dayOfWeek: 'Friday',
                        startTime: '09:00',
                        endTime: '11:00',
                        location: 'Virtual Meeting',
                        isRecurring: true
                    }
                ],
                unavailablePeriods: [
                    {
                        id: 'up-1',
                        startDate: '2024-12-20',
                        endDate: '2024-01-05',
                        reason: 'Winter Break',
                        type: 'vacation'
                    }
                ],
                lastUpdated: new Date().toISOString(),
            };
        }
    },

    updateAvailability: async (availability: Partial<SupervisorAvailability>): Promise<SupervisorAvailability> => {
        const response = await api.put('/supervisor/availability', availability);
        return response;
    },

    // Project Management
    getSupervisorProjects: async (): Promise<any[]> => {
        try {
            const response = await api.get('/projects?supervisor=current');
            return response.projects || [];
        } catch (error) {
            console.error('Failed to fetch supervisor projects:', error);
            return [];
        }
    },

    createProject: async (projectData: any): Promise<any> => {
        const response = await api.post('/projects', projectData);
        return response;
    },

    updateProject: async (projectId: string, updates: any): Promise<any> => {
        const response = await api.put(`/projects/${projectId}`, updates);
        return response;
    },

    approveProjectApplication: async (applicationId: string): Promise<void> => {
        await api.post(`/supervisor/applications/${applicationId}/approve`);
    },

    rejectProjectApplication: async (applicationId: string, reason?: string): Promise<void> => {
        await api.post(`/supervisor/applications/${applicationId}/reject`, { reason });
    },

    // Student Communication
    sendMessageToStudent: async (studentId: string, message: string, subject?: string): Promise<void> => {
        await api.post(`/supervisor/students/${studentId}/message`, {
            message,
            subject: subject || 'Message from Supervisor',
        });
    },

    scheduleStudentMeeting: async (studentId: string, meetingData: {
        title: string;
        description?: string;
        startTime: string;
        endTime: string;
        location?: string;
    }): Promise<void> => {
        await api.post(`/supervisor/students/${studentId}/meeting`, meetingData);
    },

    // Milestone Management
    getSupervisorMilestones: async (): Promise<any[]> => {
        try {
            const response = await api.get('/supervisor/milestones');
            return response.milestones || [];
        } catch (error) {
            console.error('Failed to fetch supervisor milestones:', error);
            return [];
        }
    },

    approveMilestone: async (milestoneId: string, feedback?: string): Promise<void> => {
        await api.post(`/milestones/${milestoneId}/approve`, { feedback });
    },

    requestMilestoneRevision: async (milestoneId: string, feedback: string): Promise<void> => {
        await api.post(`/milestones/${milestoneId}/request-revision`, { feedback });
    },

    rejectMilestone: async (milestoneId: string, reason: string): Promise<void> => {
        await api.post(`/milestones/${milestoneId}/reject`, { reason });
    },

    addMilestoneComment: async (milestoneId: string, comment: string): Promise<void> => {
        await api.post(`/milestones/${milestoneId}/comments`, { comment });
    },

    getMilestoneDetails: async (milestoneId: string): Promise<any> => {
        const response = await api.get(`/milestones/${milestoneId}`);
        return response;
    },
};