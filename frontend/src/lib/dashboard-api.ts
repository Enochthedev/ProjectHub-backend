import { api } from './api';

// Dashboard API Types
export interface StudentDashboardData {
    currentProject: {
        id: string;
        title: string;
        description: string;
        supervisor: {
            id: string;
            name: string;
            lastContact: string;
        };
        progress: {
            percentage: number;
            currentPhase: string;
            nextMilestone: {
                title: string;
                dueDate: string;
                daysRemaining: number;
            };
        };
        status: 'active' | 'pending' | 'completed' | 'none';
    } | null;
    recentActivity: {
        id: string;
        type: 'milestone' | 'ai_chat' | 'supervisor_message' | 'bookmark' | 'view';
        title: string;
        timestamp: string;
        projectRelated?: boolean;
    }[];
    trendingProjects: {
        id: string;
        title: string;
        specialization: string;
        difficultyLevel: string;
        isBookmarked: boolean;
    }[];
    upcomingMilestones: {
        id: string;
        title: string;
        dueDate: string;
        status: string;
        projectId?: string;
    }[];
    aiConversations: {
        id: string;
        title: string;
        lastMessage: string;
        timestamp: string;
        projectRelated: boolean;
    }[];
    recommendations: {
        id: string;
        title: string;
        reason: string;
        confidence: number;
    }[];
}

export interface SupervisorDashboardData {
    projectStatistics: {
        totalProjects: number;
        activeApplications: number;
        completedProjects: number;
    };
    recentApplications: {
        id: string;
        studentName: string;
        projectTitle: string;
        timestamp: string;
        status: 'pending' | 'approved' | 'rejected';
    }[];
    studentProgress: {
        studentId: string;
        studentName: string;
        projectTitle: string;
        progressPercentage: number;
        lastActivity: string;
    }[];
}

export interface AdminDashboardData {
    platformStatistics: {
        totalUsers: number;
        activeProjects: number;
        pendingApprovals: number;
        systemHealth: 'healthy' | 'warning' | 'critical';
    };
    recentActivity: {
        id: string;
        type: string;
        description: string;
        timestamp: string;
        user?: string;
    }[];
    userGrowth: {
        date: string;
        newUsers: number;
        totalUsers: number;
    }[];
}

// Dashboard API Functions
export const dashboardApi = {
    // Student Dashboard
    getStudentDashboard: async (): Promise<StudentDashboardData> => {
        // For now, we'll fetch data from multiple endpoints since there's no single student dashboard endpoint
        const [bookmarks, projects, milestones, currentProject] = await Promise.all([
            api.get('/bookmarks?limit=5').catch(() => ({ bookmarks: [] })),
            api.get('/projects/popular?limit=5').catch(() => ({ projects: [] })),
            api.get('/milestones?limit=5&status=not_started').catch(() => ({ milestones: [] })),
            api.get('/student/current-project').catch(() => null)
        ]);

        // Mock current project data until backend endpoint is available
        const mockCurrentProject = {
            id: '1',
            title: 'AI-Powered Project Recommendation System',
            description: 'Developing an intelligent system to recommend Final Year Projects to students based on their skills and interests.',
            supervisor: {
                id: 'sup1',
                name: 'Dr. Sarah Johnson',
                lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            },
            progress: {
                percentage: 65,
                currentPhase: 'Literature Review',
                nextMilestone: {
                    title: 'Complete Literature Review',
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                    daysRemaining: 5,
                },
            },
            status: 'active' as const,
        };

        return {
            currentProject: currentProject || mockCurrentProject,
            recentActivity: [
                // Project-focused activity
                {
                    id: '1',
                    type: 'milestone' as const,
                    title: 'Completed Project Proposal',
                    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    projectRelated: true,
                },
                {
                    id: '2',
                    type: 'ai_chat' as const,
                    title: 'Asked AI about machine learning algorithms',
                    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    projectRelated: true,
                },
                {
                    id: '3',
                    type: 'supervisor_message' as const,
                    title: 'Received feedback on literature review',
                    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    projectRelated: true,
                },
                {
                    id: '4',
                    type: 'bookmark' as const,
                    title: 'Bookmarked research paper',
                    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                    projectRelated: true,
                }
            ],
            trendingProjects: projects.projects?.slice(0, 5).map((project: any) => ({
                id: project.id,
                title: project.title,
                specialization: project.specialization,
                difficultyLevel: project.difficultyLevel,
                isBookmarked: false // This would be checked against user's bookmarks
            })) || [],
            upcomingMilestones: milestones.milestones || [
                {
                    id: '1',
                    title: 'Literature Review Submission',
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'upcoming',
                    projectId: '1',
                },
                {
                    id: '2',
                    title: 'Methodology Chapter',
                    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'upcoming',
                    projectId: '1',
                }
            ],
            aiConversations: [
                {
                    id: '1',
                    title: 'Machine Learning Algorithm Selection',
                    lastMessage: 'Based on your project requirements, I recommend...',
                    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    projectRelated: true,
                },
                {
                    id: '2',
                    title: 'Literature Review Structure',
                    lastMessage: 'Here\'s how to structure your literature review...',
                    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    projectRelated: true,
                }
            ],
            recommendations: [] // This would come from recommendations endpoint
        };
    },

    // Supervisor Dashboard
    getSupervisorDashboard: async (): Promise<SupervisorDashboardData> => {
        try {
            // Since the supervisor dashboard endpoint doesn't exist yet, 
            // we'll fetch data from available endpoints and provide meaningful fallback
            const [projects, bookmarks] = await Promise.all([
                api.get('/projects?supervisor=current').catch(() => ({ projects: [] })),
                api.get('/bookmarks').catch(() => ({ bookmarks: [] }))
            ]);

            // Calculate statistics from available data
            const totalProjects = projects.projects?.length || 0;
            const activeApplications = 0; // Would come from applications endpoint when available
            const completedProjects = projects.projects?.filter((p: any) => p.status === 'completed').length || 0;

            return {
                projectStatistics: {
                    totalProjects,
                    activeApplications,
                    completedProjects,
                },
                recentApplications: [
                    // Mock data until applications endpoint is available
                    {
                        id: '1',
                        studentName: 'John Doe',
                        projectTitle: 'React Dashboard',
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                        status: 'pending' as const,
                    },
                    {
                        id: '2',
                        studentName: 'Jane Smith',
                        projectTitle: 'ML Project',
                        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                        status: 'pending' as const,
                    }
                ],
                studentProgress: [], // Would come from student progress endpoint when available
            };
        } catch (error) {
            console.error('Failed to fetch supervisor dashboard:', error);
            // Return fallback data
            return {
                projectStatistics: {
                    totalProjects: 12,
                    activeApplications: 5,
                    completedProjects: 7,
                },
                recentApplications: [
                    {
                        id: '1',
                        studentName: 'Alice Johnson',
                        projectTitle: 'AI-Powered Recommendation System',
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                        status: 'pending' as const,
                    },
                    {
                        id: '2',
                        studentName: 'Bob Smith',
                        projectTitle: 'Blockchain Voting System',
                        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                        status: 'pending' as const,
                    },
                    {
                        id: '3',
                        studentName: 'Carol Davis',
                        projectTitle: 'IoT Smart Home System',
                        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                        status: 'approved' as const,
                    }
                ],
                studentProgress: [
                    {
                        studentId: 'student-1',
                        studentName: 'David Wilson',
                        projectTitle: 'Machine Learning for Healthcare',
                        progressPercentage: 75,
                        lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                    {
                        studentId: 'student-2',
                        studentName: 'Emma Brown',
                        projectTitle: 'Web Application Security',
                        progressPercentage: 45,
                        lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    }
                ],
            };
        }
    },

    // Admin Dashboard
    getAdminDashboard: async (): Promise<AdminDashboardData> => {
        try {
            // Try to get real admin dashboard data, but provide fallback
            const response = await api.get('/admin/analytics/dashboard').catch(async () => {
                // If admin dashboard doesn't exist, try to get data from other endpoints
                const [projects, users] = await Promise.all([
                    api.get('/projects').catch(() => ({ projects: [] })),
                    api.get('/admin/users').catch(() => ({ users: [] }))
                ]);

                return {
                    totalUsers: users.users?.length || 0,
                    activeProjects: projects.projects?.length || 0,
                    pendingApprovals: projects.projects?.filter((p: any) => p.approvalStatus === 'pending').length || 0,
                    systemHealth: 'healthy',
                    recentActivity: [
                        {
                            id: '1',
                            type: 'system',
                            description: 'System health check completed',
                            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                        },
                        {
                            id: '2',
                            type: 'user',
                            description: 'New user registration',
                            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                            user: 'System',
                        }
                    ],
                    userGrowth: []
                };
            });

            return {
                platformStatistics: {
                    totalUsers: response.totalUsers || 156,
                    activeProjects: response.activeProjects || 42,
                    pendingApprovals: response.pendingApprovals || 8,
                    systemHealth: response.systemHealth || 'healthy',
                },
                recentActivity: response.recentActivity || [
                    {
                        id: '1',
                        type: 'user_registration',
                        description: 'New student registered: John Doe',
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                        user: 'System',
                    },
                    {
                        id: '2',
                        type: 'project_submission',
                        description: 'New project submitted for approval',
                        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                        user: 'Dr. Smith',
                    },
                    {
                        id: '3',
                        type: 'milestone_completion',
                        description: 'Student completed Literature Review milestone',
                        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                        user: 'Jane Wilson',
                    }
                ],
                userGrowth: response.userGrowth || [
                    { date: '2024-01-01', newUsers: 12, totalUsers: 120 },
                    { date: '2024-01-02', newUsers: 8, totalUsers: 128 },
                    { date: '2024-01-03', newUsers: 15, totalUsers: 143 },
                    { date: '2024-01-04', newUsers: 10, totalUsers: 153 },
                    { date: '2024-01-05', newUsers: 3, totalUsers: 156 },
                ],
            };
        } catch (error) {
            console.error('Failed to fetch admin dashboard:', error);
            // Return fallback data
            return {
                platformStatistics: {
                    totalUsers: 156,
                    activeProjects: 42,
                    pendingApprovals: 8,
                    systemHealth: 'healthy',
                },
                recentActivity: [
                    {
                        id: '1',
                        type: 'system',
                        description: 'System health check completed',
                        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                    },
                    {
                        id: '2',
                        type: 'user',
                        description: 'New user registration',
                        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                        user: 'System',
                    }
                ],
                userGrowth: [
                    { date: '2024-01-01', newUsers: 12, totalUsers: 120 },
                    { date: '2024-01-02', newUsers: 8, totalUsers: 128 },
                    { date: '2024-01-03', newUsers: 15, totalUsers: 143 },
                    { date: '2024-01-04', newUsers: 10, totalUsers: 153 },
                    { date: '2024-01-05', newUsers: 3, totalUsers: 156 },
                ],
            };
        }
    },

    // Real-time Admin Dashboard
    getAdminRealtimeDashboard: async () => {
        try {
            return await api.get('/admin/dashboard/realtime');
        } catch (error) {
            console.error('Failed to fetch real-time admin dashboard:', error);
            return null;
        }
    },

    // AI Assistant Metrics
    getAIMetrics: async () => {
        try {
            return await api.get('/ai-assistant/dashboard/metrics');
        } catch (error) {
            console.error('Failed to fetch AI metrics:', error);
            return null;
        }
    },
};