import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
    Project,
    ProjectSearchParams,
    ProjectSearchResponse,
    ProjectFilters,
    CreateProjectData,
    UpdateProjectData,
    CurrentProject,
    ProjectAssignment,
    ProjectStatusUpdate,
    ProjectCommunication,
    ProjectProgressVisualization,
    ProjectDeadlineNotification
} from '@/types/project';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';

interface ProjectState {
    // Search & Discovery State
    searchParams: ProjectSearchParams;
    activeFilters: ProjectFilters;

    // Current Project State
    currentProject: Project | null;
    relatedProjects: Project[];

    // Popular/Featured Projects
    popularProjects: Project[];

    // Supervisor Projects (for supervisor role)
    supervisorProjects: Project[];

    // Current Project Management
    studentCurrentProject: CurrentProject | null;
    supervisorCurrentProjects: CurrentProject[];
    projectAssignments: ProjectAssignment[];

    // Status Updates and Communication
    statusUpdates: ProjectStatusUpdate[];
    communications: ProjectCommunication[];
    unreadCommunications: number;

    // Progress and Visualization
    progressVisualization: ProjectProgressVisualization | null;
    deadlineNotifications: ProjectDeadlineNotification[];

    // UI State
    isSearching: boolean;
    isLoadingCurrentProject: boolean;
    isUpdatingStatus: boolean;
    isSendingMessage: boolean;
    searchError: string | null;
    currentProjectError: string | null;

    // Actions - Basic Project Management
    setSearchParams: (params: Partial<ProjectSearchParams>) => void;
    clearSearchParams: () => void;
    setActiveFilters: (filters: Partial<ProjectFilters>) => void;
    clearFilters: () => void;
    setCurrentProject: (project: Project | null) => void;
    setRelatedProjects: (projects: Project[]) => void;
    setPopularProjects: (projects: Project[]) => void;
    setSupervisorProjects: (projects: Project[]) => void;
    setSearching: (isSearching: boolean) => void;
    setSearchError: (error: string | null) => void;
    clearError: () => void;

    // Actions - Current Project Management
    getStudentCurrentProject: () => Promise<void>;
    getSupervisorCurrentProjects: () => Promise<void>;
    assignProjectToStudent: (projectId: string, studentId: string, terms?: string) => Promise<void>;
    acceptProjectAssignment: (assignmentId: string, message?: string) => Promise<void>;
    declineProjectAssignment: (assignmentId: string, message?: string) => Promise<void>;

    // Actions - Status Updates
    updateProjectStatus: (projectId: string, status: string, description: string, attachments?: File[]) => Promise<void>;
    getStatusUpdates: (projectId: string) => Promise<void>;
    approveStatusUpdate: (updateId: string, notes?: string) => Promise<void>;
    rejectStatusUpdate: (updateId: string, notes: string) => Promise<void>;

    // Actions - Communication
    sendMessage: (projectId: string, toUserId: string, subject: string, content: string, type?: string) => Promise<void>;
    getCommunications: (projectId: string) => Promise<void>;
    markMessageAsRead: (messageId: string) => Promise<void>;
    sendMeetingRequest: (projectId: string, toUserId: string, meetingDetails: any) => Promise<void>;

    // Actions - Progress Visualization
    getProgressVisualization: (projectId: string) => Promise<void>;
    updateWeeklyProgress: (projectId: string, week: string, hoursWorked: number, notes?: string) => Promise<void>;

    // Actions - Notifications
    getDeadlineNotifications: () => Promise<void>;
    dismissNotification: (notificationId: string) => Promise<void>;
    markNotificationAsRead: (notificationId: string) => Promise<void>;

    // Utility Actions
    clearCurrentProjectError: () => void;
    refreshCurrentProjectData: () => Promise<void>;
}

const initialSearchParams: ProjectSearchParams = {
    query: '',
    page: 1,
    limit: 12,
    sortBy: 'relevance',
    sortOrder: 'desc',
};

const initialFilters: ProjectFilters = {
    specializations: [],
    difficultyLevels: [],
    years: [],
    tags: [],
    technologyStack: [],
    supervisorIds: [],
};

export const useProjectStore = create<ProjectState>()(
    devtools(
        (set, get) => ({
            // Initial State
            searchParams: initialSearchParams,
            activeFilters: initialFilters,
            currentProject: null,
            relatedProjects: [],
            popularProjects: [],
            supervisorProjects: [],

            // Current Project Management State
            studentCurrentProject: null,
            supervisorCurrentProjects: [],
            projectAssignments: [],
            statusUpdates: [],
            communications: [],
            unreadCommunications: 0,
            progressVisualization: null,
            deadlineNotifications: [],

            // UI State
            isSearching: false,
            isLoadingCurrentProject: false,
            isUpdatingStatus: false,
            isSendingMessage: false,
            searchError: null,
            currentProjectError: null,

            // Basic Actions
            setSearchParams: (params) => {
                set((state) => ({
                    searchParams: { ...state.searchParams, ...params },
                }), false, 'setSearchParams');
            },

            clearSearchParams: () => {
                set({ searchParams: initialSearchParams }, false, 'clearSearchParams');
            },

            setActiveFilters: (filters) => {
                set((state) => ({
                    activeFilters: { ...state.activeFilters, ...filters },
                }), false, 'setActiveFilters');
            },

            clearFilters: () => {
                set({ activeFilters: initialFilters }, false, 'clearFilters');
            },

            setCurrentProject: (project) => {
                set({ currentProject: project }, false, 'setCurrentProject');
            },

            setRelatedProjects: (projects) => {
                set({ relatedProjects: projects }, false, 'setRelatedProjects');
            },

            setPopularProjects: (projects) => {
                set({ popularProjects: projects }, false, 'setPopularProjects');
            },

            setSupervisorProjects: (projects) => {
                set({ supervisorProjects: projects }, false, 'setSupervisorProjects');
            },

            setSearching: (isSearching) => {
                set({ isSearching }, false, 'setSearching');
            },

            setSearchError: (error) => {
                set({ searchError: error }, false, 'setSearchError');
            },

            clearError: () => {
                set({ searchError: null }, false, 'clearError');
            },

            // Current Project Management Actions
            getStudentCurrentProject: async () => {
                try {
                    set({ isLoadingCurrentProject: true, currentProjectError: null });

                    try {
                        const currentProject = await api.get<CurrentProject>('/projects/current/student');
                        set({
                            studentCurrentProject: currentProject,
                            isLoadingCurrentProject: false
                        });
                    } catch (apiError) {
                        console.warn('API not available, using mock current project:', apiError);

                        // Mock current project data
                        const mockCurrentProject: CurrentProject = {
                            id: 'proj-current-1',
                            title: 'AI-Powered Learning Management System',
                            abstract: 'Development of an intelligent learning management system with personalized content recommendations.',
                            specialization: 'Software Engineering',
                            difficultyLevel: 'intermediate',
                            year: 2024,
                            tags: ['AI', 'Machine Learning', 'Web Development', 'Education'],
                            technologyStack: ['React', 'Node.js', 'Python', 'TensorFlow', 'MongoDB'],
                            isGroupProject: false,
                            approvalStatus: 'approved',
                            githubUrl: 'https://github.com/student/ai-lms',
                            supervisor: {
                                id: 'sup-1',
                                name: 'Dr. Sarah Johnson',
                                specializations: ['AI', 'Software Engineering']
                            },
                            viewCount: 45,
                            bookmarkCount: 12,
                            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
                            updatedAt: new Date().toISOString(),

                            // Current Project specific fields
                            assignedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                            startDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
                            expectedEndDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
                            projectStatus: 'in_progress',
                            overallProgress: 35,

                            student: {
                                id: 'student-1',
                                name: 'John Smith',
                                email: 'john.smith@university.edu',
                                studentId: 'CS2024001'
                            },

                            totalMilestones: 8,
                            completedMilestones: 3,
                            overdueMilestones: 1,
                            upcomingDeadlines: [
                                {
                                    milestoneId: 'milestone-4',
                                    title: 'System Architecture Design',
                                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                                    priority: 'high'
                                },
                                {
                                    milestoneId: 'milestone-5',
                                    title: 'Database Schema Implementation',
                                    dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
                                    priority: 'medium'
                                }
                            ],

                            lastCommunication: {
                                type: 'milestone_update',
                                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                                from: 'student',
                                summary: 'Submitted literature review milestone for approval'
                            },

                            weeklyProgress: [
                                {
                                    week: '2024-W10',
                                    hoursWorked: 15,
                                    milestonesCompleted: 1,
                                    progressPercentage: 25,
                                    notes: 'Completed initial research and project setup'
                                },
                                {
                                    week: '2024-W11',
                                    hoursWorked: 18,
                                    milestonesCompleted: 1,
                                    progressPercentage: 30,
                                    notes: 'Finished literature review and started system design'
                                },
                                {
                                    week: '2024-W12',
                                    hoursWorked: 12,
                                    milestonesCompleted: 1,
                                    progressPercentage: 35,
                                    notes: 'Completed requirements analysis'
                                }
                            ],

                            hasUnreadUpdates: true,
                            pendingApprovals: 1
                        };

                        set({
                            studentCurrentProject: mockCurrentProject,
                            isLoadingCurrentProject: false
                        });
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to load current project';
                    set({
                        currentProjectError: errorMessage,
                        isLoadingCurrentProject: false
                    });
                    throw error;
                }
            },

            getSupervisorCurrentProjects: async () => {
                try {
                    set({ isLoadingCurrentProject: true, currentProjectError: null });

                    try {
                        const projects = await api.get<CurrentProject[]>('/projects/current/supervisor');
                        set({
                            supervisorCurrentProjects: projects,
                            isLoadingCurrentProject: false
                        });
                    } catch (apiError) {
                        console.warn('API not available, using mock supervisor projects:', apiError);

                        // Mock supervisor current projects
                        const mockProjects: CurrentProject[] = [
                            {
                                id: 'proj-sup-1',
                                title: 'Blockchain-based Supply Chain Management',
                                abstract: 'Implementation of a blockchain solution for transparent supply chain tracking.',
                                specialization: 'Software Engineering',
                                difficultyLevel: 'advanced',
                                year: 2024,
                                tags: ['Blockchain', 'Supply Chain', 'Web3'],
                                technologyStack: ['Solidity', 'React', 'Node.js', 'Ethereum'],
                                isGroupProject: true,
                                approvalStatus: 'approved',
                                supervisor: {
                                    id: 'sup-1',
                                    name: 'Dr. Sarah Johnson',
                                    specializations: ['Blockchain', 'Software Engineering']
                                },
                                viewCount: 32,
                                bookmarkCount: 8,
                                createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
                                updatedAt: new Date().toISOString(),

                                assignedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
                                startDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
                                expectedEndDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString(),
                                projectStatus: 'in_progress',
                                overallProgress: 45,

                                student: {
                                    id: 'student-2',
                                    name: 'Alice Johnson',
                                    email: 'alice.johnson@university.edu',
                                    studentId: 'CS2024002'
                                },

                                totalMilestones: 10,
                                completedMilestones: 4,
                                overdueMilestones: 0,
                                upcomingDeadlines: [
                                    {
                                        milestoneId: 'milestone-sup-1',
                                        title: 'Smart Contract Development',
                                        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                                        priority: 'high'
                                    }
                                ],

                                lastCommunication: {
                                    type: 'message',
                                    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                                    from: 'student',
                                    summary: 'Question about smart contract testing framework'
                                },

                                weeklyProgress: [
                                    {
                                        week: '2024-W10',
                                        hoursWorked: 20,
                                        milestonesCompleted: 2,
                                        progressPercentage: 35,
                                    },
                                    {
                                        week: '2024-W11',
                                        hoursWorked: 22,
                                        milestonesCompleted: 1,
                                        progressPercentage: 40,
                                    },
                                    {
                                        week: '2024-W12',
                                        hoursWorked: 18,
                                        milestonesCompleted: 1,
                                        progressPercentage: 45,
                                    }
                                ],

                                hasUnreadUpdates: false,
                                pendingApprovals: 0
                            }
                        ];

                        set({
                            supervisorCurrentProjects: mockProjects,
                            isLoadingCurrentProject: false
                        });
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to load supervisor projects';
                    set({
                        currentProjectError: errorMessage,
                        isLoadingCurrentProject: false
                    });
                    throw error;
                }
            },

            assignProjectToStudent: async (projectId: string, studentId: string, terms?: string) => {
                try {
                    set({ isUpdatingStatus: true, currentProjectError: null });

                    const assignmentData = {
                        projectId,
                        studentId,
                        terms,
                        expectedStartDate: new Date().toISOString(),
                        expectedEndDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString()
                    };

                    try {
                        const assignment = await api.post<ProjectAssignment>('/projects/assignments', assignmentData);

                        set(state => ({
                            projectAssignments: [assignment, ...state.projectAssignments],
                            isUpdatingStatus: false
                        }));
                    } catch (apiError) {
                        console.warn('API not available, creating mock assignment:', apiError);

                        const mockAssignment: ProjectAssignment = {
                            id: `assignment-${Date.now()}`,
                            projectId,
                            studentId,
                            supervisorId: 'sup-1',
                            assignedAt: new Date().toISOString(),
                            status: 'pending',
                            expectedStartDate: new Date().toISOString(),
                            expectedEndDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
                            terms,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };

                        set(state => ({
                            projectAssignments: [mockAssignment, ...state.projectAssignments],
                            isUpdatingStatus: false
                        }));
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to assign project';
                    set({
                        currentProjectError: errorMessage,
                        isUpdatingStatus: false
                    });
                    throw error;
                }
            },

            acceptProjectAssignment: async (assignmentId: string, message?: string) => {
                try {
                    set({ isUpdatingStatus: true, currentProjectError: null });

                    const responseData = {
                        status: 'accepted',
                        message
                    };

                    try {
                        await api.patch(`/projects/assignments/${assignmentId}/respond`, responseData);
                    } catch (apiError) {
                        console.warn('API not available, updating assignment locally:', apiError);
                    }

                    set(state => ({
                        projectAssignments: state.projectAssignments.map(assignment =>
                            assignment.id === assignmentId
                                ? {
                                    ...assignment,
                                    status: 'accepted',
                                    studentResponse: {
                                        status: 'accepted',
                                        message,
                                        respondedAt: new Date().toISOString()
                                    },
                                    updatedAt: new Date().toISOString()
                                }
                                : assignment
                        ),
                        isUpdatingStatus: false
                    }));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to accept assignment';
                    set({
                        currentProjectError: errorMessage,
                        isUpdatingStatus: false
                    });
                    throw error;
                }
            },

            declineProjectAssignment: async (assignmentId: string, message?: string) => {
                try {
                    set({ isUpdatingStatus: true, currentProjectError: null });

                    const responseData = {
                        status: 'declined',
                        message
                    };

                    try {
                        await api.patch(`/projects/assignments/${assignmentId}/respond`, responseData);
                    } catch (apiError) {
                        console.warn('API not available, updating assignment locally:', apiError);
                    }

                    set(state => ({
                        projectAssignments: state.projectAssignments.map(assignment =>
                            assignment.id === assignmentId
                                ? {
                                    ...assignment,
                                    status: 'declined',
                                    studentResponse: {
                                        status: 'declined',
                                        message,
                                        respondedAt: new Date().toISOString()
                                    },
                                    updatedAt: new Date().toISOString()
                                }
                                : assignment
                        ),
                        isUpdatingStatus: false
                    }));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to decline assignment';
                    set({
                        currentProjectError: errorMessage,
                        isUpdatingStatus: false
                    });
                    throw error;
                }
            },

            updateProjectStatus: async (projectId: string, status: string, description: string, attachments?: File[]) => {
                try {
                    set({ isUpdatingStatus: true, currentProjectError: null });

                    const updateData = {
                        newStatus: status,
                        description,
                        requiresApproval: true,
                        isVisibleToStudent: true,
                        isVisibleToSupervisor: true
                    };

                    try {
                        const statusUpdate = await api.post<ProjectStatusUpdate>(`/projects/${projectId}/status`, updateData);

                        set(state => ({
                            statusUpdates: [statusUpdate, ...state.statusUpdates],
                            isUpdatingStatus: false
                        }));
                    } catch (apiError) {
                        console.warn('API not available, creating mock status update:', apiError);

                        const mockUpdate: ProjectStatusUpdate = {
                            id: `update-${Date.now()}`,
                            projectId,
                            studentId: 'student-1',
                            previousStatus: 'in_progress',
                            newStatus: status,
                            description,
                            requiresApproval: true,
                            approvalStatus: 'pending',
                            isVisibleToStudent: true,
                            isVisibleToSupervisor: true,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };

                        set(state => ({
                            statusUpdates: [mockUpdate, ...state.statusUpdates],
                            isUpdatingStatus: false
                        }));
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to update project status';
                    set({
                        currentProjectError: errorMessage,
                        isUpdatingStatus: false
                    });
                    throw error;
                }
            },

            getStatusUpdates: async (projectId: string) => {
                try {
                    try {
                        const updates = await api.get<ProjectStatusUpdate[]>(`/projects/${projectId}/status`);
                        set({ statusUpdates: updates });
                    } catch (apiError) {
                        console.warn('API not available, using mock status updates:', apiError);

                        const mockUpdates: ProjectStatusUpdate[] = [
                            {
                                id: 'update-1',
                                projectId,
                                studentId: 'student-1',
                                previousStatus: 'assigned',
                                newStatus: 'in_progress',
                                description: 'Started working on the project. Completed initial setup and research.',
                                requiresApproval: false,
                                isVisibleToStudent: true,
                                isVisibleToSupervisor: true,
                                createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
                                updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
                            }
                        ];

                        set({ statusUpdates: mockUpdates });
                    }
                } catch (error) {
                    console.error('Failed to load status updates:', error);
                }
            },

            approveStatusUpdate: async (updateId: string, notes?: string) => {
                try {
                    set({ isUpdatingStatus: true });

                    try {
                        await api.patch(`/projects/status/${updateId}/approve`, { notes });
                    } catch (apiError) {
                        console.warn('API not available, approving update locally:', apiError);
                    }

                    set(state => ({
                        statusUpdates: state.statusUpdates.map(update =>
                            update.id === updateId
                                ? {
                                    ...update,
                                    approvalStatus: 'approved',
                                    approvedBy: 'sup-1',
                                    approvedAt: new Date().toISOString(),
                                    approvalNotes: notes,
                                    updatedAt: new Date().toISOString()
                                }
                                : update
                        ),
                        isUpdatingStatus: false
                    }));
                } catch (error) {
                    set({ isUpdatingStatus: false });
                    throw error;
                }
            },

            rejectStatusUpdate: async (updateId: string, notes: string) => {
                try {
                    set({ isUpdatingStatus: true });

                    try {
                        await api.patch(`/projects/status/${updateId}/reject`, { notes });
                    } catch (apiError) {
                        console.warn('API not available, rejecting update locally:', apiError);
                    }

                    set(state => ({
                        statusUpdates: state.statusUpdates.map(update =>
                            update.id === updateId
                                ? {
                                    ...update,
                                    approvalStatus: 'rejected',
                                    approvedBy: 'sup-1',
                                    approvedAt: new Date().toISOString(),
                                    approvalNotes: notes,
                                    updatedAt: new Date().toISOString()
                                }
                                : update
                        ),
                        isUpdatingStatus: false
                    }));
                } catch (error) {
                    set({ isUpdatingStatus: false });
                    throw error;
                }
            },

            sendMessage: async (projectId: string, toUserId: string, subject: string, content: string, type = 'message') => {
                try {
                    set({ isSendingMessage: true, currentProjectError: null });

                    const messageData = {
                        projectId,
                        toUserId,
                        subject,
                        content,
                        type,
                        isUrgent: false,
                        requiresResponse: type === 'meeting_request'
                    };

                    try {
                        const message = await api.post<ProjectCommunication>('/projects/communications', messageData);

                        set(state => ({
                            communications: [message, ...state.communications],
                            isSendingMessage: false
                        }));
                    } catch (apiError) {
                        console.warn('API not available, creating mock message:', apiError);

                        const mockMessage: ProjectCommunication = {
                            id: `msg-${Date.now()}`,
                            projectId,
                            fromUserId: 'student-1',
                            fromUserType: 'student',
                            toUserId,
                            toUserType: 'supervisor',
                            type: type as any,
                            subject,
                            content,
                            isRead: false,
                            isUrgent: false,
                            requiresResponse: type === 'meeting_request',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };

                        set(state => ({
                            communications: [mockMessage, ...state.communications],
                            isSendingMessage: false
                        }));
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
                    set({
                        currentProjectError: errorMessage,
                        isSendingMessage: false
                    });
                    throw error;
                }
            },

            getCommunications: async (projectId: string) => {
                try {
                    try {
                        const communications = await api.get<ProjectCommunication[]>(`/projects/${projectId}/communications`);
                        const unreadCount = communications.filter(c => !c.isRead).length;

                        set({
                            communications,
                            unreadCommunications: unreadCount
                        });
                    } catch (apiError) {
                        console.warn('API not available, using mock communications:', apiError);

                        const mockCommunications: ProjectCommunication[] = [
                            {
                                id: 'comm-1',
                                projectId,
                                fromUserId: 'sup-1',
                                fromUserType: 'supervisor',
                                toUserId: 'student-1',
                                toUserType: 'student',
                                type: 'message',
                                subject: 'Project Progress Check',
                                content: 'Hi John, I wanted to check on your progress with the literature review. How are things going?',
                                isRead: true,
                                readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                                isUrgent: false,
                                requiresResponse: true,
                                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                                updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
                            }
                        ];

                        set({
                            communications: mockCommunications,
                            unreadCommunications: 0
                        });
                    }
                } catch (error) {
                    console.error('Failed to load communications:', error);
                }
            },

            markMessageAsRead: async (messageId: string) => {
                try {
                    try {
                        await api.patch(`/projects/communications/${messageId}/read`);
                    } catch (apiError) {
                        console.warn('API not available, marking message as read locally:', apiError);
                    }

                    set(state => ({
                        communications: state.communications.map(comm =>
                            comm.id === messageId
                                ? {
                                    ...comm,
                                    isRead: true,
                                    readAt: new Date().toISOString()
                                }
                                : comm
                        ),
                        unreadCommunications: Math.max(0, state.unreadCommunications - 1)
                    }));
                } catch (error) {
                    console.error('Failed to mark message as read:', error);
                }
            },

            sendMeetingRequest: async (projectId: string, toUserId: string, meetingDetails: any) => {
                try {
                    const messageData = {
                        projectId,
                        toUserId,
                        subject: 'Meeting Request',
                        content: `Meeting request: ${meetingDetails.agenda || 'Project discussion'}`,
                        type: 'meeting_request',
                        meetingDetails
                    };

                    await get().sendMessage(projectId, toUserId, messageData.subject, messageData.content, messageData.type);
                } catch (error) {
                    throw error;
                }
            },

            getProgressVisualization: async (projectId: string) => {
                try {
                    try {
                        const visualization = await api.get<ProjectProgressVisualization>(`/projects/${projectId}/progress`);
                        set({ progressVisualization: visualization });
                    } catch (apiError) {
                        console.warn('API not available, using mock progress visualization:', apiError);

                        const mockVisualization: ProjectProgressVisualization = {
                            projectId,
                            timeline: [
                                {
                                    date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
                                    event: 'Project Started',
                                    type: 'status_change',
                                    description: 'Project officially started',
                                    progress: 0
                                },
                                {
                                    date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
                                    event: 'Literature Review Completed',
                                    type: 'milestone',
                                    description: 'Completed comprehensive literature review',
                                    progress: 15
                                },
                                {
                                    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                                    event: 'Requirements Analysis Done',
                                    type: 'milestone',
                                    description: 'Finished requirements gathering and analysis',
                                    progress: 30
                                }
                            ],
                            overallProgress: 35,
                            milestoneProgress: {
                                completed: 3,
                                total: 8,
                                percentage: 37.5
                            },
                            timeMetrics: {
                                totalHoursWorked: 45,
                                estimatedHours: 200,
                                efficiency: 0.9,
                                weeklyHours: [
                                    { week: '2024-W10', hours: 15 },
                                    { week: '2024-W11', hours: 18 },
                                    { week: '2024-W12', hours: 12 }
                                ]
                            },
                            performanceIndicators: {
                                onTrack: true,
                                riskLevel: 'low',
                                predictedCompletionDate: new Date(Date.now() + 115 * 24 * 60 * 60 * 1000).toISOString(),
                                delayDays: 0,
                                qualityScore: 85
                            },
                            milestoneBreakdown: [
                                {
                                    milestoneId: 'milestone-1',
                                    title: 'Literature Review',
                                    status: 'completed',
                                    progress: 100,
                                    dueDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
                                    completedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
                                },
                                {
                                    milestoneId: 'milestone-2',
                                    title: 'Requirements Analysis',
                                    status: 'completed',
                                    progress: 100,
                                    dueDate: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
                                    completedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
                                },
                                {
                                    milestoneId: 'milestone-3',
                                    title: 'System Design',
                                    status: 'in_progress',
                                    progress: 60,
                                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
                                }
                            ],
                            lastUpdated: new Date().toISOString()
                        };

                        set({ progressVisualization: mockVisualization });
                    }
                } catch (error) {
                    console.error('Failed to load progress visualization:', error);
                }
            },

            updateWeeklyProgress: async (projectId: string, week: string, hoursWorked: number, notes?: string) => {
                try {
                    const progressData = {
                        week,
                        hoursWorked,
                        notes
                    };

                    try {
                        await api.post(`/projects/${projectId}/progress/weekly`, progressData);
                    } catch (apiError) {
                        console.warn('API not available, updating progress locally:', apiError);
                    }

                    // Update local state
                    set(state => {
                        if (state.studentCurrentProject?.id === projectId) {
                            const updatedWeeklyProgress = [...state.studentCurrentProject.weeklyProgress];
                            const existingIndex = updatedWeeklyProgress.findIndex(p => p.week === week);

                            if (existingIndex >= 0) {
                                updatedWeeklyProgress[existingIndex] = {
                                    ...updatedWeeklyProgress[existingIndex],
                                    hoursWorked,
                                    notes
                                };
                            } else {
                                updatedWeeklyProgress.push({
                                    week,
                                    hoursWorked,
                                    milestonesCompleted: 0,
                                    progressPercentage: state.studentCurrentProject.overallProgress,
                                    notes
                                });
                            }

                            return {
                                studentCurrentProject: {
                                    ...state.studentCurrentProject,
                                    weeklyProgress: updatedWeeklyProgress
                                }
                            };
                        }
                        return state;
                    });
                } catch (error) {
                    console.error('Failed to update weekly progress:', error);
                    throw error;
                }
            },

            getDeadlineNotifications: async () => {
                try {
                    try {
                        const notifications = await api.get<ProjectDeadlineNotification[]>('/projects/notifications/deadlines');
                        set({ deadlineNotifications: notifications });
                    } catch (apiError) {
                        console.warn('API not available, using mock notifications:', apiError);

                        const mockNotifications: ProjectDeadlineNotification[] = [
                            {
                                id: 'notif-1',
                                projectId: 'proj-current-1',
                                milestoneId: 'milestone-4',
                                type: 'upcoming_deadline',
                                title: 'Milestone Due Soon',
                                message: 'System Architecture Design milestone is due in 5 days',
                                urgency: 'medium',
                                recipientIds: ['student-1'],
                                recipientTypes: ['student'],
                                scheduledFor: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                                channels: ['email', 'in_app'],
                                deliveryStatus: {
                                    email: 'pending',
                                    inApp: 'sent'
                                },
                                actionRequired: true,
                                actionType: 'submit_milestone',
                                isRead: false,
                                isDismissed: false,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            }
                        ];

                        set({ deadlineNotifications: mockNotifications });
                    }
                } catch (error) {
                    console.error('Failed to load deadline notifications:', error);
                }
            },

            dismissNotification: async (notificationId: string) => {
                try {
                    try {
                        await api.patch(`/projects/notifications/${notificationId}/dismiss`);
                    } catch (apiError) {
                        console.warn('API not available, dismissing notification locally:', apiError);
                    }

                    set(state => ({
                        deadlineNotifications: state.deadlineNotifications.map(notif =>
                            notif.id === notificationId
                                ? {
                                    ...notif,
                                    isDismissed: true,
                                    dismissedAt: new Date().toISOString()
                                }
                                : notif
                        )
                    }));
                } catch (error) {
                    console.error('Failed to dismiss notification:', error);
                }
            },

            markNotificationAsRead: async (notificationId: string) => {
                try {
                    try {
                        await api.patch(`/projects/notifications/${notificationId}/read`);
                    } catch (apiError) {
                        console.warn('API not available, marking notification as read locally:', apiError);
                    }

                    set(state => ({
                        deadlineNotifications: state.deadlineNotifications.map(notif =>
                            notif.id === notificationId
                                ? {
                                    ...notif,
                                    isRead: true,
                                    readAt: new Date().toISOString()
                                }
                                : notif
                        )
                    }));
                } catch (error) {
                    console.error('Failed to mark notification as read:', error);
                }
            },

            clearCurrentProjectError: () => {
                set({ currentProjectError: null });
            },

            refreshCurrentProjectData: async () => {
                try {
                    const { getStudentCurrentProject, getSupervisorCurrentProjects } = get();

                    // Refresh based on user role - this would be determined by auth context
                    await Promise.all([
                        getStudentCurrentProject(),
                        getSupervisorCurrentProjects()
                    ]);
                } catch (error) {
                    console.error('Failed to refresh current project data:', error);
                }
            }
        }),
        {
            name: 'project-store',
        }
    )
);

// Selectors for computed values
export const useSearchParamsWithFilters = () => {
    const { searchParams, activeFilters } = useProjectStore();

    return {
        ...searchParams,
        specialization: activeFilters.specializations.length > 0 ? activeFilters.specializations[0] : undefined,
        difficultyLevel: activeFilters.difficultyLevels.length > 0 ? activeFilters.difficultyLevels[0] : undefined,
        year: activeFilters.years.length > 0 ? activeFilters.years[0] : undefined,
        tags: activeFilters.tags.length > 0 ? activeFilters.tags : undefined,
        technologyStack: activeFilters.technologyStack.length > 0 ? activeFilters.technologyStack : undefined,
        supervisorId: activeFilters.supervisorIds.length > 0 ? activeFilters.supervisorIds[0] : undefined,
    };
};

export const useHasActiveFilters = () => {
    const { activeFilters } = useProjectStore();

    return (
        activeFilters.specializations.length > 0 ||
        activeFilters.difficultyLevels.length > 0 ||
        activeFilters.years.length > 0 ||
        activeFilters.tags.length > 0 ||
        activeFilters.technologyStack.length > 0 ||
        activeFilters.supervisorIds.length > 0 ||
        activeFilters.isGroupProject !== undefined
    );
};